/**
 * Immatriculation imprimée sur les devis, factures et lettres : RCS (commerçants, sociétés) ou RNE (artisans,
 * entreprises du secteur des métiers et de l'artisanat). Un seul module, lu par Paramètres › Légal, les deux générateurs de devis et factures
 * (`devisHtmlBuilder.js`, l'aperçu inline de `DevisPage.jsx`), `pdfHtmlBuilder.js`, la mise en demeure et
 * l'attestation de ramonage.
 *
 * Retour d'Hugo (électricien, 3 nov. 2026) : « Registre métier ou commerce — Type à revoir car pas
 * commerçant ??? » — le bloc ne proposait que le RCS (type A commerçant, B société…), même à un artisan.
 *
 * Sources :
 * - RCS : C. com. R123-237, 1° — « le numéro unique d'identification de l'entreprise […] suivi de la mention
 *   RCS suivie du nom de la ville où se trouve le greffe où elle est immatriculée » (Légifrance). Les inscrits
 *   au RCS sont les commerçants et les sociétés commerciales.
 * - RNE : aucune mention « RM » en vigueur ; répertoire des métiers remplacé par le RNE le 1er janv. 2023
 *   (ordonnance n° 2021-1189, art. 47 ; INPI) ; information due au consommateur : C. conso. R111-2, 3° ; mention au
 *   registre : C. com. L123-46 ; vérifié sur Légifrance le 3 nov. 2026 (juriste-btp). C. conso. R111-2, 3° : « Le cas
 *   échéant, le numéro d'inscription au registre du commerce et des sociétés ou au Registre national des entreprises
 *   en tant qu'entreprise du secteur des métiers et de l'artisanat ».
 * - Mentions de facture : CGI ann. II art. 242 nonies A (identité et numéro d'identification de l'émetteur).
 *
 * Données (aucune colonne nouvelle) : `rcsType` (settings_json.reglages) porte le registre — 'RM' (valeur
 * interne gardée) pour une entreprise du secteur des métiers et de l'artisanat immatriculée au RNE, 'A' à 'D' (ou
 * vide) pour le RCS, comme avant ; `rcsVille` (colonne rcs_ville) porte la ville du greffe (RCS) — un département
 * saisi avant le 3 nov. 2026 pour le RNE est ignoré, sans migration ; `rcsNumero` le numéro (SIREN) ;
 * `rcs`, l'ancien champ libre (fiche entreprise), reste lu tel quel.
 */

import { estEntrepreneurIndividuel, estEirl } from './identiteEntreprise';

const texte = (v) => (v == null ? '' : String(v).trim());
const lire = (e, cle, cleBase) => texte(e?.[cle] ?? e?.[cleBase]);

export const TYPES_RCS = ['A', 'B', 'C', 'D'];

/**
 * Le registre à afficher dans Paramètres › Légal : 'RM' ou 'RCS'.
 * - choix enregistré : 'RM', ou une lettre du RCS ;
 * - rien de choisi mais une ville et un numéro déjà saisis : 'RCS' (données d'avant ce module : elles
 *   s'imprimaient « RCS … », on ne change pas ce qui part sur les documents) ;
 * - sinon, selon la forme juridique : entrepreneur individuel (EI, micro-entreprise) ou EIRL → 'RM' ;
 *   société ou forme inconnue → 'RCS'.
 */
export function registreDe(entreprise) {
  const e = entreprise || {};
  const type = lire(e, 'rcsType', 'rcs_type').toUpperCase();
  if (type === 'RM') return 'RM';
  if (TYPES_RCS.includes(type)) return 'RCS';
  if (lire(e, 'rcsVille', 'rcs_ville') || lire(e, 'rcsNumero', 'rcs_numero')) return 'RCS';
  return estEntrepreneurIndividuel(e) || estEirl(e) ? 'RM' : 'RCS';
}

/** Choix explicite du RNE en tant qu'entreprise du secteur des métiers et de l'artisanat (valeur 'RM' ; le défaut proposé à un EI ne compte pas comme un choix). */
export function estInscritRm(entreprise) {
  return lire(entreprise, 'rcsType', 'rcs_type').toUpperCase() === 'RM';
}

/**
 * La mention imprimée, sans échappement HTML (chaque générateur échappe) ; '' si incomplète.
 * - RCS : « RCS Paris B 123 456 789 » (forme déjà imprimée avant ce module) ;
 * - RNE (artisan) : « Entreprise du secteur des métiers et de l’artisanat, immatriculée au RNE sous le n° 123 456 789 »
 *   (C. conso. R111-2, 3° ; aucune mention « RM » depuis le 1er janv. 2023) ;
 * - sinon l'ancien champ libre `rcs`, préfixé « RCS » s'il ne l'est pas déjà (comme la mise en demeure).
 */
export function mentionImmatriculation(entreprise) {
  const e = entreprise || {};
  const lieu = lire(e, 'rcsVille', 'rcs_ville');
  const numero = lire(e, 'rcsNumero', 'rcs_numero');
  if (estInscritRm(e) && numero) return `Entreprise du secteur des métiers et de l’artisanat, immatriculée au RNE sous le n° ${numero}`;
  if (lieu && numero && !estInscritRm(e)) {
    const type = lire(e, 'rcsType', 'rcs_type').toUpperCase();
    return `RCS ${lieu} ${TYPES_RCS.includes(type) ? type : 'B'} ${numero}`;
  }
  const libre = texte(e.rcs);
  if (!libre) return '';
  return /^(rcs|rm)\b/i.test(libre) || /\bRM\b/.test(libre) ? libre : `RCS ${libre}`;
}

/** Libellés du formulaire selon le registre (Paramètres › Légal). */
export function libellesImmatriculation(registre) {
  if (registre === 'RM') {
    return {
      // Plus de département : aucune mention « RM » depuis le 1er janv. 2023 (relecture juriste-btp du 3 nov. 2026)
      lieu: null,
      lieuExemple: null,
      aide: 'Votre numéro SIREN (les 9 premiers chiffres du SIRET), celui de votre attestation d’immatriculation au RNE, gratuite sur data.inpi.fr.',
    };
  }
  return {
    lieu: 'Ville du greffe',
    lieuExemple: 'Choisir la ville',
    aide: 'Recopiez la ville du greffe et le numéro (9 chiffres) inscrits sur votre extrait Kbis.',
  };
}
