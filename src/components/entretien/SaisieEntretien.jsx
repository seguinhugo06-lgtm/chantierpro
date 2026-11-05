import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Champ from '../ui/Champ';
import { Choix, Section, Signature } from '../ramonage/SaisieRamonage';
import {
  CATEGORIES, categorie, ENERGIES, TYPES_PAC, TYPES_POELE, EVACUATIONS, TECHNOLOGIES_CHAUDIERE, CLASSES, groupesPoints, niveauCO,
  PHRASES_CO, DEVOIR_CO, RUBRIQUES_CHAUDIERE, SUJETS_CONSEILS, referenceRendement, referenceEmissions, POLLUANTS, manquants,
  nouveauBrouillon, prochainParDefaut, echeanceLegale, apresEcheance, limiteRemise, criteres55, tauxPropose, obligationConnue, peutEtre55, estSolide, estGazFioul, jourDe,
  AIDE_PUISSANCE_CHAUDIERE, AIDE_SYSTEME_PAC, LIBELLE_PUISSANCE_CHAUDIERE,
} from '../../lib/entretien';
import { emetteurDe } from '../../lib/ramonage';
import { buildAttestationEntretienHtml } from '../../lib/attestationEntretienHtml';
import { useConfirm } from '../../context/AppContext';
import { usePermissions } from '../../hooks/usePermissions';
import { dateLue } from '../../lib/dates';
import { estFranchiseTva } from '../../lib/franchiseTva';

const jourFr = (jour) => (jour ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

function Case({ libelle, aide, checked, onChange, disabled, id }) {
  return (
    <label id={id} className="flex items-start gap-3 min-h-[44px] cursor-pointer">
      <input type="checkbox" className="mt-1 h-5 w-5 flex-shrink-0 accent-[rgb(var(--accent))]" checked={!!checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-base text-encre">{libelle}</span>
        {aide ? <span className="block text-sm text-encre-3">{aide}</span> : null}
      </span>
    </label>
  );
}

const Alerte = ({ children, ton = 'alerte' }) => (
  <p role="alert" className={`flex gap-2 rounded-xl p-3 text-sm ${ton === 'danger' ? 'bg-danger-fond text-danger-texte' : 'bg-alerte-fond text-alerte-texte'}`}>
    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
    <span>{children}</span>
  </p>
);

/**
 * Saisie d'une attestation d'entretien en plein écran au téléphone, puis aperçu avant l'enregistrement (après lequel la
 * base la numérote et la fige). Un seul moteur pour la chaudière, la PAC et le poêle : les champs suivent l'annexe de
 * l'arrêté de l'appareil (src/lib/entretien.js).
 */
export default function SaisieEntretien({ client, precedent = null, remplace = null, entretiens = [], dernierRamonage = '', entreprise, onEnregistrer, onFermer }) {
  const { canViewPrices } = usePermissions();
  const franchise = estFranchiseTva(entreprise);
  const normaliser = (n) => String(n || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const signaturePour = (nom) => (normaliser(nom) ? [...entretiens]
    .filter((r) => r.signature && normaliser(r.intervenant_nom) === normaliser(nom))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]?.signature || null : null);
  const [form, setForm] = useState(() => {
    if (remplace) {
      const { id, numero, annulee_le, annulation_motif, rappel_fait_le, rappel_canal, jeton_rappel, created_at, user_id, facture_id, emetteur, echeance_legale, organization_id, updated_at, ...reste } = remplace; // eslint-disable-line no-unused-vars
      return { ...reste, remplace_id: remplace.id };
    }
    const b = nouveauBrouillon({ client, categorieValeur: precedent?.categorie || '', precedent, entreprise, dernierRamonage });
    const intervenant = b.intervenant_nom || [...entretiens].find((r) => r.intervenant_nom)?.intervenant_nom || '';
    return { ...b, intervenant_nom: intervenant, signature: signaturePour(intervenant) };
  });
  const [signatureReprise, setSignatureReprise] = useState(!remplace);
  const [refusRappels, setRefusRappels] = useState(!!client?.rappels_refuses_le);
  const [prochainManuel, setProchainManuel] = useState(!!remplace);
  const [etape, setEtape] = useState('saisie');
  const [erreurs, setErreurs] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const corps = useRef(null);
  const { confirm } = useConfirm();
  const initial = useRef(null);
  const enConfirmation = useRef(false);

  const cat = categorie(form.categorie);
  const a0 = form.appareils?.[0] || {};
  const donnees = { ...form, emetteur: emetteurDe(entreprise) };
  const erreurDe = (champ) => erreurs.find((e) => e.champ === champ)?.message;
  const maj = (champs) => setForm((f) => ({ ...f, ...champs }));
  const majAppareil = (i, champs) => setForm((f) => ({ ...f, appareils: f.appareils.map((a, j) => (j === i ? { ...a, ...champs } : a)) }));
  const majSous = (cle, champs) => setForm((f) => ({ ...f, [cle]: { ...(f[cle] || {}), ...champs } }));

  const fermer = async () => {
    if (enConfirmation.current) return;
    if (initial.current !== null && JSON.stringify(form) !== initial.current) {
      enConfirmation.current = true;
      const ok = await confirm({ title: 'Abandonner cette attestation ?', message: 'Ce qui a été saisi, signature comprise, sera perdu.', confirmText: 'Abandonner', cancelText: 'Continuer la saisie', variant: 'warning' });
      enConfirmation.current = false;
      if (!ok) return;
    }
    onFermer();
  };

  useEffect(() => { if (initial.current === null) initial.current = JSON.stringify(form); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { corps.current?.scrollTo?.(0, 0); }, [etape]);
  useEffect(() => { if (erreurs.length) setErreurs(manquants(form)); }, [form]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const echap = (e) => {
      if (e.key !== 'Escape' || enConfirmation.current) return;
      e.stopPropagation();
      fermer();
    };
    window.addEventListener('keydown', echap, true);
    return () => window.removeEventListener('keydown', echap, true);
  });

  const choisirCategorie = (v) => {
    const b = nouveauBrouillon({ client, categorieValeur: v, entreprise, dernierRamonage });
    setForm((f) => ({ ...f, categorie: v, appareils: b.appareils, prix_ht: b.prix_ht, conseils: b.conseils }));
  };
  const changerDate = (jour) => {
    const d = new Date(`${jour}T${new Date(form.realise_le).toTimeString().slice(0, 5) || '09:00'}`);
    if (Number.isNaN(d.getTime())) return;
    const iso = d.toISOString();
    maj({ realise_le: iso, ...(prochainManuel ? {} : { prochain_avant: prochainParDefaut(iso) }) });
  };
  const changerIntervenant = (nom) => setForm((f) => ({ ...f, intervenant_nom: nom, ...(signatureReprise ? { signature: signaturePour(nom) } : {}) }));

  const verifier = () => {
    const m = manquants(donnees);
    setErreurs(m);
    if (m.length) {
      document.getElementById(`entretien-${m[0].champ}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEtape('apercu');
  };
  const enregistrer = async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      await onEnregistrer(donnees, { refusRappels: refusRappels && !client?.rappels_refuses_le });
    } finally {
      setEnCours(false);
    }
  };

  const apercu = useMemo(() => (etape === 'apercu'
    ? buildAttestationEntretienHtml({ entretien: { ...donnees, numero: null }, entreprise, remplace, rappelsRefuses: refusRappels })
    : ''), [etape]); // eslint-disable-line react-hooks/exhaustive-deps

  // L'échéance légale ne s'affiche que si l'obligation est certaine (puissance connue et dans le champ)
  const echeance = cat && obligationConnue(form) ? echeanceLegale(form.categorie, form.realise_le) : '';
  const co = niveauCO(form.co_ppm);
  const limite = cat ? limiteRemise(form.categorie, form.realise_le) : '';
  const enRetardRemise = limite && limite < jourDe(new Date().toISOString());
  const nombreSaisi = (v) => v.replace(/[^\d.,]/g, '');

  const blocAppareil = (a, i) => {
    const ch = (c) => `entretien-appareil${i}-${c}`;
    const groupes = groupesPoints(form.categorie, a);
    const coches = a.points || {};
    return (
      <Section key={i} titre={form.appareils.length > 1 ? `Appareil ${i + 1}` : 'Appareil'}>
        {form.categorie === 'pac' && (
          <Choix id={ch('type')} libelle="Type de système" options={TYPES_PAC} valeur={a.type} erreur={erreurDe(`appareil${i}-type`)} onChange={(v) => majAppareil(i, { type: v })} />
        )}
        {form.categorie === 'poele' && (
          <Choix id={ch('type')} libelle="Type d’appareil (foyer fermé)" options={TYPES_POELE} valeur={a.type} erreur={erreurDe(`appareil${i}-type`)} onChange={(v) => majAppareil(i, { type: v })} />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Champ id={ch('energie')} as="select" libelle="Énergie" value={a.energie} erreur={erreurDe(`appareil${i}-energie`)} onChange={(e) => majAppareil(i, { energie: e.target.value })}>
            <option value="">Choisir…</option>
            {(ENERGIES[form.categorie] || []).map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
          </Champ>
          {form.categorie !== 'pac' && (
            <Champ id={ch('evacuation')} as="select" libelle="Mode d’évacuation" facultatif={form.categorie === 'poele'} value={a.evacuation}
              erreur={erreurDe(`appareil${i}-evacuation`)} onChange={(e) => majAppareil(i, { evacuation: e.target.value })}>
              <option value="">Choisir…</option>
              {EVACUATIONS.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
            </Champ>
          )}
          <Champ id={ch('marque')} libelle="Marque" facultatif={form.categorie === 'poele'} value={a.marque} erreur={erreurDe(`appareil${i}-marque`)} onChange={(e) => majAppareil(i, { marque: e.target.value })} />
          <Champ id={ch('modele')} libelle="Modèle" facultatif={form.categorie === 'poele'} value={a.modele} erreur={erreurDe(`appareil${i}-modele`)} onChange={(e) => majAppareil(i, { modele: e.target.value })} />
          {form.categorie === 'chaudiere' && (
            <Champ as="select" libelle="Technologie" facultatif value={a.technologie} onChange={(e) => majAppareil(i, { technologie: e.target.value })}>
              <option value="">Choisir…</option>
              {TECHNOLOGIES_CHAUDIERE.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
            </Champ>
          )}
          <Champ libelle="Numéro de série" facultatif value={a.numero_serie} onChange={(e) => majAppareil(i, { numero_serie: e.target.value })} />
          <Champ libelle="Date de mise en service" facultatif type="date" value={a.mise_en_service || ''} onChange={(e) => majAppareil(i, { mise_en_service: e.target.value })} />
        </div>
        {form.categorie === 'chaudiere' && estGazFioul(a.energie) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Champ libelle="Brûleur à air soufflé : marque" facultatif value={a.bruleur?.marque || ''} onChange={(e) => majAppareil(i, { bruleur: { ...a.bruleur, marque: e.target.value } })} />
            <Champ libelle="Modèle du brûleur" facultatif value={a.bruleur?.modele || ''} onChange={(e) => majAppareil(i, { bruleur: { ...a.bruleur, modele: e.target.value } })} />
            <Champ libelle="Date du brûleur" facultatif type="date" value={a.bruleur?.date || ''} onChange={(e) => majAppareil(i, { bruleur: { ...a.bruleur, date: e.target.value } })} />
          </div>
        )}
        {form.categorie === 'pac' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Champ id={ch('fluide')} libelle="Fluide frigorigène (R32, R410A, R290…)" value={a.fluide} erreur={erreurDe(`appareil${i}-fluide`)} onChange={(e) => majAppareil(i, { fluide: e.target.value })} />
            <Champ libelle="Charge (kg)" facultatif inputMode="decimal" value={String(a.charge_kg ?? '')} onChange={(e) => majAppareil(i, { charge_kg: nombreSaisi(e.target.value) })} />
            <Champ as="textarea" className="sm:col-span-2" libelle="Autres machines du même bâtiment (marque, modèle, puissance)" facultatif value={a.autres_machines}
              aide={AIDE_SYSTEME_PAC}
              onChange={(e) => majAppareil(i, { autres_machines: e.target.value })} />
          </div>
        )}
        {form.categorie === 'poele' && (
          <Case libelle="Raccordé à un circuit hydraulique (bouilleur)" checked={a.hydraulique} onChange={(v) => majAppareil(i, { hydraulique: v })} />
        )}

        <fieldset id={ch('points')} className="space-y-3">
          <legend className="block mb-1 text-base font-semibold text-encre">Points contrôlés</legend>
          {groupes.map((g) => (
            <div key={g.cle} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-encre-2">{g.titre}</p>
                <Bouton variante="discret" taille="compacte"
                  onClick={() => majAppareil(i, { points: { ...coches, ...Object.fromEntries(g.points.map((p) => [`${g.cle}.${p.cle}`, true])) } })}>
                  Tout cocher
                </Bouton>
              </div>
              {g.points.map((p) => (
                <Case key={p.cle} libelle={p.libelle} checked={coches[`${g.cle}.${p.cle}`]}
                  onChange={(v) => majAppareil(i, { points: { ...coches, [`${g.cle}.${p.cle}`]: v || undefined } })} />
              ))}
            </div>
          ))}
          {erreurDe(`appareil${i}-points`) ? <p className="text-sm font-medium text-danger-texte">{erreurDe(`appareil${i}-points`)}</p> : null}
        </fieldset>
        {form.appareils.length > 1 && (
          <Bouton variante="discret" taille="compacte" icone={Trash2} onClick={() => setForm((f) => ({ ...f, appareils: f.appareils.filter((_, j) => j !== i) }))}>
            Retirer cet appareil
          </Bouton>
        )}
      </Section>
    );
  };

  const choixConseils = form.conseils?.choix || [];

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="saisie-entretien-titre" className="fixed inset-0 z-[70] bg-fond flex flex-col">
      <header className="flex items-center gap-2 px-2 sm:px-4 min-h-14 border-b border-bord bg-surface flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        {etape === 'apercu'
          ? <BoutonIcone icone={ArrowLeft} libelle="Revenir à la saisie" onClick={() => setEtape('saisie')} />
          : <BoutonIcone icone={X} libelle="Fermer sans enregistrer" onClick={fermer} />}
        <h2 id="saisie-entretien-titre" className="text-lg font-semibold text-encre truncate">
          {etape === 'apercu' ? 'Vérifier l’attestation' : remplace ? `Refaire l’attestation ${remplace.numero || ''}` : 'Nouvel entretien'}
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
            <p className="text-sm text-encre-2">{form.client_nom ? `Client : ${form.client_nom}` : ''}</p>

            {!precedent && !remplace && (
              <Section titre="Quel appareil ?">
                <Choix id="entretien-categorie" libelle="Type d’appareil" options={CATEGORIES} valeur={form.categorie} erreur={erreurDe('categorie')} onChange={choisirCategorie} />
                <p className="text-sm text-encre-3">Un foyer ouvert (cheminée ouverte) n’est pas soumis à l’entretien (article R. 1331-66 du code de la santé publique) : faites une attestation de ramonage.</p>
              </Section>
            )}

            {cat && (
              <>
                <Section titre="Commanditaire et installation">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Champ id="entretien-client_nom" libelle="Commanditaire (nom)" value={form.client_nom} erreur={erreurDe('client_nom')} onChange={(e) => maj({ client_nom: e.target.value })} />
                    <Champ id="entretien-client_adresse" libelle="Adresse du commanditaire" value={form.client_adresse} erreur={erreurDe('client_adresse')} onChange={(e) => maj({ client_adresse: e.target.value })} />
                    <Champ id="entretien-adresse_installation" libelle="Adresse de l’installation" value={form.adresse_installation} erreur={erreurDe('adresse_installation')} onChange={(e) => maj({ adresse_installation: e.target.value })} />
                    <Champ id="entretien-local" libelle="Local où se trouve l’appareil" placeholder="Cuisine, garage, chaufferie…" value={form.local} erreur={erreurDe('local')} onChange={(e) => maj({ local: e.target.value })} />
                  </div>
                </Section>

                {form.appareils.map(blocAppareil)}
                {form.categorie === 'poele' && (
                  <div className="flex justify-start">
                    <Bouton variante="secondaire" taille="compacte" icone={Plus}
                      onClick={() => setForm((f) => ({ ...f, appareils: [...f.appareils, { ...nouveauBrouillon({ client, categorieValeur: 'poele' }).appareils[0] }] }))}>
                      Ajouter un autre appareil entretenu
                    </Bouton>
                  </div>
                )}

                <Section titre={form.categorie === 'pac' ? 'Puissance du système' : 'Puissance'}>
                  <Champ libelle={form.categorie === 'pac' ? 'Puissance nominale du système, en kW (machines du bâtiment additionnées)' : form.categorie === 'chaudiere' ? LIBELLE_PUISSANCE_CHAUDIERE : 'Puissance nominale, en kW'} facultatif
                    inputMode="decimal" value={String(form.puissance_kw ?? '')} onChange={(e) => maj({ puissance_kw: nombreSaisi(e.target.value) })}
                    aide={form.categorie === 'chaudiere' ? AIDE_PUISSANCE_CHAUDIERE : 'Si elle est connue, le rappel peut citer l’obligation d’entretien et son article.'} />
                  {form.categorie === 'pac' && (
                    <Case libelle="Système couvert par un contrat de performance énergétique" checked={form.contrat_performance}
                      aide="Un tel système n’est pas soumis à cet entretien (article R. 224-43 du code de l’environnement)." onChange={(v) => maj({ contrat_performance: v })} />
                  )}
                </Section>

                <Section titre="Mesures">
                  <Champ id="entretien-appareils_mesure" libelle="Appareils de mesure utilisés (marque et référence)" value={form.appareils_mesure}
                    facultatif={form.categorie === 'poele'} erreur={erreurDe('appareils_mesure')} onChange={(e) => maj({ appareils_mesure: e.target.value })} aide="Repris d’une attestation à l’autre ; réglable dans Paramètres → Entretien." />
                  {form.categorie === 'chaudiere' && estGazFioul(a0.energie) && (
                    <Champ id="entretien-operations" as="textarea" libelle={`Opérations réalisées (3.1 de la norme ${a0.energie === 'fioul' ? 'NF X50-011' : 'NF X50-010'})`}
                      value={form.operations} erreur={erreurDe('operations')} onChange={(e) => maj({ operations: e.target.value })} />
                  )}
                  {form.categorie === 'chaudiere' && (
                    <>
                      <Champ id="entretien-co_ppm" libelle="CO mesuré dans l’air ambiant (ppm)" inputMode="decimal" value={String(form.co_ppm ?? '')}
                        erreur={erreurDe('co_ppm')} onChange={(e) => maj({ co_ppm: nombreSaisi(e.target.value) })}
                        aide="Après réglage et entretien : pièce aérée si possible, puis portes et fenêtres refermées ; autres appareils à combustion à l’arrêt ; chaudière à sa puissance nominale depuis au moins trois minutes ; sonde déplacée sur la largeur de la chaudière, à environ 50 cm de sa face avant, pendant au moins 30 secondes (arrêté du 15 septembre 2009, annexe 1, § 5)." />
                      {co && <p className="rounded-xl bg-surface-2 p-3 text-sm text-encre">Phrase imprimée : « {PHRASES_CO[co]} »</p>}
                      {co === 'b' && <Alerte>{DEVOIR_CO.b}</Alerte>}
                      {co === 'c' && <Alerte ton="danger">{DEVOIR_CO.c}</Alerte>}
                      {estSolide(a0.energie) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Champ id="entretien-mesures" libelle="Température des fumées" value={form.mesures?.temperature_fumees || ''} erreur={erreurDe('mesures')}
                            onChange={(e) => majSous('mesures', { temperature_fumees: e.target.value })} />
                          <Champ id="entretien-mesures_o2" libelle="O2 et CO2 (chaudière automatique)" facultatif={!a0.points?.['solide.alimentation']} erreur={erreurDe('mesures_o2')} value={form.mesures?.o2_co2 || ''} onChange={(e) => majSous('mesures', { o2_co2: e.target.value })} />
                        </div>
                      )}
                    </>
                  )}
                  {form.categorie === 'pac' && (
                    <>
                      <Choix id="entretien-etancheite" libelle="Contrôle d’étanchéité du circuit de fluide frigorigène" erreur={erreurDe('etancheite')} valeur={form.etancheite}
                        options={[{ valeur: 'controle', libelle: 'Fait : voyant et pressions du compresseur' }, { valeur: 'reglement_ue', libelle: 'Équipement soumis au règlement (UE) 2024/573' }]}
                        onChange={(v) => maj({ etancheite: v })} />
                      <Champ libelle={form.etancheite === 'reglement_ue' ? 'Fiche d’intervention (numéro, date)' : 'Relevés (voyant, pressions)'} facultatif value={form.etancheite_detail}
                        onChange={(e) => maj({ etancheite_detail: e.target.value })} />
                      {form.etancheite && !entreprise?.entretienAttestationCapacite && (
                        <p className="text-sm text-encre-3">Pour un fluide HFC, HCFC, CFC ou PFC (R32, R410A…), ce contrôle demande l’attestation de capacité de votre entreprise (articles R. 543-76 et R. 543-99 du code de l’environnement). Elle n’est pas exigée pour le R290, le R744 ou un HFO.</p>
                      )}
                    </>
                  )}
                  <Champ id={form.categorie === 'pac' ? 'entretien-mesures' : undefined} as="textarea" libelle="Résultats des mesures" facultatif={form.categorie !== 'pac'}
                    value={form.mesures?.resultats || ''} erreur={form.categorie === 'pac' ? erreurDe('mesures') : undefined}
                    placeholder={form.categorie === 'pac' ? 'Températures des unités, tensions statiques et dynamiques, pressions…' : 'Ou joignez le ticket de l’analyseur'}
                    onChange={(e) => majSous('mesures', { resultats: e.target.value })} />
                  {form.categorie === 'pac' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Champ id="entretien-defauts" as="textarea" libelle="Défauts de fonctionnement constatés" placeholder="Aucun" value={form.defauts} erreur={erreurDe('defauts')} onChange={(e) => maj({ defauts: e.target.value })} />
                      <Champ id="entretien-actions" as="textarea" libelle="Actions effectuées pour y remédier" placeholder="Aucune" value={form.actions} erreur={erreurDe('actions')} onChange={(e) => maj({ actions: e.target.value })} />
                    </div>
                  )}
                </Section>

                {form.categorie === 'chaudiere' && (
                  <Section titre="Rendement, émissions, classe énergétique">
                    <p className="text-sm text-encre-3">Valeurs évaluées par vous à l’aide des tableaux des annexes 2 et 3 de l’arrêté du 15 septembre 2009 (Mallettico ne les calcule pas).</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Champ id="entretien-rendement" libelle="Rendement évalué" placeholder="89 %" value={form.rendement?.evalue || ''} erreur={erreurDe('rendement')} onChange={(e) => majSous('rendement', { evalue: e.target.value })} />
                      <Champ id="entretien-rendement_reference" libelle="Rendement de référence" placeholder="93 %" value={form.rendement?.reference || ''} erreur={erreurDe('rendement_reference')}
                        aide={referenceRendement(a0.energie)} onChange={(e) => majSous('rendement', { reference: e.target.value })} />
                      <Champ id="entretien-emissions" libelle={`Émissions évaluées (${POLLUANTS(a0.energie)})`} value={form.emissions?.evalue || ''} erreur={erreurDe('emissions')}
                        aide={referenceEmissions(a0.energie) ? `Référence imprimée : ${referenceEmissions(a0.energie)}` : undefined} onChange={(e) => majSous('emissions', { evalue: e.target.value })} />
                      <Champ id="entretien-classe_energetique" as="select" libelle="Classe énergétique" value={form.classe_energetique} erreur={erreurDe('classe_energetique')}
                        aide="Chaudière gaz ou fioul de moins de 70 kW non étiquetée : tableau 12. Chaudière étiquetée : la classe de son étiquette. Sinon (bois, charbon, 70 kW ou plus, sans étiquette) : « Non déterminée »." onChange={(e) => maj({ classe_energetique: e.target.value })}>
                        <option value="">Choisir…</option>
                        {CLASSES.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
                      </Champ>
                    </div>
                  </Section>
                )}

                <Section titre="Conseils donnés">
                  {form.categorie === 'chaudiere' ? (
                    <div id="entretien-conseils" className="space-y-3">
                      {RUBRIQUES_CHAUDIERE.map((r) => (
                        <Champ key={r.cle} as="textarea" libelle={r.libelle.replace(/ :$/, '')} facultatif value={form.conseils?.[r.cle] || ''}
                          onChange={(e) => majSous('conseils', { [r.cle]: e.target.value })} />
                      ))}
                    </div>
                  ) : (
                    <fieldset id="entretien-conseils">
                      <legend className="sr-only">Sujets des conseils</legend>
                      {(SUJETS_CONSEILS[form.categorie] || []).map((o) => (
                        <Case key={o.valeur} libelle={o.libelle} checked={choixConseils.includes(o.valeur)}
                          onChange={(oui) => majSous('conseils', { choix: oui ? [...choixConseils.filter((x) => x !== o.valeur), o.valeur] : choixConseils.filter((x) => x !== o.valeur) })} />
                      ))}
                      <Champ as="textarea" libelle="Autres conseils" facultatif className="mt-2" value={form.conseils?.texte || ''} onChange={(e) => majSous('conseils', { texte: e.target.value })} />
                    </fieldset>
                  )}
                  {erreurDe('conseils') ? <p className="text-sm font-medium text-danger-texte">{erreurDe('conseils')}</p> : null}
                  <p className="text-sm text-encre-3">Des conseils, jamais des obligations : l’attestation dit qu’aucun investissement proposé n’est obligatoire.</p>
                </Section>

                <Section titre="Visite">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Champ id="entretien-realise_le" libelle="Date de la visite" type="date" value={jourDe(form.realise_le)} erreur={erreurDe('realise_le')} onChange={(e) => changerDate(e.target.value)} />
                    <Champ id="entretien-intervenant_nom" libelle="Intervenant (nom de la personne qui signe)" value={form.intervenant_nom} erreur={erreurDe('intervenant_nom')} onChange={(e) => changerIntervenant(e.target.value)} />
                    <Champ libelle="Dernier entretien" facultatif type="date" value={form.dernier_entretien || ''} onChange={(e) => maj({ dernier_entretien: e.target.value })} />
                    {form.categorie !== 'pac' && (
                      <Champ libelle="Dernier ramonage" facultatif type="date" value={form.dernier_ramonage || ''} onChange={(e) => maj({ dernier_ramonage: e.target.value })} />
                    )}
                  </div>
                  {enRetardRemise && <Alerte>L’attestation doit être {cat.delaiAttestation} : la date limite ({jourFr(limite)}) est passée.</Alerte>}
                  <Champ as="textarea" libelle="Observations" facultatif value={form.observations} onChange={(e) => maj({ observations: e.target.value })} />
                </Section>

                <Section titre="Prochain entretien et facture">
                  <Champ id="entretien-prochain_avant" libelle="Prochain entretien conseillé avant le" type="date" value={form.prochain_avant || ''} erreur={erreurDe('prochain_avant')}
                    onChange={(e) => { setProchainManuel(true); maj({ prochain_avant: e.target.value }); }} />
                  <div className="flex flex-wrap gap-2">
                    {(form.categorie === 'pac' ? [12, 24] : [12]).map((mois) => (
                      <Bouton key={mois} variante="secondaire" taille="compacte" onClick={() => { setProchainManuel(true); maj({ prochain_avant: prochainParDefaut(form.realise_le, mois) }); }}>
                        Dans {mois} mois
                      </Bouton>
                    ))}
                  </div>
                  {echeance && <p className="text-sm text-encre-2">Échéance légale : au plus tard le {jourFr(echeance)}{form.categorie === 'poele' ? ', si l’appareil est utilisé' : ''}.</p>}
                  {apresEcheance(form.prochain_avant, echeance) && <Alerte>La date conseillée dépasse l’échéance légale du {jourFr(echeance)}.</Alerte>}
                  {/* Franchise en base (art. 293 B du CGI) : la facture sort sans TVA, aucun taux n'est proposé (relecture du 4 nov., 6) */}
                  {!franchise && (
                    <Case libelle="Logement achevé depuis plus de deux ans" checked={form.logement_plus_2_ans} onChange={(v) => maj({ logement_plus_2_ans: v })}
                      aide="À cocher par vous, à chaque attestation. Cochée : la facture est proposée à 10 % et le dit. Sinon : 20 %, sans cette mention. Vous pourrez changer la TVA sur la facture." />
                  )}
                  {!franchise && form.logement_plus_2_ans && peutEtre55(form) && (
                    <>
                      <Case libelle="Appareil éligible au taux de 5,5 %" checked={form.eligible_55} onChange={(v) => maj({ eligible_55: v })} aide={criteres55(form)} />
                      {form.eligible_55 && (
                        <Champ libelle="Données de l’appareil qui le justifient (efficacité, classe, régulateur…)" facultatif value={form.eligible_55_detail}
                          aide="Le respect de ces critères relève de vous : gardez la fiche du produit." onChange={(e) => maj({ eligible_55_detail: e.target.value })} />
                      )}
                    </>
                  )}
                  {canViewPrices && (
                    <Champ libelle={franchise ? 'Prix (€)' : 'Prix (€ HT)'} facultatif inputMode="decimal" value={form.prix_ht === null || form.prix_ht === undefined ? '' : String(form.prix_ht).replace('.', ',')}
                      aide={franchise ? 'Repris du dernier entretien ou de vos tarifs. TVA non applicable (article 293 B du CGI).' : `Repris du dernier entretien ou de vos tarifs. TVA proposée : ${tauxPropose(form, { franchise })} %.`}
                      onChange={(e) => { const v = e.target.value.replace(',', '.'); maj({ prix_ht: v === '' ? null : v }); }} />
                  )}
                  <Case libelle="Le client refuse les rappels de son prochain entretien" checked={refusRappels} disabled={!!client?.rappels_refuses_le} onChange={setRefusRappels}
                    aide={client?.rappels_refuses_le ? 'Déjà noté sur sa fiche.' : 'Noté sur sa fiche : ni e-mail automatique, ni SMS proposé, pour aucun rappel.'} />
                </Section>

                <Section titre="Signature">
                  <Signature valeur={form.signature} onChange={(s) => { setSignatureReprise(false); maj({ signature: s }); }} />
                </Section>
              </>
            )}

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
            <Bouton variante="discret" onClick={fermer}>Annuler</Bouton>
            <Bouton variante="principal" onClick={verifier}>Vérifier l’attestation</Bouton>
          </>
        )}
      </footer>
    </div>,
    document.body,
  );
}
