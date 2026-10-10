/**
 * La signature du client, telle que la fiche et les deux générateurs de PDF l'affichent.
 *
 * Deux chemins l'enregistrent dans des colonnes différentes : la signature sur place (`signature`,
 * `signataire`) et la signature à distance par le lien (`signature_data`, `signataire_nom`, fonction
 * `sign_devis`). Recette du 9 oct. 2026 : l'app ne relisait que la première paire, si bien qu'un devis signé
 * à distance ne montrait à l'artisan ni le signataire, ni la date, ni le tracé ; et l'aperçu qu'il imprime
 * n'affichait jamais le tracé.
 */

/** Seule une image encodée (tracé du pavé de signature) s'imprime ; « signed » ou un lien ne sont pas un tracé. */
const estImage = (valeur) => typeof valeur === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(valeur);

/**
 * @returns {null | { image: string|null, nom: string, date: string|null }} null si le document n'est pas signé.
 */
export function signatureDuClient(doc) {
  const brute = doc?.signature_data || doc?.signature || null;
  if (!brute) return null;
  return {
    image: estImage(brute) ? brute : null,
    nom: String(doc?.signataire_nom || doc?.signataire || '').trim(),
    date: doc?.signature_date || doc?.signatureDate || null,
  };
}
