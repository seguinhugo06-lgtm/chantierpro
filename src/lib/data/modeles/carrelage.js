/**
 * Modèles Devis - CARRELAGE (14 modèles)
 */

export const CARRELAGE_MODELES = {
  nom: 'Carrelage',
  icon: '🔶',
  color: '#14b8a6',
  modeles: [
    {
      id: 'sdb-complete',
      nom: 'Carrelage salle de bain complète (sol + murs)',
      description: '~6 lignes | ~2 000 – 5 000 € HT | ~55% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 55,
      lignes: [
        { description: 'Préparation supports', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Étanchéité zone douche (SPEC)', quantite: 6, unite: 'm²', prixUnitaire: 35, prixAchat: 15 },
        { description: 'Carrelage sol', quantite: 8, unite: 'm²', prixUnitaire: 58, prixAchat: 28 },
        { description: 'Carrelage mural / faïence', quantite: 15, unite: 'm²', prixUnitaire: 52, prixAchat: 24 },
        { description: 'Joints + profils', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 65 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'sol-piece-vie',
      nom: 'Carrelage sol pièce de vie',
      description: '~5 lignes | ~1 500 – 3 500 € HT | ~55% marge',
      prixMin: 1500,
      prixMax: 3500,
      margeCible: 55,
      lignes: [
        { description: 'Ragréage', quantite: 35, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'F&P carrelage', quantite: 35, unite: 'm²', prixUnitaire: 55, prixAchat: 26 },
        { description: 'Découpes', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
        { description: 'Plinthes', quantite: 25, unite: 'ml', prixUnitaire: 14, prixAchat: 6 },
        { description: 'Joints et nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'sol-appart-complet',
      nom: 'Carrelage sol appartement complet',
      description: '~6 lignes | ~3 000 – 7 000 € HT | ~50% marge',
      prixMin: 3000,
      prixMax: 7000,
      margeCible: 50,
      lignes: [
        { description: 'Dépose ancien revêtement', quantite: 60, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'Ragréage', quantite: 60, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'F&P carrelage', quantite: 60, unite: 'm²', prixUnitaire: 55, prixAchat: 26 },
        { description: 'Plinthes', quantite: 45, unite: 'ml', prixUnitaire: 14, prixAchat: 6 },
        { description: 'Barres de seuil', quantite: 5, unite: 'u', prixUnitaire: 35, prixAchat: 14 },
        { description: 'Joints et nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 220, prixAchat: 80 },
      ]
    },
    {
      id: 'credence-cuisine',
      nom: 'Crédence cuisine',
      description: '~3 lignes | ~400 – 1 000 € HT | ~60% marge',
      prixMin: 400,
      prixMax: 1000,
      margeCible: 60,
      lignes: [
        { description: 'Préparation support', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
        { description: 'F&P carrelage mural', quantite: 4, unite: 'm²', prixUnitaire: 65, prixAchat: 30 },
        { description: 'Joints et finitions', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'terrasse-ext',
      nom: 'Carrelage terrasse extérieure',
      description: '~5 lignes | ~2 000 – 5 000 € HT | ~50% marge',
      prixMin: 2000,
      prixMax: 5000,
      margeCible: 50,
      lignes: [
        { description: 'Préparation support', quantite: 25, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'Colle extérieure flexible', quantite: 25, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'F&P carrelage', quantite: 25, unite: 'm²', prixUnitaire: 62, prixAchat: 30 },
        { description: 'Joints de dilatation', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 55 },
        { description: 'Nez de marche', quantite: 4, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
      ]
    },
    {
      id: 'terrasse-plots',
      nom: 'Carrelage sur plot (terrasse)',
      description: '~4 lignes | ~2 000 – 4 500 € HT | ~50% marge',
      prixMin: 2000,
      prixMax: 4500,
      margeCible: 50,
      lignes: [
        { description: 'Préparation support', quantite: 25, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'F&P plots réglables', quantite: 100, unite: 'u', prixUnitaire: 5, prixAchat: 2 },
        { description: 'F&P dalles sur plot', quantite: 25, unite: 'm²', prixUnitaire: 68, prixAchat: 35 },
        { description: 'Finitions (nez de terrasse, ajustements)', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 65 },
      ]
    },
    {
      id: 'douche-italienne',
      nom: 'Douche italienne (carrelage complet)',
      description: '~6 lignes | ~1 500 – 3 500 € HT | ~55% marge',
      prixMin: 1500,
      prixMax: 3500,
      margeCible: 55,
      lignes: [
        { description: 'Étanchéité SPEC complète', quantite: 6, unite: 'm²', prixUnitaire: 45, prixAchat: 20 },
        { description: 'Carrelage receveur (antidérapant)', quantite: 3, unite: 'm²', prixUnitaire: 75, prixAchat: 35 },
        { description: 'Carrelage murs douche', quantite: 10, unite: 'm²', prixUnitaire: 58, prixAchat: 28 },
        { description: 'Caniveau / bonde', quantite: 1, unite: 'u', prixUnitaire: 220, prixAchat: 110 },
        { description: 'Joints époxy', quantite: 1, unite: 'forfait', prixUnitaire: 180, prixAchat: 70 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
    {
      id: 'remplacement',
      nom: 'Remplacement carrelage (dépose + repose)',
      description: '~5 lignes | ~1 500 – 4 000 € HT | ~50% marge',
      prixMin: 1500,
      prixMax: 4000,
      margeCible: 50,
      lignes: [
        { description: 'Dépose ancien carrelage', quantite: 25, unite: 'm²', prixUnitaire: 18, prixAchat: 6 },
        { description: 'Ragréage', quantite: 25, unite: 'm²', prixUnitaire: 20, prixAchat: 9 },
        { description: 'F&P carrelage neuf', quantite: 25, unite: 'm²', prixUnitaire: 58, prixAchat: 28 },
        { description: 'Plinthes', quantite: 20, unite: 'ml', prixUnitaire: 14, prixAchat: 6 },
        { description: 'Joints et nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'mosaique',
      nom: 'Mosaïque (SDB / piscine / hammam)',
      description: '~4 lignes | ~1 500 – 4 000 € HT | ~50% marge',
      prixMin: 1500,
      prixMax: 4000,
      margeCible: 50,
      lignes: [
        { description: 'Préparation support', quantite: 15, unite: 'm²', prixUnitaire: 15, prixAchat: 5 },
        { description: 'F&P mosaïque', quantite: 15, unite: 'm²', prixUnitaire: 85, prixAchat: 45 },
        { description: 'Joints époxy', quantite: 15, unite: 'm²', prixUnitaire: 22, prixAchat: 9 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 100, prixAchat: 35 },
      ]
    },
    {
      id: 'escalier',
      nom: 'Carrelage escalier',
      description: '~4 lignes | ~800 – 2 000 € HT | ~50% marge',
      prixMin: 800,
      prixMax: 2000,
      margeCible: 50,
      lignes: [
        { description: 'Préparation marches', quantite: 14, unite: 'u', prixUnitaire: 18, prixAchat: 6 },
        { description: 'F&P carrelage marches + contremarches', quantite: 14, unite: 'u', prixUnitaire: 65, prixAchat: 32 },
        { description: 'Nez de marche', quantite: 14, unite: 'u', prixUnitaire: 25, prixAchat: 10 },
        { description: 'Joints et nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 120, prixAchat: 40 },
      ]
    },
    {
      id: 'sol-souple',
      nom: 'Pose sol souple (vinyle / PVC / lino)',
      description: '~4 lignes | ~800 – 2 000 € HT | ~55% marge',
      prixMin: 800,
      prixMax: 2000,
      margeCible: 55,
      lignes: [
        { description: 'Ragréage', quantite: 30, unite: 'm²', prixUnitaire: 18, prixAchat: 8 },
        { description: 'F&P revêtement sol souple', quantite: 30, unite: 'm²', prixUnitaire: 35, prixAchat: 16 },
        { description: 'Plinthes', quantite: 25, unite: 'ml', prixUnitaire: 12, prixAchat: 5 },
        { description: 'Barres de seuil', quantite: 3, unite: 'u', prixUnitaire: 28, prixAchat: 11 },
      ]
    },
    {
      id: 'local-commercial',
      nom: 'Carrelage local commercial',
      description: '~5 lignes | ~2 000 – 6 000 € HT | ~50% marge',
      prixMin: 2000,
      prixMax: 6000,
      margeCible: 50,
      lignes: [
        { description: 'Préparation support', quantite: 50, unite: 'm²', prixUnitaire: 12, prixAchat: 4 },
        { description: 'F&P carrelage grand format', quantite: 50, unite: 'm²', prixUnitaire: 62, prixAchat: 30 },
        { description: 'Plinthes', quantite: 35, unite: 'ml', prixUnitaire: 14, prixAchat: 6 },
        { description: 'Joints', quantite: 1, unite: 'forfait', prixUnitaire: 200, prixAchat: 75 },
        { description: 'Nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 150, prixAchat: 50 },
      ]
    },
    {
      id: 'margelles-piscine',
      nom: 'Margelles et plages de piscine',
      description: '~4 lignes | ~2 000 – 6 000 € HT | ~45% marge',
      prixMin: 2000,
      prixMax: 6000,
      margeCible: 45,
      lignes: [
        { description: 'Préparation support', quantite: 30, unite: 'm²', prixUnitaire: 15, prixAchat: 6 },
        { description: 'F&P margelles', quantite: 20, unite: 'ml', prixUnitaire: 65, prixAchat: 35 },
        { description: 'F&P plage carrelée / pierre', quantite: 25, unite: 'm²', prixUnitaire: 72, prixAchat: 38 },
        { description: 'Joints et nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 250, prixAchat: 90 },
      ]
    },
    {
      id: 'reparation-partielle',
      nom: 'Réparation carrelage (remplacement partiel)',
      description: '~3 lignes | ~200 – 600 € HT | ~65% marge',
      prixMin: 200,
      prixMax: 600,
      margeCible: 65,
      lignes: [
        { description: 'Dépose carreaux cassés', quantite: 5, unite: 'u', prixUnitaire: 25, prixAchat: 8 },
        { description: 'Repose carreaux (fournis ou similaires)', quantite: 5, unite: 'u', prixUnitaire: 45, prixAchat: 18 },
        { description: 'Joints et nettoyage', quantite: 1, unite: 'forfait', prixUnitaire: 80, prixAchat: 25 },
      ]
    },
  ]
};
