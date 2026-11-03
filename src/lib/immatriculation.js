/**
 * Immatriculation imprimée sur les devis, factures et lettres : RCS (commerçants, sociétés) ou répertoire des
 * métiers (artisans). Un seul module, lu par Paramètres › Légal, les deux générateurs de devis et factures
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
 * - RM : décret n° 98-247 du 2 avril 1998, art. 9 (Code de l'artisanat, partie réglementaire depuis sa
 *   recodification) : l'artisan immatriculé indique son numéro d'identification suivi de la mention « RM » et
 *   du département de la chambre de métiers. Depuis le 1er janvier 2023, le répertoire des métiers est tenu
 *   au sein du registre national des entreprises (RNE, INPI ; ordonnance n° 2021-1189). Formulation exacte
 *   et ordre des termes À VÉRIFIER au texte en vigueur sur Légifrance (pas d'accès réseau lors de l'écriture).
 * - Mentions de facture : CGI ann. II art. 242 nonies A (identité et numéro d'identification de l'émetteur).
 *
 * Données (aucune colonne nouvelle) : `rcsType` (settings_json.reglages) porte le registre — 'RM' pour le
 * répertoire des métiers, 'A' à 'D' (ou vide) pour le RCS, comme avant ; `rcsVille` (colonne rcs_ville) porte
 * la ville du greffe (RCS) ou le département de la chambre de métiers (RM) ; `rcsNumero` le numéro (SIREN) ;
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

/** Choix explicite du répertoire des métiers (le défaut proposé à un EI ne compte pas comme un choix). */
export function estInscritRm(entreprise) {
  return lire(entreprise, 'rcsType', 'rcs_type').toUpperCase() === 'RM';
}

/**
 * La mention imprimée, sans échappement HTML (chaque générateur échappe) ; '' si incomplète.
 * - RCS : « RCS Paris B 123 456 789 » (forme déjà imprimée avant ce module) ;
 * - RM : « 123 456 789 RM 33 » (numéro, « RM », département : décret 98-247 art. 9, à vérifier) ;
 * - sinon l'ancien champ libre `rcs`, préfixé « RCS » s'il ne l'est pas déjà (comme la mise en demeure).
 */
export function mentionImmatriculation(entreprise) {
  const e = entreprise || {};
  const lieu = lire(e, 'rcsVille', 'rcs_ville');
  const numero = lire(e, 'rcsNumero', 'rcs_numero');
  if (lieu && numero) {
    if (estInscritRm(e)) return `${numero} RM ${lieu}`;
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
      // Textes relus par juriste-btp le 3 nov. 2026 (chambres de métiers régionales depuis 2021 ; l'extrait RNE
      // n'affiche pas « RM 33 » : on demande le département de l'établissement principal, en chiffres)
      lieu: 'Département d’immatriculation (numéro)',
      lieuExemple: 'ex. 33',
      aide: 'Votre numéro SIREN (9 chiffres) et le numéro du département de votre établissement principal, comme sur votre extrait RNE (data.inpi.fr).',
    };
  }
  return {
    lieu: 'Ville du greffe',
    lieuExemple: 'Choisir la ville',
    aide: 'Recopiez la ville du greffe et le numéro (9 chiffres) inscrits sur votre extrait Kbis.',
  };
}
