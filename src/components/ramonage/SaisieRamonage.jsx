import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SignatureCanvas from 'react-signature-canvas';
import { X, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Champ from '../ui/Champ';
import {
  TYPES_APPAREIL, COMBUSTIBLES, CONDUITS, METHODES, QUALITES, RACCORDEMENTS, VACUITES, CONSTATS, CONSEILS,
  AIDE_FREQUENCE, AIDE_CHIMIQUE, manquants, nouveauBrouillon, prochainParDefaut, horsDelaiDouzeMois, nbDansAnnee,
  conseilsExiges, ramonagePrecedent, jourDe,
} from '../../lib/ramonage';
import { buildAttestationRamonageHtml } from '../../lib/attestationRamonageHtml';

/** Choix exclusif en boutons (44 px) ; `deselection` : toucher le choix actif le retire (constats facultatifs). */
function Choix({ libelle, options, valeur, onChange, deselection = false, erreur, id }) {
  return (
    <fieldset id={id} className="min-w-0">
      <legend className="block mb-1.5 text-sm font-medium text-encre-2">{libelle}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const oui = o.valeur === valeur;
          return (
            <button
              key={o.valeur}
              type="button"
              aria-pressed={oui}
              onClick={() => onChange(oui && deselection ? '' : o.valeur)}
              className={`min-h-[44px] px-3.5 rounded-xl border text-sm font-medium text-left transition-colors ${
                oui ? 'bg-accent text-sur-accent border-accent' : 'bg-surface text-encre border-bord-fort hover:bg-surface-2'
              }`}
            >
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
 * Signature tracée au doigt, en autant de traits qu'il faut ; la dernière est reprise d'office, « Refaire » en un geste.
 * Le tracé reste ouvert pendant la saisie (chaque trait met à jour l'image) : une signature en plusieurs traits n'est
 * pas coupée au premier.
 */
function Signature({ valeur, onChange }) {
  const pad = useRef(null);
  const boite = useRef(null);
  const [trace, setTrace] = useState(!valeur);
  const [largeur, setLargeur] = useState(320);
  useLayoutEffect(() => {
    if (trace && boite.current) setLargeur(Math.max(240, Math.min(560, boite.current.clientWidth)));
  }, [trace]);
  if (!trace && valeur) {
    return (
      <div className="flex items-center justify-between gap-3">
        <img src={valeur} alt="Votre signature" className="h-16 max-w-[220px] bg-white rounded-lg border border-bord p-1" />
        <Bouton variante="secondaire" taille="compacte" onClick={() => { onChange(null); setTrace(true); }}>Refaire</Bouton>
      </div>
    );
  }
  return (
    <div ref={boite}>
      <div className="rounded-xl border border-bord-fort bg-white overflow-hidden">
        <SignatureCanvas
          ref={pad}
          penColor="#0f172a"
          canvasProps={{ width: largeur, height: 150, 'aria-label': 'Zone de signature', className: 'block touch-none' }}
          onEnd={() => { if (pad.current && !pad.current.isEmpty()) onChange(pad.current.toDataURL('image/png')); }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-sm text-encre-3">Signez avec le doigt. Elle sera reprise pour vos prochaines attestations.</p>
        <Bouton variante="discret" taille="compacte" onClick={() => { pad.current?.clear(); onChange(null); }}>Effacer</Bouton>
      </div>
    </div>
  );
}

const heureDe = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Saisie d'une attestation de ramonage, en plein écran au téléphone, puis aperçu avant l'enregistrement (après lequel
 * la base la numérote et la fige).
 * @param {object} p
 * @param {object} p.client
 * @param {object} [p.precedent]  dernier passage de l'appareil (appareil, lieu, prix repris ; jamais les constats)
 * @param {object} [p.remplace]   attestation annulée à refaire : tout est repris, la nouvelle « annule et remplace »
 * @param {Array}  p.ramonages
 * @param {object} p.entreprise
 * @param {Function} p.onEnregistrer  (données) => Promise<ligne enregistrée | null>
 * @param {Function} p.onFermer
 */
export default function SaisieRamonage({ client, precedent = null, remplace = null, ramonages = [], entreprise, onEnregistrer, onFermer }) {
  const signatureConnue = useMemo(() => [...ramonages]
    .filter((r) => r.signature)
    .sort((a, b) => String(b.created_at || b.realise_le || '').localeCompare(String(a.created_at || a.realise_le || '')))[0]?.signature || null, [ramonages]);
  const [form, setForm] = useState(() => {
    if (remplace) {
      const { id, numero, annulee_le, annulation_motif, rappel_fait_le, rappel_canal, jeton_rappel, created_at, user_id, facture_id, ...reste } = remplace; // eslint-disable-line no-unused-vars
      return { ...reste, remplace_id: remplace.id };
    }
    const b = nouveauBrouillon({ client, precedent, entreprise });
    return { ...b, signature: signatureConnue, intervenant_nom: b.intervenant_nom || [...ramonages].find((r) => r.intervenant_nom)?.intervenant_nom || '' };
  });
  const [nbSaisi, setNbSaisi] = useState(null);
  const [prochainManuel, setProchainManuel] = useState(!!remplace);
  const [etape, setEtape] = useState('saisie');
  const [erreurs, setErreurs] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const corps = useRef(null);

  const maj = (champs) => setForm((f) => ({ ...f, ...champs }));
  const nbCalcule = nbDansAnnee(ramonages, form.appareil_ref, form.realise_le, remplace?.id);
  const nb = nbSaisi ?? (remplace ? remplace.nb_dans_annee : nbCalcule);
  const donnees = { ...form, nb_dans_annee: nb };
  const erreurDe = (champ) => erreurs.find((e) => e.champ === champ)?.message;

  useEffect(() => { corps.current?.scrollTo?.(0, 0); }, [etape]);
  // La liste « À compléter » suit la saisie une fois affichée
  useEffect(() => {
    if (erreurs.length) setErreurs(manquants({ ...form, nb_dans_annee: nb }));
  }, [form, nb]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const echap = (e) => { if (e.key === 'Escape') onFermer(); };
    document.addEventListener('keydown', echap);
    return () => document.removeEventListener('keydown', echap);
  }, [onFermer]);

  const changerDate = (jour, heure) => {
    const d = new Date(`${jour || jourDe(form.realise_le)}T${heure || heureDe(form.realise_le) || '09:00'}`);
    if (Number.isNaN(d.getTime())) return;
    const iso = d.toISOString();
    maj({ realise_le: iso, ...(prochainManuel ? {} : { prochain_avant: prochainParDefaut(iso) }) });
  };

  const verifier = () => {
    const m = manquants(donnees);
    setErreurs(m);
    if (m.length) {
      document.getElementById(`ramonage-${m[0].champ}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEtape('apercu');
  };

  const enregistrer = async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      await onEnregistrer(donnees);
    } finally {
      setEnCours(false);
    }
  };

  const apercu = useMemo(() => (etape === 'apercu'
    ? buildAttestationRamonageHtml({ ramonage: { ...donnees, numero: null }, entreprise, precedent: ramonagePrecedent(ramonages, donnees), remplace })
    : ''), [etape]); // eslint-disable-line react-hooks/exhaustive-deps

  const solide = conseilsExiges(form);
  const choixConseils = form.conseils?.choix || [];

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="saisie-ramonage-titre" className="fixed inset-0 z-[70] bg-fond flex flex-col">
      <header className="flex items-center gap-2 px-2 sm:px-4 h-14 border-b border-bord bg-surface flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {etape === 'apercu'
          ? <BoutonIcone icone={ArrowLeft} libelle="Revenir à la saisie" onClick={() => setEtape('saisie')} />
          : <BoutonIcone icone={X} libelle="Fermer sans enregistrer" onClick={onFermer} />}
        <h2 id="saisie-ramonage-titre" className="text-lg font-semibold text-encre truncate">
          {etape === 'apercu' ? 'Vérifier l’attestation' : remplace ? `Refaire l’attestation ${remplace.numero || ''}` : 'Nouveau ramonage'}
        </h2>
      </header>

      <div ref={corps} className="flex-1 overflow-y-auto">
        {etape === 'apercu' ? (
          <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-3">
            <p className="text-sm text-encre-2">Ce que recevra votre client. Une fois enregistrée, l’attestation reçoit son numéro et ne se modifie plus : une erreur se corrige en l’annulant, puis en la refaisant.</p>
            <iframe title="Aperçu de l’attestation" srcDoc={apercu} sandbox="" className="w-full h-[70vh] bg-white rounded-xl border border-bord" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-3 pb-6">
            <p className="text-sm text-encre-2">{client ? `Client : ${form.client_nom}` : ''}</p>

            <Section titre="Appareil et conduit">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Champ id="ramonage-appareil_type" as="select" libelle="Appareil" value={form.appareil_type} erreur={erreurDe('appareil_type')}
                  onChange={(e) => maj({ appareil_type: e.target.value })}>
                  <option value="">Choisir…</option>
                  {TYPES_APPAREIL.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
                </Champ>
                <Champ id="ramonage-combustible" as="select" libelle="Combustible" value={form.combustible} erreur={erreurDe('combustible')}
                  onChange={(e) => maj({ combustible: e.target.value })}>
                  <option value="">Choisir…</option>
                  {COMBUSTIBLES.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
                </Champ>
                <Champ id="ramonage-conduit" as="select" libelle="Conduit" value={form.conduit} erreur={erreurDe('conduit')}
                  onChange={(e) => maj({ conduit: e.target.value })}>
                  <option value="">Choisir…</option>
                  {CONDUITS.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
                </Champ>
              </div>
              <Champ id="ramonage-precisions" libelle="Précisions (marque, modèle, autre…)" facultatif={form.appareil_type !== 'autre'} value={form.precisions}
                erreur={erreurDe('precisions')} onChange={(e) => maj({ precisions: e.target.value })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Champ id="ramonage-localisation" libelle="Pièce, étage" facultatif value={form.localisation} placeholder="Salon, rez-de-chaussée"
                  onChange={(e) => maj({ localisation: e.target.value })} />
                <Champ id="ramonage-adresse_intervention" libelle="Adresse de l’intervention" value={form.adresse_intervention}
                  erreur={erreurDe('adresse_intervention')} onChange={(e) => maj({ adresse_intervention: e.target.value })} />
              </div>
            </Section>

            <Section titre="Intervention">
              <div className="grid grid-cols-2 gap-3">
                <Champ id="ramonage-realise_le" libelle="Date" type="date" value={jourDe(form.realise_le)} erreur={erreurDe('realise_le')}
                  onChange={(e) => changerDate(e.target.value, null)} />
                <Champ libelle="Heure" type="time" value={heureDe(form.realise_le)} onChange={(e) => changerDate(null, e.target.value)} />
              </div>
              <Choix id="ramonage-qualite_client" libelle="Qualité du client" options={QUALITES} valeur={form.qualite_client}
                erreur={erreurDe('qualite_client')} onChange={(v) => maj({ qualite_client: v })} />
              {form.qualite_client === 'autre' && (
                <Champ libelle="Précisez" value={form.qualite_precision} onChange={(e) => maj({ qualite_precision: e.target.value })} />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Champ id="ramonage-intervenant_nom" libelle="Intervenant (nom de la personne qui signe)" value={form.intervenant_nom}
                  erreur={erreurDe('intervenant_nom')} onChange={(e) => maj({ intervenant_nom: e.target.value })} />
                <Champ libelle="Ramonages de cet appareil dans l’année" type="text" inputMode="numeric" value={String(nb)}
                  aide={nbSaisi === null ? 'Compté d’après vos attestations ; modifiable.' : undefined}
                  onChange={(e) => { const n = parseInt(e.target.value, 10); setNbSaisi(Number.isFinite(n) ? Math.min(12, Math.max(1, n)) : 1); }} />
              </div>
            </Section>

            <Section titre="Ramonage">
              <Choix id="ramonage-methode" libelle="Méthode" options={METHODES} valeur={form.methode} erreur={erreurDe('methode')}
                onChange={(v) => maj({ methode: v })} />
              <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
                <input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" checked={!!form.complement_chimique}
                  onChange={(e) => maj({ complement_chimique: e.target.checked })} />
                <span>
                  <span className="block text-base text-encre">Produit chimique utilisé en complément</span>
                  <span className="block text-sm text-encre-3">{AIDE_CHIMIQUE}</span>
                </span>
              </label>
              <Choix libelle="Conduit ou tuyau de raccordement" options={RACCORDEMENTS} valeur={form.raccordement} onChange={(v) => maj({ raccordement: v || 'ramone' })} />
            </Section>

            <Section titre="Constatations">
              <Choix id="ramonage-vacuite" libelle="Vacuité du conduit sur toute sa longueur (votre constat)" options={VACUITES} valeur={form.vacuite}
                erreur={erreurDe('vacuite')} onChange={(v) => maj({ vacuite: v })} />
              {form.vacuite === 'non_assuree' && (
                <Champ id="ramonage-vacuite_precision" as="textarea" libelle="Pourquoi la vacuité n’a pas pu être assurée" value={form.vacuite_precision}
                  erreur={erreurDe('vacuite_precision')} onChange={(e) => maj({ vacuite_precision: e.target.value })} />
              )}
              <p className="text-sm text-encre-3">Les points suivants sont facultatifs : un point laissé vide n’est pas imprimé.</p>
              {CONSTATS.map((c) => (
                <Choix key={c.cle} libelle={c.libelle} options={c.options} valeur={form.constats?.[c.cle] || ''} deselection
                  onChange={(v) => setForm((f) => ({ ...f, constats: { ...(f.constats || {}), [c.cle]: v || undefined } }))} />
              ))}
            </Section>

            <Section titre="Observations et conseils">
              <Champ as="textarea" libelle="Observations et recommandations" facultatif value={form.observations}
                placeholder="Anomalie constatée, travaux à prévoir…" onChange={(e) => maj({ observations: e.target.value })} />
              {solide && (
                <fieldset id="ramonage-conseils">
                  <legend className="block mb-1.5 text-sm font-medium text-encre-2">Conseils donnés au client (article R. 1331-77 du code de la santé publique)</legend>
                  <div className="space-y-1">
                    {CONSEILS.map((o) => (
                      <label key={o.valeur} className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                        <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={choixConseils.includes(o.valeur)}
                          onChange={(e) => { const oui = e.target.checked; setForm((f) => { const choix = f.conseils?.choix || []; return { ...f, conseils: { ...f.conseils, choix: oui ? [...choix.filter((x) => x !== o.valeur), o.valeur] : choix.filter((x) => x !== o.valeur) } }; }); }} />
                        <span className="text-base text-encre">{o.libelle}</span>
                      </label>
                    ))}
                  </div>
                  <Champ as="textarea" libelle="Autres conseils" facultatif value={form.conseils?.texte || ''} className="mt-2"
                    onChange={(e) => { const texte = e.target.value; setForm((f) => ({ ...f, conseils: { ...f.conseils, texte } })); }} />
                  {erreurDe('conseils') ? <p className="mt-1.5 text-sm font-medium text-danger-texte">{erreurDe('conseils')}</p> : null}
                </fieldset>
              )}
            </Section>

            <Section titre="Prochain ramonage et prix">
              <Champ id="ramonage-prochain_avant" libelle="Prochain ramonage conseillé avant le" type="date" value={form.prochain_avant || ''}
                erreur={erreurDe('prochain_avant')} onChange={(e) => { setProchainManuel(true); maj({ prochain_avant: e.target.value }); }} />
              <div className="flex flex-wrap gap-2">
                {[6, 12].map((mois) => (
                  <Bouton key={mois} variante="secondaire" taille="compacte"
                    onClick={() => { setProchainManuel(true); maj({ prochain_avant: prochainParDefaut(form.realise_le, mois) }); }}>
                    Dans {mois} mois
                  </Bouton>
                ))}
              </div>
              {horsDelaiDouzeMois(form.realise_le, form.prochain_avant) && (
                <p className="flex gap-2 text-sm text-alerte-texte"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  Au-delà de douze mois, le ramonage sort du délai de l’article R. 1331-71 du code de la santé publique (sauf appareil inutilisé pendant au moins douze mois).</p>
              )}
              <p className="text-sm text-encre-3">{AIDE_FREQUENCE}</p>
              <Champ libelle="Prix (€ HT)" facultatif type="text" inputMode="decimal" value={form.prix_ht === null || form.prix_ht === undefined ? '' : String(form.prix_ht).replace('.', ',')}
                aide="Repris du dernier passage ou de vos tarifs ; il sert à la facture."
                onChange={(e) => { const v = e.target.value.replace(',', '.'); maj({ prix_ht: v === '' ? null : v }); }} />
            </Section>

            <Section titre="Signature">
              <Signature valeur={form.signature} onChange={(s) => maj({ signature: s })} />
            </Section>

            {erreurs.length > 0 && (
              <div role="alert" className="rounded-2xl bg-danger-fond text-danger-texte p-4 text-sm">
                <p className="font-semibold">À compléter avant de vérifier l’attestation :</p>
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
            <Bouton variante="principal" chargement={enCours} onClick={enregistrer}>Enregistrer l’attestation</Bouton>
          </>
        ) : (
          <>
            <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
            <Bouton variante="principal" onClick={verifier}>Vérifier l’attestation</Bouton>
          </>
        )}
      </footer>
    </div>,
    document.body,
  );
}
