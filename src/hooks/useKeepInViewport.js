import { useLayoutEffect } from 'react';

/**
 * Recale horizontalement un menu déroulant (position absolute) pour qu'il reste dans l'écran.
 *
 * Les menus sont ancrés à droite ou à gauche de leur bouton ; quand ce bouton change de place
 * (barre d'actions qui passe à la ligne sur téléphone, onglets qui débordent), le menu sort de
 * l'écran. Ce hook mesure le menu à l'ouverture et le décale du nécessaire, avant l'affichage.
 *
 * @param {React.RefObject<HTMLElement>} ref - le panneau du menu
 * @param {boolean} open - le menu est ouvert
 * @param {number} [marge=8] - distance minimale au bord de l'écran, en px
 */
export default function useKeepInViewport(ref, open, marge = 8) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    el.style.translate = '';
    const r = el.getBoundingClientRect();
    const largeur = document.documentElement.clientWidth;
    let dx = 0;
    if (r.right > largeur - marge) dx = largeur - marge - r.right;
    if (r.left + dx < marge) dx = marge - r.left;
    if (dx) el.style.translate = `${Math.round(dx)}px 0`;
  }, [ref, open, marge]);
}
