/**
 * Nom et forme de l'entreprise tels qu'imprimés sur les devis, factures et avoirs.
 *
 * Entrepreneur individuel (EI, micro-entreprise) : son nom est « précédé ou suivi immédiatement des mots
 * “entrepreneur individuel” ou des initiales “EI” » sur ses documents (C. com. art. L526-22, loi n° 2022-172
 * du 14 févr. 2022 ; R526-26). Recette du 9 oct. 2026 : une micro-entreprise s'imprimait « Hugo Séguin —
 * Électricien » puis « Micro-entreprise », jamais « EI » ; la micro-entreprise est un régime, pas une forme.
 */

const INDIVIDUELLES = ['EI', 'Micro-entreprise', 'Auto-entrepreneur'];

const formeDe = (entreprise) => String(entreprise?.formeJuridique || entreprise?.forme_juridique || '').trim();

/** L'entreprise est une entreprise individuelle (EI, micro-entreprise). L'EIRL garde sa propre mention. */
export function estEntrepreneurIndividuel(entreprise) {
  return INDIVIDUELLES.includes(formeDe(entreprise));
}

/** Nom imprimé : suivi de « EI » pour un entrepreneur individuel, sauf s'il porte déjà la mention. */
export function nomImprime(entreprise) {
  const nom = String(entreprise?.nom || '').trim();
  if (!nom || !estEntrepreneurIndividuel(entreprise)) return nom;
  if (/(^|[\s(])EI($|[\s).,])|entrepreneur individuel/i.test(nom)) return nom;
  return `${nom} EI`;
}

/** Forme juridique imprimée (texte brut) : « Entrepreneur individuel (micro-entreprise) » plutôt que le régime seul. */
export function formeImprimee(entreprise) {
  const forme = formeDe(entreprise);
  if (forme === 'EI') return 'Entrepreneur individuel';
  if (forme === 'Micro-entreprise' || forme === 'Auto-entrepreneur') return 'Entrepreneur individuel (micro-entreprise)';
  return forme;
}
