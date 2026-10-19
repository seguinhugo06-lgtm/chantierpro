/**
 * SectionSite — bande pleine largeur du site public ; le contenu est centré (max-w-6xl) avec les marges communes.
 *
 * `fond` : 'blanc' | 'glacier' (bg glacier-1) | 'nuit' (bg nuit, texte blanc). Le site est toujours clair :
 * aucune variante ne suit le mode sombre de l'app. `className` est posé sur la bande ; `scroll-mt-20` est déjà
 * là pour qu'une ancre (`#pricing`, `#faq`) ne se cache pas sous la barre fixe du haut.
 * `decor` (ex. `<PlanArchitecte ton="nuit" />`) est posé sous le contenu, sur toute la largeur de la bande, qui
 * coupe alors ce qui dépasse. Pièges : une bande sans décor ne coupe rien, exprès : `overflow: hidden` casserait un
 * élément collant (`sticky`) qu'elle contient (le téléphone du cycle).
 */

const FONDS = {
  blanc: 'bg-white text-slate-900',
  glacier: 'bg-marque-glacier-1 text-slate-900',
  nuit: 'bg-marque-nuit text-white',
};

export function SectionSite({ id, fond = 'blanc', decor = null, children, className = '' }) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 py-16 sm:py-24 ${FONDS[fond] || FONDS.blanc}${decor ? ' relative overflow-hidden' : ''}${className ? ` ${className}` : ''}`}
    >
      {decor}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

export default SectionSite;
