/**
 * Marge brute d'un article du catalogue et son niveau : UNE définition pour la liste, la fiche, le formulaire, les packs et le
 * sélecteur du référentiel (avant : une fonction dans Catalogue.jsx, des seuils recopiés dans ArticlePicker.jsx, cinq couleurs
 * dont du violet et de l'orange).
 *
 * Le niveau n'a que trois tons — il ne décore pas : succès (de 40 % : une bonne marge), neutre (de 25 % : correcte), alerte
 * (en dessous, ou négative : à surveiller). Le rouge reste celui du retard, jamais d'une marge (décision du 26 oct. 2026).
 */

/** Marge brute en % du prix de vente ; `null` sans prix de vente ou sans prix d'achat renseigné ; 100 pour un achat à 0 (main d'œuvre). */
export function margeBrute(prix, prixAchat) {
  const vente = parseFloat(prix) || 0;
  const achat = parseFloat(prixAchat);
  if (vente === 0) return null;
  if (Number.isNaN(achat)) return null;
  if (achat === 0) return 100;
  return ((vente - achat) / vente) * 100;
}

/** @returns {{ libelle: string, ton: 'succes'|'neutre'|'alerte' }} */
export function niveauMarge(marge) {
  if (marge === null || marge === undefined || Number.isNaN(marge)) return { libelle: '—', ton: 'neutre' };
  if (marge >= 60) return { libelle: 'Excellente', ton: 'succes' };
  if (marge >= 40) return { libelle: 'Bonne', ton: 'succes' };
  if (marge >= 25) return { libelle: 'Correcte', ton: 'neutre' };
  if (marge >= 0) return { libelle: 'Faible', ton: 'alerte' };
  return { libelle: 'Négative', ton: 'alerte' };
}

/** Classes de texte et de remplissage d'un ton (jetons du thème). */
export const CLASSES_TON_MARGE = {
  succes: { texte: 'text-succes-texte', fond: 'bg-succes-point' },
  neutre: { texte: 'text-encre-2', fond: 'bg-neutre-point' },
  alerte: { texte: 'text-alerte-texte', fond: 'bg-alerte-point' },
};
