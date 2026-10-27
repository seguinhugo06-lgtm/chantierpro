/**
 * Réglages de la trésorerie : une seule source pour leurs valeurs par défaut.
 *
 * `SEUIL_PAR_DEFAUT` : le seuil d'alerte enregistré pour un compte qui ne l'a jamais réglé (réglages de démonstration,
 * `useTresorerie`, colonne `seuil_alerte` de la base). Il compte comme « non réglé » à l'affichage (`seuilAlerteRegle`,
 * src/lib/previsions.js, décision du 20 oct. 2026, sans migration).
 */
export const SEUIL_PAR_DEFAUT = 5000;
