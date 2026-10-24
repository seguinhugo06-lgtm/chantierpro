/**
 * Ramonage (tâche `ramonage`, décision D-30, cadrage docs/cadrage-ramonage.md) : les choix de l'attestation, les dates
 * (prochain ramonage, rappel), la fiche des appareils d'un client, la validation avant l'enregistrement, le SMS de
 * rappel. Logique pure, sans React ni Supabase : testée dans src/lib/__tests__/ramonage.test.js.
 *
 * Vocabulaire réglementaire (code de la santé publique, R. 1331-66 à R. 1331-78, vérifié par juriste-btp le 23 oct.
 * 2026) : le ramonage est un nettoyage « par action mécanique directe » qui assure « la vacuité du conduit sur toute sa
 * longueur » (R. 1331-70) ; l'attestation « atteste notamment de la vacuité » (R. 1331-75). « Assurée / non assurée »
 * est le constat du professionnel, choisi par lui à chaque attestation, jamais pré-rempli ni affirmé par Mallettico.
 * L'app ne fixe aucune fréquence (R. 1331-71 : au moins tous les douze mois, davantage si un arrêté local l'impose).
 */
import { jourLocal, ajouterMois, dateLue } from './dates';
import { nomImprime, formeImprimee } from './identiteEntreprise';

const liste = (paires) => paires.map(([valeur, libelle]) => ({ valeur, libelle }));

export const TYPES_APPAREIL = liste([
  ['cheminee_ouverte', 'Cheminée ouverte'], ['insert', 'Insert'], ['poele_bois', 'Poêle à bois'],
  ['poele_granules', 'Poêle à granulés'], ['chaudiere', 'Chaudière'], ['autre', 'Autre'],
]);
export const COMBUSTIBLES = liste([
  ['bois', 'Bois'], ['granules', 'Granulés'], ['charbon', 'Charbon'], ['fioul', 'Fioul'], ['gaz', 'Gaz'], ['autre', 'Autre'],
]);
export const CONDUITS = liste([['maconne', 'Maçonné'], ['metallique', 'Métallique'], ['tube_chemise', 'Tubé-chemisé'], ['autre', 'Autre']]);
// Un produit chimique n'est qu'un complément (R. 1331-70 : action mécanique directe) : case à part, pas une méthode
export const METHODES = liste([['mecanique_manuelle', 'Mécanique manuelle (hérisson, écouvillon)'], ['mecanique_rotative', 'Mécanique rotative']]);
export const QUALITES = liste([['proprietaire', 'Propriétaire'], ['locataire', 'Locataire'], ['autre', 'Autre']]);
export const RACCORDEMENTS = liste([['ramone', 'Ramoné'], ['sans_objet', 'Sans objet']]);
export const VACUITES = liste([['assuree', 'Assurée'], ['non_assuree', 'Non assurée']]);

/** Constats facultatifs : un point laissé vide n'est pas imprimé. */
export const CONSTATS = [
  { cle: 'etat_conduit', libelle: 'État apparent du conduit', options: liste([['bon', 'Bon'], ['passable', 'Passable'], ['mauvais', 'Mauvais']]) },
  { cle: 'tubage', libelle: 'Tubage', options: liste([['present', 'Présent'], ['absent', 'Absent'], ['non_visible', 'Non visible']]) },
  { cle: 'depots', libelle: 'Dépôts et suie', options: liste([['faibles', 'Faibles'], ['normaux', 'Normaux'], ['importants', 'Importants']]) },
  { cle: 'bistre', libelle: 'Bistre (dépôt vitrifié)', options: liste([['absent', 'Absent'], ['present', 'Présent']]) },
  { cle: 'trappe', libelle: 'Trappe de visite, pied de conduit', options: liste([['bon_etat', 'Bon état'], ['a_reparer', 'À réparer']]) },
  // R. 1331-70, al. 2 : souches et accessoires vérifiés lors du ramonage
  { cle: 'souche', libelle: 'Souche et accessoires (mitre, mitron, aspirateur)', options: liste([['bon_etat', 'Bon état'], ['a_remettre', 'À remettre en état'], ['non_accessibles', 'Non accessibles']]) },
  // « Observés », pas « contrôlés » : l'entretien de l'appareil est une autre obligation (R. 1331-67 et -68)
  { cle: 'joints', libelle: 'Joints et étanchéité de l’appareil (observés)', options: liste([['bon_etat', 'Bon état'], ['a_controler', 'À contrôler']]) },
];

/** Conseils dus à l'usager au ramonage d'un appareil à combustible solide (R. 1331-77 ; arrêté du 20 juillet 2023, annexe 2). */
export const CONSEILS = liste([
  ['ameliorations', 'Améliorations possibles de l’installation'],
  ['usage', 'Bon usage de l’appareil et réduction des émissions'],
  ['combustible', 'Qualité et stockage du combustible'],
  ['frequence', 'Ramonages plus fréquents selon l’usage'],
  ['inutilisation', 'Ramoner avant une longue période sans utilisation'],
  ['remplacement', 'Intérêt d’un remplacement de l’appareil et aides possibles'],
]);

export const AIDE_FREQUENCE = 'Au moins tous les douze mois (article R. 1331-71 du code de la santé publique) ; un arrêté préfectoral (règlement sanitaire départemental) ou municipal peut en imposer davantage, dont un pendant la période de chauffe.';
export const AIDE_CHIMIQUE = 'Un produit chimique ne remplace pas le ramonage mécanique (article R. 1331-70 du code de la santé publique).';
export const DELAI_RAPPEL_DEFAUT = 30;

export function libelleDe(options, valeur) {
  return options.find((o) => o.valeur === valeur)?.libelle || '';
}

const SOLIDES = ['bois', 'granules', 'charbon'];
export const estCombustibleSolide = (combustible) => SOLIDES.includes(combustible);

/** Les conseils sont dus au ramonage d'un foyer ouvert ou fermé à combustible solide, hors chaudière (R. 1331-77). */
export const conseilsExiges = (r) => estCombustibleSolide(r?.combustible) && r?.appareil_type !== 'chaudiere';

/** Foyer fermé à combustible solide (insert, poêle) : l'attestation dit qu'elle ne vaut pas attestation d'entretien. */
export const estFoyerFermeSolide = (r) => estCombustibleSolide(r?.combustible) && ['insert', 'poele_bois', 'poele_granules'].includes(r?.appareil_type);

/** « AAAA-MM-JJ » décalé de n jours (heure de l'appareil). */
export function ajouterJours(jour, n) {
  const d = dateLue(String(jour || '').slice(0, 10));
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + n);
  return jourLocal(d);
}

/** Jour local d'un horodatage (« AAAA-MM-JJ »). */
export const jourDe = (horodatage) => jourLocal(horodatage ? new Date(horodatage) : new Date());

/** Prochain ramonage conseillé : dans 12 mois par défaut (date libre ensuite). */
export function prochainParDefaut(realiseLe, mois = 12) {
  return ajouterMois(jourDe(realiseLe), mois);
}

/** Au-delà de douze mois après le passage : hors du délai de R. 1331-71 (alerte non bloquante). */
export function horsDelaiDouzeMois(realiseLe, prochain) {
  if (!prochain) return false;
  return String(prochain) > ajouterMois(jourDe(realiseLe), 12);
}

const parDateDecroissante = (a, b) => String(b.realise_le || '').localeCompare(String(a.realise_le || ''));
const vivante = (r) => !r.annulee_le;

/**
 * Les appareils d'un client, d'après leurs passages : le dernier passage non annulé de chaque `appareil_ref`, et tout
 * l'historique (annulées comprises, pour les montrer barrées). Du plus récent au plus ancien.
 */
export function appareilsDuClient(ramonages, clientId) {
  const groupes = new Map();
  for (const r of ramonages || []) {
    if (r.client_id !== clientId) continue;
    if (!groupes.has(r.appareil_ref)) groupes.set(r.appareil_ref, []);
    groupes.get(r.appareil_ref).push(r);
  }
  return [...groupes.entries()]
    .map(([appareilRef, passages]) => {
      const tries = [...passages].sort(parDateDecroissante);
      return { appareil_ref: appareilRef, passages: tries, dernier: tries.find(vivante) || null };
    })
    .filter((a) => a.dernier)
    .sort((a, b) => parDateDecroissante(a.dernier, b.dernier));
}

/** Le dernier ramonage non annulé d'un appareil avant une date (pour « dernier ramonage connu » sur l'attestation). */
export function ramonagePrecedent(ramonages, ramonage) {
  return (ramonages || [])
    .filter((r) => r.appareil_ref === ramonage?.appareil_ref && r.id !== ramonage?.id && vivante(r)
      && String(r.realise_le || '') < String(ramonage?.realise_le || ''))
    .sort(parDateDecroissante)[0] || null;
}

/** Nombre de ramonages de cet appareil dans l'année civile du passage, celui-ci compris (annulés exclus). */
export function nbDansAnnee(ramonages, appareilRef, realiseLe, sauf = null) {
  const annee = jourDe(realiseLe).slice(0, 4);
  return 1 + (ramonages || []).filter((r) => r.appareil_ref === appareilRef && r.id !== sauf && vivante(r)
    && jourDe(r.realise_le).slice(0, 4) === annee).length;
}

/** Jour à partir duquel le rappel est dû. */
export const jourDuRappel = (ramonage, jours = DELAI_RAPPEL_DEFAUT) => ajouterJours(ramonage?.prochain_avant, -Math.max(0, Number(jours) || 0));

/**
 * Rappels à faire : pour chaque appareil, son dernier passage non annulé, dont le rappel n'est pas fait, à partir de
 * « prochain ramonage − délai », pour un client toujours connu qui n'a pas refusé les rappels.
 * @returns {{ ramonage, client, jourRappel, joursRestants, enRetard }[]} triés par échéance
 */
export function rappelsDus(ramonages, clients, { jours = DELAI_RAPPEL_DEFAUT, aujourdhui = jourLocal() } = {}) {
  const parClient = new Map((clients || []).map((c) => [c.id, c]));
  const derniers = new Map();
  for (const r of ramonages || []) {
    if (!vivante(r) || !r.appareil_ref) continue;
    const actuel = derniers.get(r.appareil_ref);
    if (!actuel || parDateDecroissante(r, actuel) < 0) derniers.set(r.appareil_ref, r);
  }
  const dus = [];
  for (const r of derniers.values()) {
    const client = parClient.get(r.client_id);
    if (!client || client.rappels_refuses_le || r.rappel_fait_le || !r.prochain_avant) continue;
    const jourRappel = jourDuRappel(r, jours);
    if (aujourdhui < jourRappel) continue;
    const joursRestants = Math.round((dateLue(r.prochain_avant) - dateLue(aujourdhui)) / 86400000);
    dus.push({ ramonage: r, client, jourRappel, joursRestants, enRetard: joursRestants < 0 });
  }
  return dus.sort((a, b) => String(a.ramonage.prochain_avant).localeCompare(String(b.ramonage.prochain_avant)));
}

const dateFr = (jour) => (jour ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR') : '');

/**
 * Le SMS de rappel (texte relu par juriste-btp, 24 oct. 2026 : identité avec « EI », objet, opposition par STOP ;
 * jamais « obligatoire » ; une échéance passée se dit au passé).
 */
export function texteSms({ entreprise, ramonage, aujourdhui = jourLocal() }) {
  const qui = [nomImprime(entreprise), entreprise?.tel || entreprise?.telephone].filter(Boolean).join(', ');
  const echeance = String(ramonage?.prochain_avant || '') < aujourdhui ? 'était conseillé avant le' : 'est à prévoir avant le';
  return `Bonjour, votre ramonage ${echeance} ${dateFr(ramonage?.prochain_avant)}. ${qui}${qui ? ', ' : ''}`
    + `qui a ramoné votre conduit le ${dateFr(jourDe(ramonage?.realise_le))}. Pour ne plus recevoir de rappel, répondez STOP.`;
}

/** Lien `sms:` avec le texte pré-rempli (forme comprise par iOS et Android). */
export function lienSms(telephone, texte) {
  const numero = String(telephone || '').replace(/[^\d+]/g, '');
  return numero ? `sms:${numero}?&body=${encodeURIComponent(texte || '')}` : '';
}

export const lienAppel = (telephone) => {
  const numero = String(telephone || '').replace(/[^\d+]/g, '');
  return numero ? `tel:${numero}` : '';
};

/** Description courte d'un appareil : « Poêle à bois — bois, conduit tubé-chemisé (salon) ». */
export function descriptionAppareil(r) {
  if (!r) return '';
  const type = r.appareil_type === 'autre' && r.precisions ? r.precisions : libelleDe(TYPES_APPAREIL, r.appareil_type);
  const details = [libelleDe(COMBUSTIBLES, r.combustible).toLowerCase(), r.conduit ? `conduit ${libelleDe(CONDUITS, r.conduit).toLowerCase()}` : '']
    .filter(Boolean).join(', ');
  return `${type}${details ? ` — ${details}` : ''}${r.localisation ? ` (${r.localisation})` : ''}`;
}

/**
 * Ce qui manque avant d'enregistrer : la vacuité (et sa précision si elle n'est pas assurée), les conseils pour un
 * combustible solide, l'identité et le lieu, l'appareil, la méthode, le prochain ramonage. Liste vide = enregistrable.
 */
export function manquants(r) {
  const m = [];
  const vide = (v) => !String(v ?? '').trim();
  if (vide(r?.client_nom)) m.push({ champ: 'client_nom', message: 'Le nom du client' });
  if (vide(r?.adresse_intervention)) m.push({ champ: 'adresse_intervention', message: 'L’adresse de l’intervention' });
  if (vide(r?.qualite_client)) m.push({ champ: 'qualite_client', message: 'La qualité du client' });
  if (vide(r?.appareil_type)) m.push({ champ: 'appareil_type', message: 'Le type d’appareil' });
  if (r?.appareil_type === 'autre' && vide(r?.precisions)) m.push({ champ: 'precisions', message: 'Les précisions sur l’appareil' });
  if (vide(r?.combustible)) m.push({ champ: 'combustible', message: 'Le combustible' });
  if (vide(r?.conduit)) m.push({ champ: 'conduit', message: 'Le conduit' });
  if (vide(r?.realise_le)) m.push({ champ: 'realise_le', message: 'La date et l’heure' });
  if (vide(r?.intervenant_nom)) m.push({ champ: 'intervenant_nom', message: 'Le nom de l’intervenant' });
  if (vide(r?.methode)) m.push({ champ: 'methode', message: 'La méthode' });
  if (!['assuree', 'non_assuree'].includes(r?.vacuite)) m.push({ champ: 'vacuite', message: 'La vacuité du conduit' });
  if (r?.vacuite === 'non_assuree' && vide(r?.vacuite_precision)) m.push({ champ: 'vacuite_precision', message: 'Pourquoi la vacuité n’a pas pu être assurée' });
  if (conseilsExiges(r) && !(r?.conseils?.choix?.length || String(r?.conseils?.texte || '').trim())) {
    m.push({ champ: 'conseils', message: 'Les conseils donnés (combustible solide)' });
  }
  if (vide(r?.prochain_avant)) m.push({ champ: 'prochain_avant', message: 'La date du prochain ramonage' });
  else if (r?.realise_le && String(r.prochain_avant) <= jourDe(r.realise_le)) {
    m.push({ champ: 'prochain_avant', message: 'Un prochain ramonage après la date du passage' });
  }
  return m;
}

/** Tarif fixe réglé pour ce type d'appareil (Paramètres → Ramonage), sinon null. */
export function tarifPour(entreprise, type) {
  const v = Number(entreprise?.ramonageTarifs?.[type]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Brouillon d'un nouveau ramonage : du dernier passage, seuls l'appareil, le conduit, le lieu, la qualité du client et le
 * prix sont repris — jamais les constats ni les observations (relecture juriste-btp). Nouvel appareil : `precedent` nul.
 */
export function nouveauBrouillon({ client, precedent = null, entreprise = null, intervenant = '', maintenant = new Date() }) {
  const realiseLe = maintenant.toISOString();
  const appareilType = precedent?.appareil_type || '';
  return {
    client_id: client?.id || null,
    appareil_ref: precedent?.appareil_ref || crypto.randomUUID(),
    client_nom: [client?.prenom, client?.nom].filter(Boolean).join(' ').trim() || client?.entreprise || '',
    client_contact: [client?.telephone, client?.email].filter(Boolean).join(' · '),
    qualite_client: precedent?.qualite_client || '',
    qualite_precision: precedent?.qualite_precision || '',
    adresse_intervention: precedent?.adresse_intervention || client?.adresse || '',
    appareil_type: appareilType,
    combustible: precedent?.combustible || '',
    conduit: precedent?.conduit || '',
    precisions: precedent?.precisions || '',
    localisation: precedent?.localisation || '',
    realise_le: realiseLe,
    intervenant_nom: intervenant || entreprise?.nomEntrepreneur || '',
    methode: '',
    complement_chimique: false,
    raccordement: 'ramone',
    vacuite: '',
    vacuite_precision: '',
    constats: {},
    observations: '',
    conseils: { choix: [], texte: '' },
    prochain_avant: prochainParDefaut(realiseLe),
    prix_ht: precedent?.prix_ht ?? tarifPour(entreprise, appareilType) ?? null,
    signature: null,
  };
}

/** La ligne de la facture tirée d'une attestation (prix HT, une unité) ; la date de la prestation y figure. */
export function ligneFacture(r) {
  const le = r?.realise_le ? ` du ${dateFr(jourDe(r.realise_le))}` : '';
  return {
    description: `Ramonage${le} — ${descriptionAppareil(r)}${r?.numero ? ` — attestation n° ${r.numero}` : ''}`,
    quantite: 1,
    unite: 'u',
    prixUnitaire: Number(r?.prix_ht) || 0,
  };
}

/** Mode démo (pas de base) : la série locale suit la forme de la base, RAM-AAAA-NNNNN, à la suite du plus grand. */
export function numeroRamonageDemo(ramonages, maintenant = new Date()) {
  const an = new Date(maintenant).getFullYear() || new Date().getFullYear();
  const motif = new RegExp(`^RAM-${an}-(\\d{5})$`);
  const dernier = Math.max(0, ...(ramonages || []).map((r) => Number(String(r.numero || '').match(motif)?.[1] || 0)));
  return `RAM-${an}-${String(dernier + 1).padStart(5, '0')}`;
}

/**
 * Identité de l'émetteur, recopiée dans l'attestation à son enregistrement puis figée par la base (relecture juriste-btp
 * du 24 oct. 2026 : un PDF retéléchargé après un changement d'assureur ou d'adresse ne doit pas changer d'émetteur).
 */
export function emetteurDe(entreprise) {
  if (!entreprise) return null;
  const champs = ['nom', 'formeJuridique', 'nomEntrepreneur', 'capital', 'adresse', 'codePostal', 'ville', 'tel', 'email', 'siteWeb',
    'siret', 'rcsVille', 'rcsNumero', 'rcsType', 'rcs', 'rcProAssureur', 'rcProNumero', 'couleur', 'donneesFictives'];
  const e = {};
  for (const c of champs) {
    const v = entreprise[c];
    if (v !== undefined && v !== null && v !== '') e[c] = v;
  }
  if (!e.tel && entreprise.telephone) e.tel = entreprise.telephone;
  e.nomImprime = nomImprime(entreprise);
  e.formeImprimee = formeImprimee(entreprise);
  return e;
}
