/**
 * Les onglets de « Les fonctionnalités en action » (site public) — logique pure, testée dans
 * `__tests__/exemples.test.js`, affichée par `exemples/OngletsExemples.jsx` (chargé à la demande avec les exemples par
 * `FonctionnalitesSection.jsx`).
 *
 * `titre` : texte exact de la spec ; `titreCourt` : l'onglet sous 1024 px (passe de finition : avec les titres longs,
 * un seul onglet tenait dans la largeur d'un téléphone) ; `phrase` : la ligne sous le titre, au bureau ; `cadre` : ce que dit la barre du
 * cadre d'application autour de l'exemple, `cadreCourt` au téléphone (le numéro n'y est jamais coupé).
 */
import { NUMERO_DEVIS } from './devisVivantEtapes';
import { FACTURE_FICTIVE } from './exemples/donneesFictives';

export const ONGLETS = [
  {
    id: 'document',
    titre: 'Le document que reçoit votre client',
    titreCourt: 'Le document',
    phrase: 'Produit par le générateur de Mallettico, sur un devis fictif.',
    cadre: `Aperçu du devis ${NUMERO_DEVIS}`,
    cadreCourt: `Aperçu · ${NUMERO_DEVIS}`,
  },
  {
    id: 'signature',
    titre: 'Signature en ligne',
    titreCourt: 'Signature',
    phrase: 'Essayez\u202f: signez au doigt ou à la souris.',
    cadre: `Signature du devis ${NUMERO_DEVIS}`,
    cadreCourt: `Signature · ${NUMERO_DEVIS}`,
  },
  {
    id: 'metre',
    titre: 'Métré express',
    titreCourt: 'Métré',
    phrase: 'Les dimensions donnent la quantité et le montant de la ligne.',
    cadre: 'Métré express',
    cadreCourt: 'Métré express',
  },
  {
    id: 'relances',
    titre: 'Relances',
    titreCourt: 'Relances',
    phrase: 'Le scénario proposé pour un devis resté sans réponse.',
    cadre: 'Relance Devis',
    cadreCourt: 'Relance Devis',
  },
  {
    id: 'encaissements',
    titre: 'Encaissements',
    titreCourt: 'Encaissements',
    phrase: 'Chaque paiement est noté, même partiel.',
    cadre: `Facture ${FACTURE_FICTIVE.numero}`,
    cadreCourt: `Facture ${FACTURE_FICTIVE.numero}`,
  },
];

/**
 * L'onglet visé par une touche depuis `actuel` : flèche droite ou bas le suivant, flèche gauche ou haut le précédent
 * (en boucle ; colonne au bureau, rangée au téléphone : les deux sens marchent partout), Début le premier, Fin le
 * dernier ; `null` pour toute autre touche (elle garde son rôle habituel).
 */
export function ongletVoisin(ids, actuel, touche) {
  const i = ids.indexOf(actuel);
  if (i < 0 || !ids.length) return null;
  if (touche === 'ArrowRight' || touche === 'ArrowDown') return ids[(i + 1) % ids.length];
  if (touche === 'ArrowLeft' || touche === 'ArrowUp') return ids[(i - 1 + ids.length) % ids.length];
  if (touche === 'Home') return ids[0];
  if (touche === 'End') return ids[ids.length - 1];
  return null;
}
