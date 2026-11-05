import { useEffect, useRef, useState } from 'react';
import { Wrench, Printer, Plus, Trash2, AlertTriangle } from 'lucide-react';
import Carte from '../ui/Carte';
import Champ from '../ui/Champ';
import { Bouton } from '../ui/Bouton';
import { Interrupteur } from './RamonageTab';
import { captureException } from '../../lib/sentry';
import { estFranchiseTva } from '../../lib/franchiseTva';
import { formatMoney } from '../../lib/formatters';
import { DECOMPTES, OBLIGATIONS, TAUX_GRILLE, grilleImprimableHtml, normaliserGrille, ttcDe } from '../../lib/depannage';

/**
 * Paramètres → Dépannage (lot 3, src/lib/depannage.js). Activé : bouton « Dépannage express » sur la page Devis et
 * les fiches clients. La grille est saisie HT, comme les lignes des devis, et s'imprime TTC (arrêté du 24 janv.
 * 2017, art. 3). Rangée dans settings_json.reglages (entrepriseService, REGLAGES_SANS_COLONNE) : aucune migration.
 */
const enTexte = (v) => (v === null || v === undefined ? '' : String(v).replace('.', ','));
const versChamps = (g) => ({
  tauxHoraire: enTexte(g.tauxHoraire),
  decompte: g.decompte,
  deplacement: enTexte(g.deplacement),
  deplacementZone: g.deplacementZone,
  majorationNuit: enTexte(g.majorationNuit),
  horairesNuit: g.horairesNuit,
  majorationDimanche: enTexte(g.majorationDimanche),
  forfaits: g.forfaits.map((f) => ({ libelle: f.libelle, prix: enTexte(f.prix) })),
});
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export default function DepannageTab({ entreprise, setEntreprise }) {
  const actif = !!entreprise?.depannageActif;
  const franchise = estFranchiseTva(entreprise);
  const [champs, setChamps] = useState(() => versChamps(normaliserGrille(entreprise?.depannageGrille)));
  const [impression, setImpression] = useState('');
  const [erreurImpression, setErreurImpression] = useState('');
  const grilleEnregistree = JSON.stringify(normaliserGrille(entreprise?.depannageGrille));
  // Les champs ne se relisent que sur un changement venu d'ailleurs (autre appareil, synchronisation) : relire la
  // grille qu'on vient d'enregistrer effacerait un forfait à moitié saisi, que normaliserGrille retire
  const dernierEnvoi = useRef(grilleEnregistree);
  useEffect(() => {
    if (grilleEnregistree === dernierEnvoi.current) return;
    dernierEnvoi.current = grilleEnregistree;
    setChamps(versChamps(JSON.parse(grilleEnregistree)));
  }, [grilleEnregistree]);

  const enregistrer = (suivants = champs) => {
    const g = normaliserGrille(suivants);
    const texteGrille = JSON.stringify(g);
    if (texteGrille !== grilleEnregistree) {
      dernierEnvoi.current = texteGrille;
      setEntreprise((p) => ({ ...p, depannageGrille: g }));
    }
  };
  const changer = (cle) => (e) => setChamps((p) => ({ ...p, [cle]: e.target.value }));
  const changerForfait = (i, cle) => (e) => setChamps((p) => ({ ...p, forfaits: p.forfaits.map((f, j) => (j === i ? { ...f, [cle]: e.target.value } : f)) }));
  const g = normaliserGrille(champs);
  // En franchise de TVA (art. 293 B du CGI), aucun écran n'écrit « HT » ni « TTC » (D-31)
  const ht = franchise ? '' : ' HT';
  const ttc = (prix) => (prix === null ? '' : franchise ? formatMoney(prix) : TAUX_GRILLE.map((t) => `${formatMoney(ttcDe(prix, t))} TTC à ${t} %`).join(' · '));

  const imprimer = async () => {
    setErreurImpression('');
    setImpression('en_cours');
    try {
      const html = grilleImprimableHtml({ entreprise, grille: g, franchise });
      const [{ pdfDepuisHtml }, { remettreFichier }] = await Promise.all([import('../../lib/pdfDepuisHtml'), import('../../lib/natif')]);
      const octets = await pdfDepuisHtml(html);
      await remettreFichier(octets, 'grille-tarifaire.pdf', 'application/pdf', { titre: 'Grille tarifaire' });
      setImpression('');
    } catch (e) {
      captureException(e, { context: 'grille tarifaire dépannage' });
      setImpression('');
      setErreurImpression('La grille n’a pas pu être créée. Réessayez.');
    }
  };

  return (
    <div className="space-y-4" data-testid="reglages-depannage">
      <Carte>
        <div className="flex items-center gap-2 mb-3 text-encre-2">
          <Wrench size={18} aria-hidden="true" />
          <h3 className="text-lg font-semibold text-encre">Dépannage</h3>
        </div>
        <Interrupteur
          id="depannage-actif"
          actif={actif}
          onChange={(v) => setEntreprise((p) => ({ ...p, depannageActif: v }))}
          libelle="Je fais du dépannage, des réparations ou de l’entretien chez le client"
          description="Ajoute « Dépannage express » à la page Devis et aux fiches clients : un devis en un écran, tiré de votre grille tarifaire, à faire signer sur place puis à facturer."
        />
      </Carte>

      {actif && (
        <>
          <Carte>
            <h3 className="text-lg font-semibold text-encre mb-1">Votre grille tarifaire</h3>
            <p className="text-sm text-encre-2 mb-3">
              {franchise
                ? 'Vos prix, comme sur vos devis. La grille imprimée porte la mention « TVA non applicable, article 293 B du CGI ».'
                : 'Prix hors taxes, comme sur vos devis. La grille imprimée les donne toutes taxes comprises.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Champ libelle={`Taux horaire (€${ht})`} type="text" inputMode="decimal" value={champs.tauxHoraire}
                onChange={changer('tauxHoraire')} onBlur={() => enregistrer()} aide={ttc(g.tauxHoraire) || undefined} />
              <Champ as="select" libelle="Décompte du temps" value={champs.decompte}
                onChange={(e) => { const s = { ...champs, decompte: e.target.value }; setChamps(s); enregistrer(s); }}>
                {DECOMPTES.map((d) => <option key={d.valeur} value={d.valeur}>{d.libelle}</option>)}
              </Champ>
              <Champ libelle={`Frais de déplacement (€${ht})`} facultatif type="text" inputMode="decimal" value={champs.deplacement}
                onChange={changer('deplacement')} onBlur={() => enregistrer()} aide={ttc(g.deplacement) || undefined} />
              <Champ libelle="Zone couverte par ce prix" facultatif type="text" value={champs.deplacementZone} placeholder="Bordeaux et 20 km autour"
                onChange={changer('deplacementZone')} onBlur={() => enregistrer()} />
              <Champ libelle="Majoration de nuit (% du taux horaire)" facultatif type="text" inputMode="decimal" value={champs.majorationNuit}
                onChange={changer('majorationNuit')} onBlur={() => enregistrer()} />
              <Champ libelle="Horaires de nuit" facultatif type="text" value={champs.horairesNuit} placeholder="de 20 h à 8 h"
                onChange={changer('horairesNuit')} onBlur={() => enregistrer()} />
              <Champ libelle="Majoration dimanche et jours fériés (% du taux horaire)" facultatif type="text" inputMode="decimal" value={champs.majorationDimanche}
                onChange={changer('majorationDimanche')} onBlur={() => enregistrer()} />
            </div>
            <p className="text-sm text-encre-3 mt-3">Une urgence demandée par le client ne majore jamais le prix : la case « urgence » du devis sert à ses droits, pas au tarif.</p>
          </Carte>

          <Carte>
            <h3 className="text-lg font-semibold text-encre mb-1">Forfaits</h3>
            <p className="text-sm text-encre-2 mb-3">Interventions à prix fixe (ouverture de porte, recherche de fuite…), facultatif.</p>
            <div className="space-y-3">
              {champs.forfaits.map((f, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Champ className="flex-1 min-w-0" libelle="Intitulé" type="text" value={f.libelle} onChange={changerForfait(i, 'libelle')} onBlur={() => enregistrer()} />
                  <Champ className="w-28" libelle={`€${ht}`} type="text" inputMode="decimal" value={f.prix} onChange={changerForfait(i, 'prix')} onBlur={() => enregistrer()} />
                  <button type="button" aria-label={`Retirer le forfait ${f.libelle || i + 1}`}
                    onClick={() => { const s = { ...champs, forfaits: champs.forfaits.filter((_, j) => j !== i) }; setChamps(s); enregistrer(s); }}
                    className="h-12 w-11 flex items-center justify-center rounded-xl text-encre-2 hover:bg-surface-2">
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <Bouton variante="discret" icone={Plus} onClick={() => setChamps((p) => ({ ...p, forfaits: [...p.forfaits, { libelle: '', prix: '' }] }))}>Ajouter un forfait</Bouton>
            </div>
          </Carte>

          <Carte>
            <h3 className="text-lg font-semibold text-encre mb-1">Afficher vos tarifs</h3>
            {/* Résumé, pas citation : pas de guillemets (relecture du 4 nov. 2026) */}
            <p className="text-sm text-encre-2 mb-2">Ce que demande l’arrêté du 24 janvier 2017 :</p>
            <ul className="text-sm text-encre-2 mb-3 space-y-2 list-disc pl-5">
              {OBLIGATIONS.map((o) => (
                <li key={o.source}>{majuscule(o.texte)}. <span className="text-encre-3">{o.source}.</span></li>
              ))}
            </ul>
            {/* Rédaction juriste-btp du 5 nov. 2026, lue au texte (arrêté du 24 janv. 2017, art. 3 ; avis du lot 4, point 8), qui remplace celle du 4 nov. */}
            <p className="text-sm text-encre-2 mb-3">Affichez la grille dans vos locaux si vous y recevez des clients ; remettez-la ou envoyez-la au client avant qu’il signe le devis, quand le contrat est conclu chez lui ou à distance (arrêté du 24 janvier 2017, art. 3) ; et mettez-la sur votre site.</p>
            {g.tauxHoraire === null ? (
              <p role="alert" className="flex gap-2 text-sm text-alerte-texte mb-3">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                Indiquez votre taux horaire pour imprimer la grille.
              </p>
            ) : null}
            <Bouton variante="principal" icone={Printer} onClick={imprimer} chargement={impression === 'en_cours'} disabled={g.tauxHoraire === null}>
              Imprimer la grille
            </Bouton>
            {erreurImpression ? <p role="alert" className="mt-2 text-sm text-danger-texte">{erreurImpression}</p> : null}
          </Carte>
        </>
      )}
    </div>
  );
}
