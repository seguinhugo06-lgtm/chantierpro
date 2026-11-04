import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Champ from '../ui/Champ';
import { useConfirm } from '../../context/AppContext';
import { jourLocal } from '../../lib/dates';
import { jourDe } from '../../lib/ramonage';
import {
  NATURES, MESURES, titreCompteRendu, manquantsCompteRendu, nouveauCompteRendu, avecEmetteur,
} from '../../lib/electricite';
import { buildCompteRenduElectriciteHtml } from '../../lib/compteRenduElectriciteHtml';

function Choix({ libelle, options, valeur, onChange, deselection = false, erreur, id }) {
  return (
    <fieldset id={id} className="min-w-0">
      <legend className="block mb-1.5 text-sm font-medium text-encre-2">{libelle}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const oui = o.valeur === valeur;
          return (
            <button key={o.valeur} type="button" aria-pressed={oui} onClick={() => onChange(oui && deselection ? '' : o.valeur)}
              className={`min-h-[44px] px-3.5 rounded-xl border text-sm font-medium text-left ${oui ? 'bg-accent text-sur-accent border-accent' : 'bg-surface text-encre border-bord-fort hover:bg-surface-2'}`}>
              {o.libelle}
            </button>
          );
        })}
      </div>
      {erreur ? <p className="mt-1.5 text-sm font-medium text-danger-texte">{erreur}</p> : null}
    </fieldset>
  );
}

function Section({ titre, children }) {
  return (
    <section className="bg-surface border border-bord rounded-2xl p-4 space-y-4">
      <h3 className="text-base font-semibold text-encre">{titre}</h3>
      {children}
    </section>
  );
}

/**
 * Saisie d'un compte rendu d'intervention et d'autocontrôle, en plein écran au téléphone, puis aperçu avant
 * l'enregistrement (après lequel la base le numérote et le fige). `remplace` : compte rendu annulé à refaire.
 */
export default function SaisieCompteRendu({ chantier, client, entreprise, remplace = null, intervenantDefaut = '', voitPrix = false, onEnregistrer, onFermer }) {
  const [form, setForm] = useState(() => {
    if (remplace) {
      const { id, numero, annulee_le, annulation_motif, created_at, user_id, facture_id, emetteur, prix_ht, ...reste } = remplace; // eslint-disable-line no-unused-vars
      // Sans canViewPrices, l'ancien prix n'est ni montré ni recopié (relecture du 4 nov., point 3)
      return { ...reste, prix_ht: voitPrix ? prix_ht ?? null : null, remplace_id: remplace.id };
    }
    return nouveauCompteRendu({ chantier, client, entreprise, intervenant: intervenantDefaut });
  });
  const [etape, setEtape] = useState('saisie');
  const [erreurs, setErreurs] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const corps = useRef(null);
  const initial = useRef(JSON.stringify(form));
  const enConfirmation = useRef(false);
  const { confirm } = useConfirm();
  const maj = (champs) => setForm((f) => ({ ...f, ...champs }));
  const majMesure = (cle, v) => setForm((f) => ({ ...f, mesures: { ...(f.mesures || {}), [cle]: v } }));
  const erreurDe = (champ) => erreurs.find((e) => e.champ === champ)?.message;
  const donnees = avecEmetteur(form, entreprise);
  const apercu = useMemo(() => (etape === 'apercu' ? buildCompteRenduElectriciteHtml({ compteRendu: { ...donnees, numero: null }, entreprise }) : ''), [etape]); // eslint-disable-line react-hooks/exhaustive-deps

  const fermer = async () => {
    if (enConfirmation.current) return;
    if (JSON.stringify(form) !== initial.current) {
      enConfirmation.current = true;
      const ok = await confirm({ title: 'Abandonner ce compte rendu ?', message: 'Ce qui a été saisi sera perdu.', confirmText: 'Abandonner', cancelText: 'Continuer la saisie', variant: 'warning' });
      enConfirmation.current = false;
      if (!ok) return;
    }
    onFermer();
  };
  useEffect(() => { corps.current?.scrollTo?.(0, 0); }, [etape]);
  useEffect(() => { if (erreurs.length) setErreurs(manquantsCompteRendu(form)); }, [form]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const echap = (e) => { if (e.key !== 'Escape' || enConfirmation.current) return; e.stopPropagation(); fermer(); };
    window.addEventListener('keydown', echap, true);
    return () => window.removeEventListener('keydown', echap, true);
  });

  const verifier = () => {
    const m = manquantsCompteRendu(form);
    setErreurs(m);
    if (m.length) {
      document.getElementById(`cr-${m[0].champ}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEtape('apercu');
  };
  const enregistrer = async () => {
    if (enCours) return;
    setEnCours(true);
    try { await onEnregistrer(donnees); } finally { setEnCours(false); }
  };
  const changerJour = (jour) => {
    const d = new Date(`${jour}T12:00`);
    if (!Number.isNaN(d.getTime())) maj({ realise_le: d.toISOString() });
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="saisie-cr-titre" className="fixed inset-0 z-[70] bg-fond flex flex-col">
      <header className="flex items-center gap-2 px-2 sm:px-4 border-b border-bord bg-surface flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <BoutonIcone icone={X} libelle="Fermer" onClick={fermer} />
        <h2 id="saisie-cr-titre" className="text-lg font-semibold text-encre truncate flex-1">{etape === 'apercu' ? 'Vérifier le compte rendu' : 'Compte rendu d’intervention'}</h2>
      </header>

      <div ref={corps} className="flex-1 overflow-y-auto">
        {etape === 'apercu' ? (
          <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-3">
            <p className="text-sm text-encre-2">Une fois enregistré, le compte rendu reçoit son numéro et ne se modifie plus (il pourra être annulé, puis refait).</p>
            <iframe title={titreCompteRendu(form)} srcDoc={apercu} sandbox="" className="w-full h-[60vh] bg-white rounded-xl border border-bord" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-3">
            {remplace?.numero ? <p className="text-sm text-encre-2">Ce compte rendu annulera et remplacera le n° {remplace.numero}.</p> : null}
            <Section titre="Client et lieu">
              <Champ id="cr-client_nom" libelle="Client" value={form.client_nom} erreur={erreurDe('client_nom')} onChange={(e) => maj({ client_nom: e.target.value })} />
              <Champ id="cr-adresse_intervention" libelle="Adresse de l’intervention" value={form.adresse_intervention} erreur={erreurDe('adresse_intervention')} onChange={(e) => maj({ adresse_intervention: e.target.value })} />
            </Section>
            <Section titre="Intervention">
              <Champ id="cr-realise_le" libelle="Date" type="date" value={jourDe(form.realise_le)} max={jourLocal()} erreur={erreurDe('realise_le')} onChange={(e) => changerJour(e.target.value)} />
              <Choix id="cr-nature" libelle="Nature des travaux" options={NATURES} valeur={form.nature} erreur={erreurDe('nature')} onChange={(v) => maj({ nature: v })} />
              <Champ id="cr-travaux" as="textarea" rows={4} libelle="Travaux réalisés" placeholder="Ex : remplacement du tableau, pose de 2 circuits prises cuisine…" value={form.travaux} erreur={erreurDe('travaux')} onChange={(e) => maj({ travaux: e.target.value })} />
              <Champ id="cr-intervenant_nom" libelle="Intervenant" value={form.intervenant_nom} erreur={erreurDe('intervenant_nom')} onChange={(e) => maj({ intervenant_nom: e.target.value })} />
            </Section>
            <Section titre="Autocontrôle : mesures relevées">
              <p className="text-sm text-encre-3">Facultatif : un point laissé vide n’est pas imprimé.</p>
              {MESURES.map((m) => (m.options ? (
                <Choix key={m.cle} libelle={m.libelle} options={m.options} valeur={form.mesures?.[m.cle] || ''} deselection onChange={(v) => majMesure(m.cle, v)} />
              ) : (
                <Champ key={m.cle} libelle={m.libelle} facultatif type="text" inputMode="decimal" value={form.mesures?.[m.cle] || ''} onChange={(e) => majMesure(m.cle, e.target.value)} />
              )))}
            </Section>
            <Section titre="Réserves et observations">
              <Champ as="textarea" rows={3} libelle="Réserves et points à reprendre" facultatif value={form.reserves} onChange={(e) => maj({ reserves: e.target.value })} />
              <Champ as="textarea" rows={3} libelle="Observations" facultatif value={form.observations} onChange={(e) => maj({ observations: e.target.value })} />
            </Section>
            {voitPrix && <Section titre="Facture">
              <Champ id="cr-prix_ht" libelle="Prix (€ HT)" facultatif type="text" inputMode="decimal" aide="Sert à la facture tirée du compte rendu ; il n’est pas imprimé sur le compte rendu."
                erreur={erreurDe('prix_ht')} value={form.prix_ht === null || form.prix_ht === undefined ? '' : String(form.prix_ht).replace('.', ',')}
                onChange={(e) => { const v = e.target.value.replace(',', '.'); maj({ prix_ht: v === '' ? null : v }); }} />
            </Section>}
            {erreurs.length > 0 && (
              <div role="alert" className="rounded-2xl bg-danger-fond text-danger-texte p-4 text-sm">
                <p className="font-semibold">À compléter avant de vérifier le compte rendu :</p>
                <ul className="list-disc pl-5 mt-1">{erreurs.map((e) => <li key={e.champ}>{e.message}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="flex-shrink-0 border-t border-bord bg-surface px-3 sm:px-4 py-3 flex gap-2 justify-end" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        {etape === 'apercu' ? (
          <>
            <Bouton variante="secondaire" onClick={() => setEtape('saisie')}>Modifier</Bouton>
            <Bouton variante="principal" chargement={enCours} onClick={enregistrer}>Enregistrer</Bouton>
          </>
        ) : (
          <>
            <Bouton variante="discret" onClick={fermer}>Annuler</Bouton>
            <Bouton variante="principal" onClick={verifier}>Vérifier</Bouton>
          </>
        )}
      </footer>
    </div>,
    document.body,
  );
}
