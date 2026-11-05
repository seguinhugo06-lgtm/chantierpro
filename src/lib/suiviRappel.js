/**
 * Noter (ou annuler) un rappel fait à la main, sans faux succès : l'écran ne passe à « Rappel noté » qu'une fois
 * l'écriture faite. `suivre` renvoie false en cas d'échec (suivreRamonage / suivreEntretien, DataContext) ; la carte
 * garde alors son état (relecture du 4 nov. 2026, point 8).
 * @returns {Promise<boolean>} true si l'écran a changé
 */
export async function suivreAvecEtat(suivre, id, suivi, setFait, valeur) {
  const ok = await suivre(id, suivi);
  if (ok === false) return false;
  setFait(valeur);
  return true;
}

// ── Un refus vaut pour tous les rappels (D-38, décision 3) ────────────────────────────────────────────────────────
// Le refus est une seule date sur la fiche du client (clients.rappels_refuses_le), posée par le lien de n'importe quel
// rappel : ramonage et entretien en dépendent tous les deux. Les écrans des deux modules le disent des mêmes mots.
/** Confirmation de « Ne plus rappeler » (irréversible). */
export const messageNePlusRappeler = (nom) => `${nom} ne recevra plus aucun rappel, ni de ramonage ni d’entretien (ni SMS proposé, ni e-mail automatique). Ce refus ne s’annule pas.`;
/** La ligne de la fiche d'un client qui a refusé. `jour` : la date déjà écrite en toutes lettres. */
export const noteRefusRappels = (jour) => `Ce client a refusé les rappels le ${jour} (ramonage et entretien).`;
/** Sous la case « Le client refuse les rappels » de la saisie. */
export const AIDE_REFUS_RAPPELS = 'Noté sur sa fiche : ni e-mail automatique, ni SMS proposé, pour aucun rappel (ramonage et entretien).';
