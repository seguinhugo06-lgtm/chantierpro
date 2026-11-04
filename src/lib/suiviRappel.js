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
