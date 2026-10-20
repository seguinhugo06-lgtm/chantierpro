import { useEffect } from 'react';

/**
 * Tant qu'une page du site est affichée, le défilement réserve la place de la barre fixe du haut (64 px) et un peu
 * d'air : `scroll-padding-top: 5rem` sur `<html>`. Un élément atteint au clavier (Tab, Maj+Tab) n'est plus amené SOUS la
 * barre, où il était focalisé mais invisible (WCAG 2.4.11, relecture DA-10). Les sections (`SectionSite`) retirent 1rem
 * (`-scroll-mt-4`) : une ancre (`/tarifs`, `#faq`) arrive juste sous la barre, sans bande de la section précédente.
 * Posé par un effet et retiré au démontage : `<html>` est partagé avec l'application.
 */
export function useDefilementSousLaBarre() {
  useEffect(() => {
    const racine = document.documentElement;
    const avant = racine.style.scrollPaddingTop;
    racine.style.scrollPaddingTop = '5rem';
    return () => { racine.style.scrollPaddingTop = avant; };
  }, []);
}

export default useDefilementSousLaBarre;
