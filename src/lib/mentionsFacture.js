/**
 * Informations de l'entreprise à vérifier pour ses factures : la liste et la note de l'onglet
 * « Facture 2026 » des Paramètres (et le test Factur-X du même onglet, lib/facturx).
 *
 * Deux groupes :
 * - obligatoires (comptées dans la note) : le profil exigé avant l'envoi (lib/profilLegal : SIRET, adresse,
 *   nom, forme juridique, prénom et nom de l'entrepreneur individuel, décennale), plus le RCS pour qui y est
 *   inscrit et le n° de TVA intracommunautaire pour qui facture la TVA ;
 * - utiles (hors note) : l'IBAN, pour être payé par virement — ce n'est pas une mention obligatoire
 *   (service-public F31808).
 *
 * Relecture juridique du 10 oct. 2026 (docs/metier-btp.md §2 et §3). Avant, la liste :
 * - exigeait le RCS de tous (C. com. R123-237 ne vise que les inscrits au RCS : un artisan inscrit au seul
 *   RNE n'en a pas, et la liste l'incitait à inventer une mention) ;
 * - exigeait le n° de TVA intracommunautaire d'une micro-entreprise en franchise (art. 293 B du CGI) ;
 * - comptait l'IBAN et la RC Pro (pas obligatoire dans le BTP) comme « requis », pas la décennale ;
 * - comptait un critère « Factur-X » toujours validé, qui gonflait la note ;
 * - disait « complètes » dès 80 %.
 */

import { PROFIL_EXIGE } from './profilLegal';
import { estEntrepreneurIndividuel, estEirl } from './identiteEntreprise';
import { estFranchiseTva } from './franchiseTva';

const rempli = (valeur) => (typeof valeur === 'string' ? valeur.trim() !== '' : Boolean(valeur));

/** RCS saisi : ville du greffe et numéro (Réglages › Légal, lus par les PDF), ou l'ancien champ libre `rcs`. */
export function rcsRenseigne(entreprise) {
  const e = entreprise || {};
  return (rempli(e.rcsVille) && rempli(e.rcsNumero)) || rempli(e.rcs);
}

/**
 * Le RCS concerne-t-il l'entreprise ? Une société, oui. Un entrepreneur individuel (EI, EIRL, micro) n'y est
 * inscrit que s'il est commerçant, ce que l'app ne sait pas : on ne le lui demande pas, on le compte s'il l'a
 * saisi. Forme juridique inconnue : on ne sait pas, la liste demande d'abord la forme juridique.
 */
export function rcsConcerne(entreprise) {
  const e = entreprise || {};
  if (rcsRenseigne(e)) return true;
  const forme = e.formeJuridique || e.forme_juridique;
  return rempli(forme) && !estEntrepreneurIndividuel(e) && !estEirl(e);
}

/** Le n° de TVA intracommunautaire concerne qui facture la TVA : pas une micro-entreprise en franchise (293 B). */
export function tvaIntraConcernee(entreprise) {
  return !estFranchiseTva(entreprise || {});
}

// Libellés propres à cet écran : le contrôle d'envoi garde les siens (lib/profilLegal)
const LIBELLES = {
  no_adresse: 'Adresse de l\'entreprise',
  // C. assur. L241-1 : l'obligation vise les travaux de construction, pas le dépannage ni l'entretien
  no_decennale: 'Assurance décennale (si vos travaux y sont soumis)',
};

// Champ à cibler quand il en manque un parmi plusieurs (assureur puis numéro de police)
const CHAMP_MANQUANT = {
  no_decennale: (e) => (rempli(e.decennaleAssureur || e.decennale_assureur) ? 'decennaleNumero' : 'decennaleAssureur'),
};

/**
 * La liste de l'onglet Facture 2026. Chaque information : `{ id, libelle, onglet, champ, rempli }` ;
 * « Compléter » ouvre l'onglet `onglet` des Réglages sur le champ `settings-field-<champ>`.
 * `note` (0 à 100) ne compte que les obligatoires ; `complet` seulement quand toutes sont remplies.
 */
export function mentionsFacture(entreprise) {
  const e = entreprise || {};

  const obligatoires = PROFIL_EXIGE
    .filter((m) => !m.concerne || m.concerne(e))
    .map((m) => {
      const ok = m.estRempli(e);
      return {
        id: m.id,
        libelle: LIBELLES[m.id] || m.libelle,
        onglet: m.onglet,
        champ: !ok && CHAMP_MANQUANT[m.id] ? CHAMP_MANQUANT[m.id](e) : m.champ,
        rempli: ok,
      };
    });

  if (rcsConcerne(e)) {
    obligatoires.push({
      id: 'rcs',
      libelle: 'RCS et ville du greffe (sociétés et commerçants)',
      onglet: 'legal',
      champ: rempli(e.rcsVille) ? 'rcsNumero' : 'rcs',
      rempli: rcsRenseigne(e),
    });
  }

  if (tvaIntraConcernee(e)) {
    obligatoires.push({
      id: 'tvaIntra',
      libelle: 'N° de TVA intracommunautaire (si vous facturez la TVA)',
      onglet: 'legal',
      champ: 'tvaIntra',
      rempli: rempli(e.tvaIntra),
    });
  }

  const utiles = [{
    id: 'iban',
    libelle: 'Coordonnées bancaires (IBAN), pour être payé par virement',
    onglet: 'banque',
    champ: 'iban',
    rempli: rempli(e.iban),
  }];

  const remplies = obligatoires.filter((m) => m.rempli).length;
  const total = obligatoires.length;
  const complet = remplies === total;
  // Arrondi vers le bas : jamais « 100 % » tant qu'il en manque une
  const note = complet ? 100 : Math.floor((remplies / total) * 100);

  return { obligatoires, utiles, remplies, total, note, complet };
}
