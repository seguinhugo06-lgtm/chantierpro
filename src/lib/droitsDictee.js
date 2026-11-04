/**
 * Qui peut dicter, et ce que la relecture montre (relecture de code et gardien du 3 nov. 2026).
 * - Dicter prépare un devis : il faut la page « ia-devis » ET le droit de créer un devis (owner, admin, comptable),
 *   comme la base (reserver_usage_ia, migration 107 : SANS_DROIT sinon).
 * - Les montants de la relecture suivent canViewPrices (liste blanche de src/lib/permissions.js).
 * @param {{ canAccess: (page: string) => boolean, canPerform: (entite: string, action: string) => boolean, canViewPrices: boolean }} p
 */
export function droitsDictee({ canAccess, canPerform, canViewPrices } = {}) {
  const peutCreerDevis = !!canPerform?.('devis', 'create');
  return {
    peutDicter: !!canAccess?.('ia-devis') && peutCreerDevis,
    peutSaisirAMain: peutCreerDevis,
    voitPrix: canViewPrices === true,
  };
}
