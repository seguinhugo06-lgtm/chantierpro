/**
 * Règles de `create-invoice-payment`, sans import distant : testables sous vitest
 * (src/lib/__tests__/paiementFacture.test.js), câblées dans index.ts.
 */

/** Clé Stripe de test (mode test) : aucun argent réel ne circule. Toute autre valeur compte comme réelle. */
export function estCleDeTest(cle: unknown): boolean {
  return typeof cle === 'string' && /^(sk|rk)_test_/.test(cle);
}

/**
 * Compte de démonstration (D-26, migration 085) : une facture fictive ne se paie jamais pour de vrai,
 * seulement en mode test (carte 4242…), même si une clé réelle est enregistrée sur ce compte.
 * Le marqueur vient de la base (get_facture_for_payment, clé de service), pas du navigateur.
 */
export function refusFactureFictive(entreprise: { donnees_fictives?: unknown } | undefined, cleDeTest: boolean): string | null {
  const fictive = entreprise?.donnees_fictives === true || entreprise?.donnees_fictives === 'true';
  if (fictive && !cleDeTest) {
    return 'Compte de démonstration : seul un paiement de test est possible (clé Stripe de test).';
  }
  return null;
}
