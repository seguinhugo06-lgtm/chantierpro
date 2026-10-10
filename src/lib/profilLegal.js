/**
 * Profil de l'entreprise exigé avant d'envoyer un devis ou une facture — SOURCE UNIQUE.
 *
 * Lu par :
 * - le contrôle d'envoi et de téléchargement (DevisPage : validateDevisForSend, getLegalIssues) ;
 * - les bandeaux « profil incomplet » (liste des devis, DevisComposer) ;
 * - la jauge « Profil complété » des Réglages.
 * Une jauge à 100 % veut donc dire que le profil ne bloque plus l'envoi.
 *
 * Avant ce module, chaque écran tenait sa liste : la jauge pouvait afficher 100 % sans
 * décennale alors que l'envoi la bloquait. Ajouter une mention ici la rend bloquante
 * partout : décision produit, à faire relire par l'agent juriste-btp.
 */

const rempli = (valeur) => (typeof valeur === 'string' ? valeur.trim() !== '' : Boolean(valeur));

// `id` : identifiant du manque dans la fenêtre de contrôle d'envoi (DevisPage).
// `champ` / `onglet` : où compléter dans les Réglages (champ ciblé par `settings-field-<champ>`). Les clés snake_case couvrent une entreprise
// relue telle quelle depuis la base.
export const PROFIL_EXIGE = [
  {
    // C. com. R123-237 : numéro d'identification sur les documents de l'entreprise
    id: 'no_siret',
    champ: 'siret',
    onglet: 'legal',
    libelle: 'SIRET',
    manque: 'SIRET non renseigné',
    pourquoi: 'mention obligatoire sur les devis et factures (loi française)',
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
    onglet: 'legal',
    libelle: 'Forme juridique',
    manque: 'Forme juridique non renseignée',
    pourquoi: 'mention obligatoire',
    estRempli: (e) => rempli(e.formeJuridique || e.forme_juridique),
  },
  {
    id: 'no_decennale',
    champ: 'decennaleAssureur',
    onglet: 'assurances',
    libelle: 'Assurance décennale',
    manque: 'Assurance décennale manquante',
    pourquoi: 'obligatoire pour les artisans BTP',
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
