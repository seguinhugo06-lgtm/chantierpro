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
  if (organismeRgeRefuse(entreprise)) return 'Qualiopi certifie les organismes de formation, pas les entreprises RGE. Choisissez l’organisme qui a délivré votre RGE (Qualibat, Qualifelec, Qualit’EnR…).';
  if (!texte(entreprise?.rgeOrganisme) || texte(entreprise?.rgeOrganisme) === 'Autre') return 'Choisissez l’organisme qui a délivré votre RGE : l’Anah exige son nom sur les devis et factures des travaux aidés.';
  if (!texte(entreprise?.rgeDomaine)) return 'Ajoutez l’intitulé de votre qualification RGE, tel qu’il figure sur votre certificat : l’Anah l’exige sur les devis et factures des travaux aidés.';
  if (!texte(entreprise?.rgeValidite)) return 'Ajoutez la date de fin de validité indiquée sur votre certificat RGE : sans elle, le RGE n’est pas imprimé.';
  if (!jourValide(entreprise?.rgeValidite)) return 'La date de fin de validité enregistrée n’est pas reconnue : ressaisissez-la dans le champ « Fin de validité ». En attendant, le RGE n’est pas imprimé sur vos documents.';
  if (expiree(entreprise?.rgeValidite, aujourdhui)) return 'La date de fin de validité est passée : le RGE n’est plus imprimé sur vos documents.';
  return null;
}

/**
 * Les lignes de qualification à imprimer, en texte brut (chaque générateur échappe).
 * @param {object} entreprise
 * @param {string} [aujourdhui] « AAAA-MM-JJ »
 * @returns {string[]}
 */
export function lignesQualifications(entreprise, aujourdhui = jourLocal()) {
  const e = entreprise || {};
  if (e.mentionRGE === false) return [];
  const lignes = [];

  const numero = texte(e.rge);
  if (numero && raisonRgeNonImprime(e, aujourdhui) === null) {
    const organisme = texte(e.rgeOrganisme);
    lignes.push(`Entreprise RGE (Reconnu garant de l'environnement) — Qualification : ${texte(e.rgeDomaine)} — ${organisme} — N° ${numero} — Valide jusqu'au ${dateFr(e.rgeValidite)}`);
  }

  return lignes;
}

/** Le jour d'un document (« AAAA-MM-JJ »), sinon aujourd'hui : la validité s'apprécie à la date d'émission. */
export function jourDuDocument(doc) {
  const d = texte(doc?.date);
  return /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : jourLocal();
}

/** Le bloc HTML (précédé d'un saut de ligne) pour le pied de page, ou ''. */
export function qualificationsHtml(entreprise, echapper, aujourdhui = jourLocal()) {
  const lignes = lignesQualifications(entreprise, aujourdhui);
  return lignes.length ? `<br>${lignes.map(echapper).join('<br>')}` : '';
}
