/**
 * changementStatut — ce que l'artisan peut faire du statut d'un devis ou d'une facture, depuis la liste ou la fiche
 * (retours d'Hugo du 3 nov. 2026 : « pouvoir changer le statut directement sur envoyé ou payé sans être bloqué »).
 *
 * Avant : « Changer le statut » vivait seulement dans le menu « ⋯ » de la fiche et disparaissait dès qu'une facture
 * était envoyée (aucune transition) ; « Payée » n'y figurait jamais. Les règles tenues par la base restent :
 *   - une facture n'est « payée » que si ses encaissements la soldent (099) : « Payée » enregistre l'encaissement
 *     du reste dû (le flux « Encaisser »), la base fait le reste ;
 *   - « Envoyée » sur un brouillon de facture l'émet : numéro définitif, contenu figé (101, 102, 103) ;
 *   - un devis signé ne revient pas en arrière ; « Acompte facturé » et « Facturé » viennent des factures créées.
 */
import { statut } from './statuts';
import { statutFacture, resteAPayer } from './paiementsFacture';

// Devis : « vu » ne prouve rien (il s'affiche « Envoyé ») et n'est jamais proposé.
export const TRANSITIONS_DEVIS = {
  brouillon: ['envoye', 'refuse'],
  envoye: ['accepte', 'refuse'],
  vu: ['accepte', 'refuse'],
  // « Acompte facturé » et « Facturé » viennent des factures créées (recette du 9 oct. 2026) ; un devis signé ne
  // repasse pas en arrière
  accepte: [],
  signe: [],
  acompte_facture: [],
  facture: [],
  refuse: ['brouillon'],
};

/**
 * Les statuts proposés pour un document.
 * @param {object} doc devis ou facture
 * @param {Array} paiements encaissements connus
 * @param {{ peutModifier?: boolean, peutEnvoyer?: boolean }} droits canPerform('devis', 'edit' | 'send')
 * @returns {Array<{ cle: string, libelle: string, geste: 'statut'|'emettre'|'encaisser', reste?: number }>}
 *   geste « statut » : écrire le statut ; « emettre » : émettre la facture (confirmation) ; « encaisser » :
 *   enregistrer l'encaissement du reste dû
 */
export function choixDeStatut(doc, paiements = [], { peutModifier = false, peutEnvoyer = false } = {}) {
  if (!doc || !peutModifier) return [];
  // Un avoir a ses propres gestes (« Émettre », « Appliquer ») sur sa fiche
  if (doc.facture_type === 'avoir') return [];
  if (doc.type === 'facture') {
    const vu = statutFacture(doc, paiements);
    if (vu === 'brouillon') return peutEnvoyer ? [{ cle: 'envoye', libelle: statut('facture', 'envoye').libelle, geste: 'emettre' }] : [];
    if (vu === 'payee' || vu === 'annulee') return [];
    const reste = Math.round(resteAPayer(doc, paiements) * 100) / 100;
    return reste > 0.005 ? [{ cle: 'payee', libelle: statut('facture', 'payee').libelle, geste: 'encaisser', reste }] : [];
  }
  return (TRANSITIONS_DEVIS[doc.statut] || [])
    .filter((cle) => cle !== 'envoye' || peutEnvoyer)
    .map((cle) => ({ cle, libelle: statut('devis', cle).libelle, geste: 'statut' }));
}
