import { useEffect, useState } from 'react';

/**
 * Vrai quand l'élément de `ref` est à l'écran (au moins la part `seuil` de sa surface) ET que l'onglet est
 * affiché. Les boucles du site (devis vivant, compteur et barre de la fiabilité) ne tournent qu'à cette
 * condition (spec, « Mouvement et accessibilité ») : IntersectionObserver et `visibilitychange`.
 * Sans IntersectionObserver (vieux navigateur), l'élément est tenu pour visible.
 * `observer: false` (mouvement réduit : la boucle ne tourne pas) : aucun observateur n'est créé, la valeur reste fausse.
 */
export function useALEcran(ref, seuil = 0, { observer = true } = {}) {
  const [visible, setVisible] = useState(false);
  const [ongletAffiche, setOngletAffiche] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );

  useEffect(() => {
    const element = ref.current;
    if (!observer) {
      setVisible(false);
      return undefined;
    }
    if (!element || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observateur = new IntersectionObserver(
      ([entree]) => setVisible(entree.isIntersecting && entree.intersectionRatio >= seuil),
      { threshold: seuil > 0 ? [0, seuil] : [0] },
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [ref, seuil, observer]);

  useEffect(() => {
    const suivre = () => setOngletAffiche(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', suivre);
    return () => document.removeEventListener('visibilitychange', suivre);
  }, []);

  return visible && ongletAffiche;
}

export default useALEcran;
