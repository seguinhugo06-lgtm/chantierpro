/**
 * Les mots difficiles des informations légales, expliqués en une phrase (retours d'Hugo, 21-23 oct. 2026 :
 * « APE, TVA intracommunautaire, EI… on ne sait pas ce que c'est »). Affichés à la demande, au clavier comme au
 * toucher, à côté du champ (ui/AideMot). Textes nouveaux du 26 oct. 2026, à relire par l'agent juriste-btp.
 * `mot` : ce que lit un lecteur d'écran sur le bouton (« Qu'est-ce que le SIRET ? »).
 */
export const LEXIQUE = {
  siret: {
    mot: 'le SIRET',
    texte: 'Numéro de 14 chiffres que l\'Insee attribue à votre établissement. Ses 9 premiers chiffres forment le SIREN, le numéro de l\'entreprise.',
  },
  ape: {
    mot: 'le code APE',
    texte: 'Code de 4 chiffres et une lettre que l\'Insee attribue d\'après votre activité principale. Il sert aux statistiques : il ne vous autorise ni ne vous interdit aucun métier.',
  },
  tvaIntra: {
    mot: 'le numéro de TVA intracommunautaire',
    texte: 'Votre numéro de TVA : FR, une clé de 2 caractères, puis votre SIREN. Le service des impôts des entreprises vous l\'attribue ; il s\'imprime sur vos factures quand vous facturez la TVA.',
  },
  ei: {
    mot: 'l’EI',
    texte: 'Entrepreneur individuel : vous exercez en votre nom, sans société. Sur vos devis et factures, votre nom doit être suivi de « EI » ou de « entrepreneur individuel ».',
  },
  rcs: {
    mot: 'le RCS et le RM',
    texte: 'Le RCS (registre du commerce et des sociétés) inscrit les sociétés et les commerçants ; il se cite avec la ville du greffe et le numéro. Le répertoire des métiers (RM) des artisans est remplacé depuis 2023 par le registre national des entreprises (RNE).',
  },
  decennale: {
    mot: 'la décennale',
    texte: 'Assurance de responsabilité décennale : pendant 10 ans après la réception des travaux, elle couvre les dommages qui menacent la solidité de l\'ouvrage ou le rendent impropre à son usage. Obligatoire pour les travaux de construction.',
  },
};
