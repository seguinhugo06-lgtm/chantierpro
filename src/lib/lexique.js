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
    texte: 'Code de 4 chiffres et une lettre que l\'Insee attribue d\'après votre activité principale. Il sert aux statistiques : il ne vous autorise ni ne vous interdit aucun métier. L\'Insee le remplace au 1er janvier 2027 (nouvelle nomenclature) : le nouveau code se consulte sur sirene.gouv.fr.',
  },
  tvaIntra: {
    mot: 'le numéro de TVA intracommunautaire',
    texte: 'Votre numéro de TVA : FR, une clé de 2 caractères, puis votre SIREN. Le service des impôts des entreprises vous l\'attribue ; il s\'imprime sur vos factures quand vous facturez la TVA.',
  },
  ei: {
    mot: 'l’EI',
    texte: 'Entrepreneur individuel : vous exercez en votre nom, sans société. Sur vos devis et factures, votre nom doit être précédé ou suivi immédiatement de « EI » ou de « entrepreneur individuel » (de « EIRL » si vous êtes en EIRL).',
  },
  rcs: {
    mot: 'le RCS et le RNE',
    // Sources : C. com. L123-1 et R123-237 (RCS + ville du greffe) ; ordonnance n° 2021-1189, art. 47 (RNE au 1er janv. 2023) ; INPI (attestation gratuite) — vérifié le 3 nov. 2026 (juriste-btp).
    texte: 'Le RCS (registre du commerce et des sociétés) inscrit les commerçants et les sociétés ; il se cite avec le numéro et la ville du greffe. Depuis le 1er janvier 2023, les artisans sont immatriculés au registre national des entreprises (RNE), qui a remplacé le répertoire des métiers. Votre attestation d’immatriculation au RNE est gratuite sur data.inpi.fr.',
  },
  decennale: {
    mot: 'la décennale',
    texte: 'Assurance de responsabilité décennale : pendant 10 ans après la réception des travaux, elle couvre les dommages qui compromettent la solidité de l\'ouvrage ou le rendent impropre à sa destination. Obligatoire pour les travaux de construction ; en général pas pour un dépannage ni pour de l\'entretien. En cas de doute, demandez à votre assureur.',
  },
};
