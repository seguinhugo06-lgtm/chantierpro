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
 * - « Entreprise RGE » et non « Qualification RGE » : Certibat et Cerqual Qualitel délivrent des certifications ; le
 *   domaine, s'il est saisi, est imprimé (sans lui, la mention n'affirme rien sur les travaux du devis) ;
 * - jamais « Qualiopi » comme organisme RGE : un numéro saisi avec cet organisme n'est pas imprimé (ce peut être un
 *   numéro Qualiopi), l'écran Paramètres demande de choisir l'organisme.
 */
import { dateLue, jourLocal } from './dates';

/** Organismes qui délivrent une qualification ou une certification RGE (docs/metiers/commun.md § 5, à vérifier sur l'annuaire France Rénov'). */
export const ORGANISMES_RGE = ['Qualibat', 'Qualifelec', 'Qualit\'EnR', 'Certibat', 'Cerqual Qualitel', 'Autre'];

/** Valeurs refusées comme organisme RGE (anciennement proposées par l'app). */
const ORGANISMES_REFUSES = ['Qualiopi'];

const texte = (v) => (typeof v === 'string' ? v.trim() : '');
const dateFr = (jour) => dateLue(jour).toLocaleDateString('fr-FR');
const expiree = (jour, aujourdhui) => !!texte(jour) && texte(jour).slice(0, 10) < aujourdhui;

/** L'organisme choisi n'est pas un organisme RGE : à corriger dans Paramètres. */
export function organismeRgeRefuse(entreprise) {
  return ORGANISMES_REFUSES.includes(texte(entreprise?.rgeOrganisme));
}

/** Pourquoi le RGE saisi n'est pas imprimé, ou null s'il l'est (ou s'il n'y a rien à imprimer). */
export function raisonRgeNonImprime(entreprise, aujourdhui = jourLocal()) {
  if (!texte(entreprise?.rge)) return null;
  if (organismeRgeRefuse(entreprise)) return 'Qualiopi certifie les organismes de formation, pas les entreprises RGE. Choisissez l’organisme qui a délivré votre RGE (Qualibat, Qualifelec, Qualit’EnR…).';
  if (!texte(entreprise?.rgeValidite)) return 'Ajoutez la date de fin de validité indiquée sur votre certificat RGE : sans elle, le RGE n’est pas imprimé.';
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
    const deOrganisme = organisme && organisme !== 'Autre' ? ` (${organisme})` : '';
    const domaine = texte(e.rgeDomaine) ? ` — Domaine : ${texte(e.rgeDomaine)}` : '';
    lignes.push(`Entreprise RGE (Reconnu garant de l'environnement) — N° ${numero}${deOrganisme}${domaine} — Valide jusqu'au ${dateFr(e.rgeValidite)}`);
  }

  // Ancien format (`labels`), gardé pour une fiche qui en aurait : mêmes règles
  if (Array.isArray(e.labels)) {
    for (const l of e.labels) {
      if (!l?.actif || !texte(l.nom) || !texte(l.numero)) continue;
      if (ORGANISMES_REFUSES.includes(texte(l.organisme)) || expiree(l.dateExpiration, aujourdhui)) continue;
      lignes.push(`${texte(l.nom)} N°${texte(l.numero)}${texte(l.organisme) ? ` (${texte(l.organisme)})` : ''}${texte(l.dateExpiration) ? ` — Valide jusqu'au ${dateFr(l.dateExpiration)}` : ''}`);
    }
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
