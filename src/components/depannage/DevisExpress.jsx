import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Plus, Trash2, AlertTriangle, UserPlus } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import Champ from '../ui/Champ';
import QuickClientModal from '../QuickClientModal';
import { captureException } from '../../lib/sentry';
import { formatClientName, formatMoney } from '../../lib/formatters';
import { calculerTotaux } from '../../lib/totauxDocument';
import { estFranchiseTva, tauxTvaParDefaut } from '../../lib/franchiseTva';
import { jourLocal } from '../../lib/dates';
import { estClientParticulier, DEMANDE_URGENCE } from '../../lib/retractation';
import { AVERTISSEMENT_URGENCE, QUESTION_PIECES, grilleIncomplete, lignesDevisExpress, normaliserGrille, pasDuDecompte } from '../../lib/depannage';

/**
 * Dépannage express (lot 3, src/lib/depannage.js) : un devis de dépannage en un écran, tiré de la grille tarifaire.
 * Crée un devis brouillon, puis la fiche du devis s'ouvre : « Faire signer » sur place, puis « Facturer ».
 * L'urgence ne change jamais le prix ; seules les majorations de la grille sont proposées.
 *
 * @param {object} p
 * @param {(devisData: object) => Promise<object|false>} p.onCreer enregistre le devis (numéro, base) ; false si refusé
 */
const CASE = 'mt-0.5 w-5 h-5 rounded flex-shrink-0';
const nombreOuVide = (v) => String(v ?? '').replace(',', '.');

export default function DevisExpress({ isOpen, onClose, onCreer, clients = [], addClient, entreprise, clientInitial = null, isDark, couleur }) {
  const grille = normaliserGrille(entreprise?.depannageGrille);
  const franchise = estFranchiseTva(entreprise);
  const [clientId, setClientId] = useState(clientInitial || '');
  const [nature, setNature] = useState('');
  const [lieu, setLieu] = useState('');
  const [urgence, setUrgence] = useState(false); // jamais pré-cochée (juriste-btp, 3 nov. 2026)
  const [avecDeplacement, setAvecDeplacement] = useState(true);
  const [heures, setHeures] = useState('1');
  const [majoration, setMajoration] = useState('');
  const [forfaits, setForfaits] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [conserver, setConserver] = useState(null);
  const [tva, setTva] = useState(() => tauxTvaParDefaut(entreprise) || 10);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [nouveauClient, setNouveauClient] = useState(false);

  const client = clients.find((c) => c.id === clientId) || null;
  const tries = useMemo(() => [...clients].sort((a, b) => formatClientName(a, '').localeCompare(formatClientName(b, ''), 'fr')), [clients]);
  const resultat = useMemo(() => lignesDevisExpress({
    grille, avecDeplacement, heures: nombreOuVide(heures), majoration, forfaits,
    pieces: pieces.map((p) => ({ ...p, quantite: nombreOuVide(p.quantite), prix: nombreOuVide(p.prix) })),
    conserverPieces: conserver, tva, franchise,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [JSON.stringify(grille), avecDeplacement, heures, majoration, forfaits, pieces, conserver, tva, franchise]);
  const totaux = calculerTotaux(resultat.lignes, { tauxDefaut: tva, franchise });
  const manque = grilleIncomplete(grille);
  const pas = pasDuDecompte(grille);

  if (!isOpen || typeof document === 'undefined') return null;

  const creer = async () => {
    if (!clientId) { setErreur('Choisissez le client, ou créez-le.'); return; }
    if (!nature.trim()) { setErreur('Décrivez l’intervention.'); return; }
    if (resultat.erreur) { setErreur(resultat.erreur); return; }
    setErreur('');
    setEnCours(true);
    try {
      const devisData = {
        type: 'devis',
        client_id: clientId,
        date: jourLocal(),
        validite: Number(entreprise?.validiteDevis) > 0 ? Number(entreprise.validiteDevis) : 30,
        statut: 'brouillon',
        objet: `Dépannage : ${nature.trim()}`.slice(0, 200),
        tvaRate: franchise ? 0 : tva,
        lignes: resultat.lignes,
        sections: resultat.sections,
        remise: 0,
        notes: lieu.trim() ? `Lieu d’intervention : ${lieu.trim()}` : '',
        travaux_urgents: urgence,
        total_ht: totaux.totalHT,
        tva: totaux.totalTVA,
        total_ttc: totaux.totalTTC,
        tvaParTaux: totaux.tvaParTaux,
      };
      const cree = await onCreer?.(devisData);
      if (!cree) { setErreur('Le devis n’a pas été enregistré. Réessayez.'); return; }
      onClose?.();
    } catch (e) {
      captureException(e, { context: 'devis express' });
      setErreur('Le devis n’a pas été enregistré. Vérifiez votre connexion et réessayez.');
    } finally {
      setEnCours(false);
    }
  };

  const majPiece = (i, cle) => (e) => setPieces((p) => p.map((x, j) => (j === i ? { ...x, [cle]: e.target.value } : x)));
  const particulier = estClientParticulier(client);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Dépannage express" className="fixed inset-0 z-[1000] flex flex-col bg-fond" data-testid="devis-express">
      <header className="flex items-center gap-2 px-2 sm:px-5 h-14 border-b border-bord bg-surface flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button type="button" onClick={onClose} aria-label="Fermer" className="w-11 h-11 flex items-center justify-center rounded-xl text-encre-2 hover:bg-surface-2">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="flex-1 min-w-0 text-base font-bold truncate text-encre">Dépannage express</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
          {manque ? (
            <p role="alert" className="flex gap-2 text-sm text-alerte-texte">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              {manque} Paramètres › Dépannage.
            </p>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-end gap-2">
              <Champ className="flex-1 min-w-0" as="select" libelle="Client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Choisir…</option>
                {tries.map((c) => <option key={c.id} value={c.id}>{formatClientName(c, 'Sans nom')}</option>)}
              </Champ>
              <Bouton variante="secondaire" icone={UserPlus} className="h-12" onClick={() => setNouveauClient(true)}>Nouveau</Bouton>
            </div>
            <Champ libelle="Intervention" type="text" value={nature} onChange={(e) => setNature(e.target.value)} placeholder="Porte claquée, fuite sous l’évier…" />
            <Champ libelle="Lieu d’intervention" facultatif type="text" value={lieu} onChange={(e) => setLieu(e.target.value)}
              aide={client?.adresse ? `Sinon : l’adresse du client (${client.adresse}).` : undefined} />
          </section>

          <section className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer" data-ui="UrgenceExpress">
              <input type="checkbox" checked={urgence} onChange={(e) => setUrgence(e.target.checked)} className={CASE} />
              <span>
                <span className="block text-sm font-medium text-encre">Urgence demandée par le client</span>
                <span className="block text-sm text-encre-2">Le client signera : « {DEMANDE_URGENCE} » Le prix ne change pas.</span>
              </span>
            </label>
            {urgence ? (
              <p role="note" className="flex gap-2 text-sm text-alerte-texte bg-alerte-fond rounded-xl p-3">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                {AVERTISSEMENT_URGENCE}
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-encre">Intervention</h2>
            {grille.deplacement !== null ? (
              <label className="flex items-center gap-3 cursor-pointer min-h-11">
                <input type="checkbox" checked={avecDeplacement} onChange={(e) => setAvecDeplacement(e.target.checked)} className={CASE} />
                <span className="text-sm text-encre">Frais de déplacement ({formatMoney(grille.deplacement)} HT)</span>
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Champ libelle="Main-d’œuvre (heures)" type="text" inputMode="decimal" value={heures} onChange={(e) => setHeures(e.target.value)}
                aide={`Arrondi au ${pas === 0.25 ? 'quart d’heure' : pas === 0.5 ? 'demi-heure' : 'heure'} entamé.`} />
              {!franchise ? (
                <Champ as="select" libelle="TVA" value={String(tva)} onChange={(e) => setTva(Number(e.target.value))}
                  aide={tva === 10 ? 'Logement de plus de deux ans.' : undefined}>
                  {[10, 20, 5.5].map((t) => <option key={t} value={String(t)}>{String(t).replace('.', ',')} %</option>)}
                </Champ>
              ) : null}
            </div>
            {grille.majorationNuit !== null || grille.majorationDimanche !== null ? (
              <Champ as="select" libelle="Majoration de votre grille" value={majoration} onChange={(e) => setMajoration(e.target.value)}>
                <option value="">Aucune</option>
                {grille.majorationNuit !== null ? <option value="nuit">Nuit (+ {String(grille.majorationNuit).replace('.', ',')} %)</option> : null}
                {grille.majorationDimanche !== null ? <option value="dimanche">Dimanche ou jour férié (+ {String(grille.majorationDimanche).replace('.', ',')} %)</option> : null}
              </Champ>
            ) : null}
            {grille.forfaits.map((f, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer min-h-11">
                <input type="checkbox" checked={forfaits.includes(i)} className={CASE}
                  onChange={(e) => setForfaits((p) => (e.target.checked ? [...p, i] : p.filter((x) => x !== i)))} />
                <span className="text-sm text-encre">{f.libelle} ({formatMoney(f.prix)} HT)</span>
              </label>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-encre">Pièces remplacées</h2>
            {pieces.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_4.5rem_6rem_2.75rem] gap-2 items-end">
                <Champ className="min-w-0" libelle="Pièce" type="text" value={p.libelle} onChange={majPiece(i, 'libelle')} />
                <Champ libelle="Qté" type="text" inputMode="decimal" value={p.quantite} onChange={majPiece(i, 'quantite')} />
                <Champ libelle="€ HT" type="text" inputMode="decimal" value={p.prix} onChange={majPiece(i, 'prix')} />
                <button type="button" aria-label={`Retirer ${p.libelle || 'la pièce'}`} onClick={() => setPieces((x) => x.filter((_, j) => j !== i))}
                  className="h-12 w-11 flex items-center justify-center rounded-xl text-encre-2 hover:bg-surface-2">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            ))}
            <Bouton variante="discret" icone={Plus} onClick={() => setPieces((p) => [...p, { libelle: '', quantite: '1', prix: '' }])}>Ajouter une pièce</Bouton>
            {pieces.length > 0 && particulier ? (
              <fieldset>
                <legend className="text-sm font-medium text-encre mb-1">{QUESTION_PIECES}</legend>
                <div className="flex gap-4">
                  {[[true, 'Oui'], [false, 'Non'], [null, 'Le client répondra sur le devis']].map(([v, l]) => (
                    <label key={l} className="flex items-center gap-2 cursor-pointer min-h-11 text-sm text-encre">
                      <input type="radio" name="conserver-pieces" checked={conserver === v} onChange={() => setConserver(v)} className="w-5 h-5" />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </section>
        </div>
      </div>

      <footer className="border-t border-bord bg-surface px-4 py-3 flex-shrink-0" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto">
          {erreur ? <p role="alert" className="mb-2 text-sm font-medium text-danger-texte">{erreur}</p> : null}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-encre-2">{franchise ? 'Total' : 'Total TTC'}</p>
              <p className="text-2xl font-bold text-encre tabular-nums" data-testid="total-express">{formatMoney(totaux.totalTTC)}</p>
            </div>
            <Bouton variante="principal" taille="grande" onClick={creer} chargement={enCours} disabled={!!manque}>Créer le devis</Bouton>
          </div>
        </div>
      </footer>

      {nouveauClient ? (
        <QuickClientModal
          isOpen={nouveauClient}
          onClose={() => setNouveauClient(false)}
          onSubmit={async (data) => {
            setNouveauClient(false);
            try {
              const c = await addClient?.(data);
              if (c?.id) setClientId(c.id);
              else setErreur('Client créé mais non choisi : choisissez-le dans la liste.');
            } catch (e) {
              captureException(e, { context: 'devis express, nouveau client' });
              setErreur('Client non enregistré. Réessayez.');
            }
          }}
          isDark={isDark} couleur={couleur}
        />
      ) : null}
    </div>,
    document.body,
  );
}
