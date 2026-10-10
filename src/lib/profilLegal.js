/**
 * Profil de l'entreprise exigé avant d'envoyer un devis ou une facture — SOURCE UNIQUE.
 * SIRET, adresse, nom, forme juridique, nom de l'entrepreneur individuel, décennale.
 *
 * Lu par :
 * - le contrôle d'envoi et de téléchargement (DevisPage : validateDevisForSend, getLegalIssues) ;
 * - les bandeaux « profil incomplet » (liste des devis, DevisComposer) ;
 * - la jauge « Profil complété » des Réglages ;
 * - la liste « Informations à vérifier pour vos factures » de l'onglet Facture 2026 (lib/mentionsFacture).
 * Une jauge à 100 % veut donc dire que le profil ne bloque plus l'envoi.
 *
 * Avant ce module, chaque écran tenait sa liste : la jauge pouvait afficher 100 % sans
 * décennale alors que l'envoi la bloquait. Ajouter une mention ici la rend bloquante
 * partout : décision produit, à faire relire par l'agent juriste-btp.
 */

import { estEntrepreneurIndividuel, estEirl } from './identiteEntreprise';

const rempli = (valeur) => (typeof valeur === 'string' ? valeur.trim() !== '' : Boolean(valeur));
const estEiOuEirl = (e) => estEntrepreneurIndividuel(e) || estEirl(e);

// `id` : identifiant du manque dans la fenêtre de contrôle d'envoi (DevisPage).
// `champ` / `onglet` : où compléter dans les Réglages (champ ciblé par `settings-field-<champ>`). Les clés snake_case couvrent une entreprise
// relue telle quelle depuis la base.
// `concerne` (facultatif) : la mention ne vise que certaines entreprises ; ailleurs elle est réputée remplie
// et une liste affichée la masque plutôt que de la cocher.
export const PROFIL_EXIGE = [
  {
    // SIREN (inclus dans le SIRET) : C. com. R123-237 1°, D123-235 ; facture : service-public F31808 ;
    // devis à un particulier : C. conso. R111-2 (relecture juriste-btp du 10 oct. 2026)
    id: 'no_siret',
    champ: 'siret',
    onglet: 'legal',
    libelle: 'SIRET',
    manque: 'SIRET non renseigné',
    pourquoi: 'numéro obligatoire sur vos devis et factures',
    estRempli: (e) => rempli(e.siret),
  },
  {
    id: 'no_adresse',
    champ: 'adresse',
    onglet: 'identite',
    libelle: 'Adresse',
    manque: 'Adresse entreprise manquante',
    pourquoi: 'mention obligatoire',
    estRempli: (e) => rempli(e.adresse),
  },
  {
    id: 'no_nom',
    champ: 'nom',
    onglet: 'identite',
    libelle: 'Nom de l\'entreprise',
    manque: 'Nom de l\'entreprise manquant',
    estRempli: (e) => rempli(e.nom),
  },
  {
    id: 'no_forme_juridique',
    champ: 'formeJuridique',
    onglet: 'identite', // le choix de la forme est dans Identité (« legal » menait à un onglet sans le champ)
    libelle: 'Forme juridique',
    manque: 'Forme juridique non renseignée',
    pourquoi: 'mention obligatoire',
    estRempli: (e) => rempli(e.formeJuridique || e.forme_juridique),
  },
  {
    // Entrepreneur individuel (ou EIRL) : son nom, suivi de « EI », sur chaque document (C. com. R526-27)
    id: 'no_nom_entrepreneur',
    champ: 'nomEntrepreneur',
    onglet: 'identite',
    libelle: 'Votre prénom et nom (suivis de « EI »)',
    manque: 'Votre prénom et nom (suivis de « EI ») manquent',
    pourquoi: 'mention obligatoire',
    concerne: estEiOuEirl,
    estRempli: (e) => !estEiOuEirl(e) || rempli(e.nomEntrepreneur),
  },
  {
    id: 'no_decennale',
    champ: 'decennaleAssureur',
    onglet: 'assurances',
    libelle: 'Assurance décennale',
    manque: 'Assurance décennale manquante',
    // C. assur. L241-1 : l'obligation vise les travaux de construction (C. civ. 1792), pas tout artisan du
    // bâtiment (dépannage, entretien : non). « Obligatoire pour les artisans BTP » était inexact.
    pourquoi: 'obligatoire pour les travaux de construction',
    // L'assureur ET le numéro de police, comme le contrôle d'envoi l'a toujours exigé
    estRempli: (e) => rempli(e.decennaleAssureur || e.decennale_assureur) && rempli(e.decennaleNumero || e.decennale_numero),
  },
];

/** Les mentions exigées qui manquent, dans l'ordre de PROFIL_EXIGE. Vide : le profil ne bloque pas l'envoi. */
export function profilManquant(entreprise) {
  const e = entreprise || {};
  return PROFIL_EXIGE.filter((mention) => !mention.estRempli(e));
}

/** « SIRET, adresse, assurance décennale » : la liste à glisser dans une phrase (sigles conservés). */
export function enPhrase(manquantes) {
  return manquantes
    .map(({ libelle }) => (/^[A-Z]{2}/.test(libelle) ? libelle : libelle.charAt(0).toLowerCase() + libelle.slice(1)))
    .join(', ');
}
