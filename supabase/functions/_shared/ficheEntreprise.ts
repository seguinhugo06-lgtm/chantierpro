/**
 * Quelle fiche entreprise présenter pour une pièce (devis, facture) : la même règle que les pages publiques
 * (get_facture_for_payment et get_devis_for_signature, migration 106). Sans import distant : testable sous vitest
 * (src/lib/__tests__/ficheEntrepriseServeur.test.js).
 *
 * - Organisation « sûre » : celle de la pièce, seulement si son auteur en est membre (les identifiants d'une pièce
 *   écrite avant la migration 084 ne sont pas sûrs).
 * - Candidates : les fiches de cette organisation dont l'auteur est membre, et celles de l'auteur de la pièce.
 * - Ordre : une fiche de l'organisation d'abord (la pièce d'un salarié montre l'entreprise, pas sa fiche
 *   personnelle), puis celle que la pièce désigne, une non archivée, celle par défaut, la plus ancienne.
 */

export interface FicheCandidate {
  id: string;
  user_id?: string | null;
  organization_id?: string | null;
  is_default?: boolean | null;
  archived_at?: string | null;
  created_at?: string | null;
  [champ: string]: unknown;
}

export interface Piece {
  user_id: string;
  organization_id?: string | null;
  entreprise_id?: string | null;
}

/** L'organisation de la pièce si son auteur en est membre, sinon null. */
export function organisationSure(piece: Piece, membres: readonly string[]): string | null {
  return piece.organization_id && membres.includes(piece.user_id) ? piece.organization_id : null;
}

export function choisirFicheEntreprise<F extends FicheCandidate>(
  fiches: readonly F[],
  piece: Piece,
  membres: readonly string[],
): F | null {
  const org = organisationSure(piece, membres);
  const deLOrganisation = (f: F) => org !== null && f.organization_id === org && !!f.user_id && membres.includes(f.user_id);
  const candidates = fiches.filter((f) => deLOrganisation(f) || f.user_id === piece.user_id);
  const rang = (f: F) => [
    deLOrganisation(f) ? 0 : 1,
    f.id === piece.entreprise_id ? 0 : 1,
    f.archived_at ? 1 : 0,
    f.is_default ? 0 : 1,
  ];
  return [...candidates].sort((a, b) => {
    const ra = rang(a);
    const rb = rang(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  })[0] ?? null;
}
