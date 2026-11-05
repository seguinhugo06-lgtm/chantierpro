/**
 * Les qualifications imprimées en pied des devis et factures (les trois générateurs : `devisHtmlBuilder.js`, l'aperçu de
 * `DevisPage.jsx`, `pdfHtmlBuilder.js`). Logique pure, testée dans src/lib/__tests__/qualifications.test.js.
 *
 * Recherche « métiers » du 3 nov. 2026 (docs/metiers/synthese.md § 2) : le numéro RGE saisi dans Paramètres
 * (`rge`, `rgeOrganisme`, rangés dans `settings_json.reglages`) n'était imprimé nulle part : les générateurs lisaient
 * `labels`, qu'aucun écran n'écrit. Et la liste des organismes proposait « Qualiopi », la certification des organismes
 * de formation, qui ne délivre pas de qualification RGE (docs/metiers/commun.md § 5).
 *
 * Règles (honnêteté commerciale, C. conso. L121-2) :
 * - jamais une qualification sans numéro ;
 * - le RGE seulement avec sa date de fin (4 ans, contrôles, suspension possible : sans date, rien n'empêcherait la
 *   mention de survivre à l'expiration) et jamais après elle ;
 * - la validité s'apprécie à la date du document, pas du jour de la réimpression ;
 * - « Entreprise RGE » et non « Qualification RGE » : Certibat et Cerqual Qualitel délivrent des certifications ;
 * - l'intitulé de la qualification et l'organisme sont exigés pour imprimer : l'Anah impose sur le devis et la facture
 *   des travaux aidés « intitulé de la qualification, organisme certificateur et le numéro de qualification dans chaque
 *   domaine » (Guide des travaux éligibles, juillet 2025, p. 31 ; avis juriste du 3 nov. 2026) ; « Autre » est retiré ;
 * - la date de fin n'est lue qu'au format AAAA-MM-JJ valide (champ importable : une date illisible n'est pas imprimée) ;
 * - jamais « Qualiopi » comme organisme RGE : un numéro saisi avec cet organisme n'est pas imprimé (ce peut être un
 *   numéro Qualiopi), l'écran Paramètres demande de choisir l'organisme.
 */
import { dateLue, jourLocal } from './dates';

/** Organismes qui délivrent une qualification ou une certification RGE (docs/metiers/commun.md § 5, à vérifier sur l'annuaire France Rénov'). */
export const ORGANISMES_RGE = ['Qualibat', 'Qualifelec', 'Qualit\'EnR', 'Certibat', 'Cerqual Qualitel'];

/** Valeurs refusées comme organisme RGE (anciennement proposées par l'app). */
const ORGANISMES_REFUSES = ['Qualiopi'];

const texte = (v) => (typeof v === 'string' ? v.trim() : '');
const dateFr = (jour) => dateLue(jour).toLocaleDateString('fr-FR');
const expiree = (jour, aujourdhui) => !!texte(jour) && texte(jour).slice(0, 10) < aujourdhui;
/** « AAAA-MM-JJ » qui désigne un vrai jour (pas « 2027-02-30 », pas « 30/06/2027 »). */
export function jourValide(v) {
  const j = texte(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(j)) return false;
  return jourLocal(dateLue(j)) === j;
}

/** L'organisme choisi n'est pas un organisme RGE : à corriger dans Paramètres. */
export function organismeRgeRefuse(entreprise) {
  return ORGANISMES_REFUSES.includes(texte(entreprise?.rgeOrganisme));
}

/** Pourquoi le RGE saisi n'est pas imprimé, ou null s'il l'est (ou s'il n'y a rien à imprimer). */
export function raisonRgeNonImprime(entreprise, aujourdhui = jourLocal()) {
  if (!texte(entreprise?.rge)) return null;
  // Qualiopi est une certification (C. trav. L6316-1), pas un certificateur : juriste-btp au texte, 4 nov. 2026
  if (organismeRgeRefuse(entreprise)) return 'Qualiopi est la certification des organismes de formation, pas une qualification RGE. Choisissez l’organisme qui a délivré votre RGE (Qualibat, Qualifelec, Qualit’EnR…).';
  if (!texte(entreprise?.rgeOrganisme) || texte(entreprise?.rgeOrganisme) === 'Autre') return 'Choisissez l’organisme qui a délivré votre RGE : l’Anah exige son nom sur les devis et factures des travaux aidés.';
  if (!texte(entreprise?.rgeDomaine)) return 'Ajoutez l’intitulé de votre qualification RGE, tel qu’il figure sur votre certificat : l’Anah l’exige sur les devis et factures des travaux aidés.';
  if (!texte(entreprise?.rgeValidite)) return 'Ajoutez la date de fin de validité indiquée sur votre certificat RGE : sans elle, le RGE n’est pas imprimé.';
  if (!jourValide(entreprise?.rgeValidite)) return 'La date de fin de validité enregistrée n’est pas reconnue : ressaisissez-la dans le champ « Fin de validité ». En attendant, le RGE n’est pas imprimé sur vos documents.';
  if (expiree(entreprise?.rgeValidite, aujourdhui)) return 'La date de fin de validité est passée : le RGE n’est plus imprimé sur vos documents.';
  return null;
}

// ─── « Mes qualifications » (lot 1, docs/metiers/synthese.md § 3.7) ─────────────────────────────────────────────
// Le champ RGE unique devient une liste, rangée dans `settings_json.reglages.qualifications` :
//   { id, type, intitule, organisme, numero, fin, imprimer, ou, motsCles }
// `ou` : 'tous' (tous les documents), 'si' (seulement si une ligne contient l'un des mots), 'non' (ne pas l'imprimer).
// Le choix est gardé à part des mots : « seulement si » sans mot n'imprime RIEN (relecture du 4 nov. : une déclaration
// de services à la personne, sans mots par défaut, repassait sinon sur « tous mes documents »). Une fiche d'avant
// `ou` : `imprimer: false` vaut 'non', des mots valent 'si', sinon 'tous'. Un type peut être figé (`ouFige`) : le choix
// enregistré est alors ignoré à la lecture (services à la personne : jamais imprimée, voir son entrée plus bas).
// Règles communes : jamais imprimée sans numéro ; jamais le mot « certifié » ; validité jugée à la date du document ;
// date de fin exigée (lisible, non passée) ; la déclaration de services à la personne porte sa date, pas une échéance.
// RGE : les règles du lot 0 ci-dessus (intitulé, organisme RGE, numéro, date), toujours sur tous les documents (une
// mention exigée par l'Anah ne disparaît pas parce qu'un mot manque dans une ligne : avis critique-produit du 4 nov.).
// Autres : intitulé, organisme, numéro et date exigés ; « Seulement si une ligne contient… » est possible.

/** Les types proposés, dans cet ordre. `prefixe` ouvre la ligne imprimée ; les textes sont relus par juriste-btp. */
export const TYPES_QUALIFICATION = [
  { id: 'rge', nom: 'RGE (Reconnu garant de l’environnement)', exemple: 'QualiPAC chauffage et eau chaude sanitaire', motsCles: '' },
  { id: 'irve', nom: 'IRVE (bornes de recharge)', prefixe: 'IRVE (infrastructures de recharge)', exemple: 'IRVE P1', organismes: ['Qualifelec', 'AFNOR Certification'], motsCles: 'borne, recharge, IRVE' },
  { id: 'fluides', nom: 'Attestation de capacité (fluides frigorigènes)', prefixe: 'Attestation de capacité à manipuler les fluides frigorigènes', exemple: 'Telle qu’indiquée sur votre attestation', motsCles: 'climatisation, pompe à chaleur, PAC, frigorifique' },
  { id: 'pg_gaz', nom: 'Professionnel du gaz (PG)', prefixe: 'Appellation Professionnel du gaz (PG)', exemple: 'PG installation', organismes: ['Qualigaz'], motsCles: 'gaz' },
  { id: 'certibiocide', nom: 'Certibiocide', prefixe: 'Certificat individuel biocides (Certibiocide) détenu par', exemple: 'Nom du titulaire, catégorie', aideIntitule: 'Nom du titulaire et catégorie, tels qu’ils figurent sur le certificat (certificat individuel).', motsCles: 'traitement, termites, insectes, xylophages' },
  { id: 'certiphyto', nom: 'Certiphyto', prefixe: 'Certificat individuel produits phytopharmaceutiques (Certiphyto) détenu par', exemple: 'Nom du titulaire, catégorie', aideIntitule: 'Nom du titulaire et catégorie, tels qu’ils figurent sur le certificat (certificat individuel). L’agrément de l’entreprise se saisit dans « Autre qualification ».', motsCles: 'désherbage, traitement' },
  // SAP : « le numéro et la date d'enregistrement de la déclaration » sur la facture (C. trav. D7233-1, 2° ; juriste-btp
  // au texte, 4 nov. 2026). `fin` porte ici la date d'enregistrement (pas une échéance).
  // JAMAIS IMPRIMÉE, pour l'instant (avis juriste-btp du lot 4, 5 nov. 2026, point 9 ; décision de la session locale) :
  // imprimer la déclaration, c'est présenter la facture comme une facture de services à la personne, et D7233-1 exige alors
  // les sommes acquittées (5°), l'identifiant de l'intervenant (6°), le taux horaire ou le forfait (7°), le décompte du temps
  // passé (8°), les prix (9°) et les frais de déplacement (10°), en TTC quand la TVA s'applique (D7233-2), puis D7233-4 une
  // attestation fiscale annuelle ; sur le devis, l'arrêté du 17 mars 2015, art. 7 : mode d'intervention, nombre d'heures,
  // montants HT et TTC. L'app ne produit rien de cela. Le choix « où l'imprimer » est donc figé sur « ne pas l'imprimer » (les
  // autres choix ne s'offrent pas) et un choix déjà enregistré est ignoré à la lecture. Pour la remettre : retirer `ouFige` et
  // `raisonFigee`, quand l'app saura produire ces mentions.
  { id: 'sap', nom: 'Services à la personne (déclaration)', exemple: '', dateDeclaration: true, motsCles: '', ouFige: 'non',
    raisonFigee: 'Cette déclaration ne s’imprime pas : une facture de services à la personne demande d’autres mentions (prix TTC, temps passé, intervenant) et une attestation fiscale chaque année, que Mallettico ne fait pas encore.' },
  { id: 'autre', nom: 'Autre qualification', prefixe: '', exemple: 'Qualibat 5111', motsCles: '' },
];
const TYPE_PAR_ID = Object.fromEntries(TYPES_QUALIFICATION.map((t) => [t.id, t]));

/** Une qualification lue (champ importable) : chaînes nettoyées, type connu sinon « autre ». */
function normaliser(q, i) {
  const o = q && typeof q === 'object' ? q : {};
  return {
    id: texte(o.id) || `q${i + 1}`,
    type: TYPE_PAR_ID[texte(o.type)] ? texte(o.type) : 'autre',
    intitule: texte(o.intitule), organisme: texte(o.organisme), numero: texte(o.numero), fin: texte(o.fin),
    imprimer: ouDe(o) !== 'non',
    ou: ouDe(o),
    motsCles: texte(o.motsCles),
  };
}

/**
 * Le choix « où l'imprimer » d'un type qui ne se choisit pas (`'non'` : services à la personne, jamais imprimée), ou
 * null pour les types dont l'artisan choisit. L'écran n'offre alors aucun choix (src/components/settings/MesQualifications.jsx).
 */
export function ouFige(type) {
  return TYPE_PAR_ID[texte(type)]?.ouFige || null;
}

/** Où imprimer : 'tous' | 'si' | 'non' (voir plus haut). Le RGE imprimé l'est toujours partout. */
function ouDe(o) {
  // Type figé : le choix enregistré (importé, ancien, ou saisi avant) est ignoré
  const fige = ouFige(o.type);
  if (fige) return fige;
  if (o.imprimer === false || o.ou === 'non') return 'non';
  if (texte(o.type) === 'rge') return 'tous';
  if (o.ou === 'si' || o.ou === 'tous') return o.ou;
  return texte(o.motsCles) ? 'si' : 'tous';
}

/**
 * Une qualification qu'on vient d'ajouter dans Paramètres › Légal › Mes qualifications : vide, sur tous les documents,
 * sauf un type figé (services à la personne : « ne pas l'imprimer »).
 */
export function nouvelleQualification(type, id) {
  const ou = ouFige(type) || 'tous';
  return { id, type: TYPE_PAR_ID[texte(type)] ? texte(type) : 'autre', intitule: '', organisme: '', numero: '', fin: '', imprimer: ou !== 'non', ou, motsCles: '' };
}

/**
 * La liste des qualifications de l'entreprise. Une fiche d'avant la liste (champs `rge*` du lot 0) donne une
 * qualification RGE ; dès que la liste existe (même vide), elle seule compte.
 */
export function qualificationsDe(entreprise) {
  const e = entreprise || {};
  if (Array.isArray(e.qualifications)) return e.qualifications.filter((q) => q && typeof q === 'object').map(normaliser);
  if (!texte(e.rge)) return [];
  return [normaliser({ id: 'rge', type: 'rge', intitule: e.rgeDomaine, organisme: e.rgeOrganisme, numero: e.rge, fin: e.rgeValidite }, 0)];
}

/**
 * Les anciens champs RGE recopiés depuis la liste (premier RGE), pour la page de signature d'avant la migration 110
 * (qui ne lit que `rge*`, migration 108) ; tout vide sans RGE dans la liste.
 */
export function champsRgeDeLaListe(qualifications) {
  const rge = (qualifications || []).map(normaliser).find((q) => q.type === 'rge' && q.imprimer);
  return { rge: rge?.numero || '', rgeOrganisme: rge?.organisme || '', rgeDomaine: rge?.intitule || '', rgeValidite: rge?.fin || '' };
}

/** Pourquoi cette qualification n'est pas imprimée (texte pour l'écran), ou null si elle l'est. */
export function raisonNonImprimee(q, aujourdhui = jourLocal()) {
  const x = normaliser(q, 0);
  // Type figé (services à la personne) : l'écran dit pourquoi, quel que soit le choix enregistré
  if (TYPE_PAR_ID[x.type]?.raisonFigee) return TYPE_PAR_ID[x.type].raisonFigee;
  if (x.ou === 'non') return 'Vous avez choisi de ne pas l’imprimer.';
  if (x.ou === 'si' && !motsDe(x.motsCles).length) return 'Ajoutez les mots cherchés dans les lignes : tant qu’il n’y en a aucun, rien n’est imprimé.';
  if (!x.numero) return 'Ajoutez le numéro : sans numéro, rien n’est imprimé.';
  if (x.type === 'rge') return raisonRgeNonImprime({ rge: x.numero, rgeOrganisme: x.organisme, rgeDomaine: x.intitule, rgeValidite: x.fin }, aujourdhui);
  if (x.type === 'sap') {
    // Inatteignable tant que la déclaration est figée (`ouFige`) ; textes de l'avis du 4 nov., gardés pour le jour où l'app
    // produira les autres mentions de D7233-1
    if (!x.fin) return 'Ajoutez la date d’enregistrement de la déclaration : elle s’imprime avec son numéro.';
    if (!jourValide(x.fin)) return 'La date d’enregistrement de la déclaration n’est pas lisible : ressaisissez-la.';
    return null;
  }
  if (!x.intitule) return 'Ajoutez l’intitulé, tel qu’il figure sur votre certificat.';
  if (!x.organisme) return 'Ajoutez l’organisme qui l’a délivrée.';
  if (ORGANISMES_REFUSES.includes(x.organisme)) return 'Qualiopi est la certification des organismes de formation : choisissez l’organisme qui a délivré cette qualification.';
  {
    if (!x.fin) return 'Ajoutez la date de fin de validité indiquée sur votre certificat : sans elle, rien n’est imprimé.';
    if (!jourValide(x.fin)) return 'La date de fin n’est pas lisible : ressaisissez-la.';
    if (expiree(x.fin, aujourdhui)) return 'La date de fin est passée : elle n’est plus imprimée sur vos documents.';
  }
  return null;
}

/** La ligne imprimée d'une qualification valide (texte brut). */
export function ligneImprimee(q) {
  const x = normaliser(q, 0);
  if (x.type === 'rge') return `Entreprise RGE (Reconnu garant de l'environnement) — Qualification : ${x.intitule} — ${x.organisme} — N° ${x.numero} — Valide jusqu'au ${dateFr(x.fin)}`;
  // Mot pour mot du juriste (C. trav. D7233-1, 2°) ; jamais appelée tant que la déclaration est figée (`ouFige`)
  if (x.type === 'sap') return `Services à la personne : déclaration enregistrée sous le n° ${x.numero} le ${dateFr(x.fin)}`;
  const prefixe = TYPE_PAR_ID[x.type].prefixe;
  return `${prefixe ? `${prefixe} : ` : ''}${x.intitule} — ${x.organisme} — N° ${x.numero} — Valide jusqu'au ${dateFr(x.fin)}`;
}

const sansAccent = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/** Les mots de « Seulement si une ligne contient… » (séparés par des virgules). */
export const motsDe = (motsCles) => String(motsCles || '').split(/[,;]/).map((m) => sansAccent(m).trim()).filter(Boolean);
/** Les textes des lignes d'un document (lignes et sections). */
function textesDuDocument(doc) {
  const lignes = [...(Array.isArray(doc?.lignes) ? doc.lignes : []),
    ...(Array.isArray(doc?.sections) ? doc.sections.flatMap((s) => (Array.isArray(s?.lignes) ? s.lignes : [])) : [])];
  return lignes.map((l) => sansAccent(`${l?.description || ''} ${l?.designation || ''}`));
}
/**
 * La qualification vise-t-elle ce document ? « Tous mes documents » (et le RGE) : oui. « Seulement si une ligne
 * contient… » : seulement si une ligne contient l'un des mots ; sans mot, ou sans document connu : non.
 */
export function viseLeDocument(q, doc) {
  const x = normaliser(q, 0);
  if (x.ou === 'non') return false;
  if (x.ou !== 'si') return true;
  const mots = motsDe(x.motsCles);
  if (!mots.length || !doc) return false;
  return textesDuDocument(doc).some((t) => mots.some((m) => t.includes(m)));
}

/**
 * Les lignes de qualification à imprimer, en texte brut (chaque générateur échappe).
 * @param {object} entreprise
 * @param {string} [aujourdhui] « AAAA-MM-JJ » (date du document)
 * @param {object} [doc] le document : ses lignes décident des qualifications « seulement si une ligne contient… »
 * @returns {string[]}
 */
export function lignesQualifications(entreprise, aujourdhui = jourLocal(), doc = null) {
  const e = entreprise || {};
  if (e.mentionRGE === false) return [];
  const lignes = [];
  for (const q of qualificationsDe(e)) {
    if (raisonNonImprimee(q, aujourdhui) !== null || !viseLeDocument(q, doc)) continue;
    const l = ligneImprimee(q);
    if (!lignes.includes(l)) lignes.push(l);
  }

  return lignes;
}

/**
 * Les qualifications dont la fin approche ou est passée (alerte de Paramètres, comme la décennale) :
 * { id, nom, fin, jours } triées par date ; seulement celles qui ont un numéro et une date lisible.
 */
export function echeancesQualifications(entreprise, aujourdhui = jourLocal(), horizonJours = 60) {
  const t0 = dateLue(aujourdhui).getTime();
  return qualificationsDe(entreprise)
    .filter((q) => q.numero && q.imprimer && q.type !== 'sap' && jourValide(q.fin))
    .map((q) => ({ id: q.id, nom: q.intitule || TYPE_PAR_ID[q.type].nom, type: q.type, fin: q.fin, jours: Math.round((dateLue(q.fin).getTime() - t0) / 86400000) }))
    .filter((x) => x.jours <= horizonJours)
    .sort((a, b) => a.jours - b.jours);
}

/** Le jour d'un document (« AAAA-MM-JJ »), sinon aujourd'hui : la validité s'apprécie à la date d'émission. */
export function jourDuDocument(doc) {
  const d = texte(doc?.date);
  return /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : jourLocal();
}

/** Le bloc HTML (précédé d'un saut de ligne) pour le pied de page, ou ''. */
export function qualificationsHtml(entreprise, echapper, aujourdhui = jourLocal(), doc = null) {
  const lignes = lignesQualifications(entreprise, aujourdhui, doc);
  return lignes.length ? `<br>${lignes.map(echapper).join('<br>')}` : '';
}
