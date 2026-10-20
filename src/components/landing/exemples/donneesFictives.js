/**
 * Données fictives des exemples « Les fonctionnalités en action » du site public.
 *
 * Identité manifestement fictive (D-27, C. consom. L121-2) : exactement celle des captures du site
 * (`ENTREPRISE_FICTIVE` de scripts/site-captures.cjs, script en CommonJS qu'on ne modifie pas) ; un test
 * (`__tests__/exemples.test.js`) vérifie que les valeurs restent les mêmes. SIRET, RCS et TVA à zéros, téléphone
 * de la plage 06 39 98 réservée à la fiction par l'Arcep, e-mail en example.com, adresse « rue de l'Exemple ».
 * Pas le réglage `donneesFictives` du compte de démonstration (D-26) : comme sur les captures du site, le document
 * n'a pas le filigrane « EXEMPLE », dont un morceau coupé apparaissait au bas du cadre réduit ; l'exemple est dit
 * fictif par sa légende et par le texte de la section (relecture du 20 oct. 2026).
 */

export const ENTREPRISE_FICTIVE = {
  nom: 'Élec Exemple',
  couleur: '#12336F',
  forme_juridique: 'SARL',
  capital: '1000',
  adresse: '1 rue de l’Exemple',
  code_postal: '33000',
  ville: 'Bordeaux',
  telephone: '06 39 98 00 00',
  email: 'elec-exemple@example.com',
  siret: '00000000000000',
  code_ape: '4321A',
  rcs: 'Bordeaux B 000 000 000',
  tva_intra: 'FR00000000000',
  iban: '',
  bic: '',
  tva_defaut: 10,
  rc_pro_assureur: 'Assureur (exemple)',
  rc_pro_numero: 'EXEMPLE',
  rc_pro_validite: '2027-12-31',
  decennale_assureur: 'Assureur (exemple)',
  decennale_numero: 'EXEMPLE',
  decennale_validite: '2027-12-31',
};

/**
 * Le client des captures (page de signature) : « M. Martin, 2 rue de l'Exemple, 33000 Bordeaux », particulier,
 * ni e-mail ni téléphone (rien qui mène à une vraie personne).
 */
export const CLIENT_FICTIF = {
  prenom: 'M.',
  nom: 'Martin',
  adresse: '2 rue de l’Exemple',
  code_postal: '33000',
  ville: 'Bordeaux',
  categorie: 'particulier',
  entreprise: '',
  email: '',
  telephone: '',
};

/**
 * La facture de l'exemple « Encaissements », en centimes (entiers : le solde se compare au centime près).
 * - 4 136,00 € TTC : la facture de solde de la démonstration de l'app (src/lib/demo-data.js, FAC-2026-00003 :
 *   3 760 € HT + TVA 10 %), montant fixé par la spec ; numéro fictif à la suite de celui du devis vivant.
 * - Acompte de 30 % : calculé (1 240,80 €).
 * - Virement partiel de 1 500 € : un montant rond, comme un client en vire ; il laisse 1 395,20 €, soit deux
 *   encaissements de 500 € puis un dernier de 395,20 € : en trois clics, on voit que le dernier s'arrête au reste
 *   exact et que « Payée » n'arrive qu'au solde.
 */
export const FACTURE_FICTIVE = {
  numero: 'FAC-2026-00043',
  totalCentimes: 413600,
  acomptePct: 30,
  virementCentimes: 150000,
};

/** Ce qu'encaisse un clic sur « Encaisser 500 € » (ou le reste dû, s'il est plus petit). */
export const PAS_ENCAISSEMENT_CENTIMES = 50000;
