/**
 * Modes d'un paiement reçu (« Encaisser ») et leur libellé à l'écran. Une seule liste pour la fenêtre d'encaissement et
 * pour les paiements de la fiche facture : avant (relecture de la Task 4, 24 oct. 2026), « Prélèvement » choisi à
 * l'encaissement s'affichait « prelevement » sur la fiche et dans le reçu envoyé au client.
 * Le reçu (src/lib/emailSender.js, LIBELLES_MODE_RECU) a ses libellés en phrase (« par virement bancaire ») :
 * le test src/lib/__tests__/modesPaiement.test.js vérifie que chaque mode en a un.
 */
export const MODES_PAIEMENT = [
  { valeur: 'virement', libelle: 'Virement' },
  { valeur: 'cheque', libelle: 'Chèque' },
  { valeur: 'especes', libelle: 'Espèces' },
  { valeur: 'cb', libelle: 'Carte' },
  { valeur: 'prelevement', libelle: 'Prélèvement' },
  { valeur: 'autre', libelle: 'Autre' },
];

// Valeurs anciennes ou d'autres écrans (carte = cb)
const ALIAS = { carte: 'cb' };

/** Libellé d'un mode enregistré ; un mode inconnu reste tel quel, une absence vaut « Virement » (ancien défaut). */
export function libelleModePaiement(mode) {
  const valeur = ALIAS[mode] || mode || 'virement';
  return MODES_PAIEMENT.find((m) => m.valeur === valeur)?.libelle || String(mode);
}
