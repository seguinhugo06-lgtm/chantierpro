/**
 * SectionSite — bande pleine largeur du site public ; le contenu est centré (max-w-6xl) avec les marges communes.
 *
 * `fond` : 'blanc' | 'glacier' (bg glacier-1) | 'nuit' (bg nuit, texte blanc). Le site est toujours clair :
 * aucune variante ne suit le mode sombre de l'app. `className` est posé sur la bande ; `scroll-mt-20` est déjà
 * là pour qu'une ancre (`#pricing`, `#faq`) ne se cache pas sous la barre fixe du haut.
 */

const FONDS = {
  blanc: 'bg-white text-slate-900',
  glacier: 'bg-marque-glacier-1 text-slate-900',
  nuit: 'bg-marque-nuit text-white',
};

export function SectionSite({ id, fond = 'blanc', children, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-20 py-16 sm:py-24 ${FONDS[fond] || FONDS.blanc}${className ? ` ${className}` : ''}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">{children}</div>
    </section>
  );
}

export default SectionSite;
