/**
 * Index des modèles de devis - Combine tous les métiers (~308 modèles)
 */

import { PLOMBERIE_MODELES } from './plomberie';
import { ELECTRICITE_MODELES } from './electricite';
import { MACONNERIE_MODELES } from './maconnerie';
import { PEINTURE_MODELES } from './peinture';
import { MENUISERIE_MODELES } from './menuiserie';
import { CARRELAGE_MODELES } from './carrelage';
import { CHAUFFAGE_MODELES } from './chauffage';
import {
  COUVERTURE_MODELES,
  ISOLATION_MODELES,
  TERRASSEMENT_MODELES,
  SERRURERIE_MODELES,
  VITRERIE_MODELES,
  PAYSAGISME_MODELES,
  ETANCHEITE_MODELES,
  DEMOLITION_MODELES,
  CHARPENTE_MODELES,
  PLATRERIE_MODELES,
} from './autres-metiers';

// ── Nouvelles catégories (12) ────────────────────────────────────────────────
import { RAMONAGE_MODELES } from './ramonage';
import { ASSAINISSEMENT_MODELES } from './assainissement';
import { DOMOTIQUE_MODELES } from './domotique';
import { SOLS_SOUPLES_MODELES } from './sols-souples';
import { RAVALEMENT_MODELES } from './ravalement';
import { PISCINE_MODELES } from './piscine';
import { METALLERIE_MODELES } from './metallerie';
import { FERMETURES_MODELES } from './fermetures';
import { NETTOYAGE_MODELES } from './nettoyage';
import { CUISINE_MODELES } from './cuisine';
import { RENOVATION_ENERGETIQUE_MODELES } from './renovation-energetique';
import { IRVE_SOLAIRE_MODELES } from './irve-solaire';

/**
 * Tous les modèles de devis par métier
 */
export const MODELES_DEVIS = {
  // ── Métiers existants (17) ──
  plomberie: PLOMBERIE_MODELES,
  electricite: ELECTRICITE_MODELES,
  maconnerie: MACONNERIE_MODELES,
  peinture: PEINTURE_MODELES,
  menuiserie: MENUISERIE_MODELES,
  carrelage: CARRELAGE_MODELES,
  chauffage: CHAUFFAGE_MODELES,
  couverture: COUVERTURE_MODELES,
  isolation: ISOLATION_MODELES,
  terrassement: TERRASSEMENT_MODELES,
  serrurerie: SERRURERIE_MODELES,
  vitrerie: VITRERIE_MODELES,
  paysagisme: PAYSAGISME_MODELES,
  etancheite: ETANCHEITE_MODELES,
  demolition: DEMOLITION_MODELES,
  charpente: CHARPENTE_MODELES,
  platrerie: PLATRERIE_MODELES,
  // ── Nouveaux métiers (12) ──
  ramonage: RAMONAGE_MODELES,
  assainissement: ASSAINISSEMENT_MODELES,
  domotique: DOMOTIQUE_MODELES,
  'sols-souples': SOLS_SOUPLES_MODELES,
  ravalement: RAVALEMENT_MODELES,
  piscine: PISCINE_MODELES,
  metallerie: METALLERIE_MODELES,
  fermetures: FERMETURES_MODELES,
  nettoyage: NETTOYAGE_MODELES,
  cuisine: CUISINE_MODELES,
  'renovation-energetique': RENOVATION_ENERGETIQUE_MODELES,
  'irve-solaire': IRVE_SOLAIRE_MODELES,
};

/**
 * Obtenir tous les métiers avec leurs modèles
 */
export function getMetiersWithModeles() {
  return Object.entries(MODELES_DEVIS).map(([id, metier]) => ({
    id,
    ...metier,
    modelesCount: metier.modeles.length,
  }));
}

/**
 * Obtenir les modèles d'un métier
 */
export function getModelesByMetier(metierId) {
  const metier = MODELES_DEVIS[metierId];
  if (!metier) return [];
  return metier.modeles;
}

/**
 * Obtenir un modèle spécifique
 */
export function getModele(metierId, modeleId) {
  const metier = MODELES_DEVIS[metierId];
  if (!metier) return null;
  return metier.modeles.find(m => m.id === modeleId);
}

/**
 * Préparer les lignes d'un modèle pour le formulaire de devis
 */
export function prepareModeleLignes(modele, tvaDefaut = 10) {
  // Un modèle peut imposer son taux (`modele.tva`) quand le taux de l'entreprise serait faux pour ces travaux : chaudière
  // gaz ou fioul à 20 % depuis le 1er mars 2025, même dans un logement de plus de deux ans (CGI 279-0 bis, 2 bis, c ;
  // CGI 278-0 bis A, III bis ; BOI-TVA-LIQ-30-20-90-20 § 200 ; relu au texte le 3 nov. 2026, D-32). Une entreprise en franchise repasse ensuite les lignes à 0 % (`sansTva`).
  // Une ligne peut imposer le sien (`ligne.tva`) : fourniture d'une climatisation à 20 % (CGI 279-0 bis, 1), la pose
  // restant au taux de l'entreprise (juriste-btp, 4 nov. 2026 ; choix d'Hugo du 5 nov. 2026, D-41).
  const taux = Number.isFinite(modele.tva) ? modele.tva : tvaDefaut;
  return modele.lignes.map((ligne, index) => ({
    id: `ligne-${Date.now()}-${index}`,
    description: ligne.description,
    quantite: ligne.quantite,
    unite: ligne.unite,
    prixUnitaire: ligne.prixUnitaire,
    prixAchat: ligne.prixAchat,
    tva: Number.isFinite(ligne.tva) ? ligne.tva : taux,
    total: ligne.quantite * ligne.prixUnitaire,
  }));
}

/**
 * Calculer le total d'un modèle
 */
export function calculateModeleTotal(modele) {
  return modele.lignes.reduce((sum, ligne) => sum + (ligne.quantite * ligne.prixUnitaire), 0);
}

/**
 * Calculer la marge d'un modèle
 */
export function calculateModeleMarge(modele) {
  const totalVente = modele.lignes.reduce((sum, ligne) => sum + (ligne.quantite * ligne.prixUnitaire), 0);
  const totalAchat = modele.lignes.reduce((sum, ligne) => sum + (ligne.quantite * ligne.prixAchat), 0);
  if (totalVente === 0) return 0;
  return Math.round(((totalVente - totalAchat) / totalVente) * 100);
}

/**
 * Rechercher des modèles par nom ou description
 */
export function searchModeles(query) {
  const results = [];
  const searchLower = query.toLowerCase();

  Object.entries(MODELES_DEVIS).forEach(([metierId, metier]) => {
    metier.modeles.forEach(modele => {
      if (
        modele.nom.toLowerCase().includes(searchLower) ||
        modele.description.toLowerCase().includes(searchLower)
      ) {
        results.push({
          ...modele,
          metierId,
          metierNom: metier.nom,
          metierIcon: metier.icon,
        });
      }
    });
  });

  return results;
}

/**
 * Obtenir le nombre total de modèles
 */
export function getTotalModelesCount() {
  return Object.values(MODELES_DEVIS).reduce(
    (sum, metier) => sum + metier.modeles.length,
    0
  );
}

export default MODELES_DEVIS;
