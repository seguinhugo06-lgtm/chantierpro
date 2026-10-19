/**
 * Cadres des captures du site public : une capture d'écran de l'application dans un cadre de navigateur
 * (ordinateur) ou de téléphone. `largeur` et `hauteur` sont celles de l'image (réserve la place, pas de
 * saut de mise en page) ; `prioritaire` pour l'image du premier écran (chargée tout de suite, sinon paresseuse).
 * `className` règle l'encombrement du cadre (ex. `max-w-xs`).
 * (React 18 ne connaît pas `fetchPriority` : l'attribut s'écrit en minuscules.)
 */

function Capture({ src, alt, largeur, hauteur, prioritaire }) {
  return (
    <img
      src={src}
      alt={alt}
      width={largeur}
      height={hauteur}
      loading={prioritaire ? 'eager' : 'lazy'}
      fetchpriority={prioritaire ? 'high' : undefined}
      decoding="async"
      className="block w-full h-auto"
    />
  );
}

export function CadreOrdi({ src, alt, largeur, hauteur, prioritaire = false, className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-marque-acier bg-white shadow-xl shadow-marque-nuit/15${className ? ` ${className}` : ''}`}
    >
      <div aria-hidden="true" className="flex h-9 items-center gap-1.5 border-b border-marque-acier bg-marque-glacier-2 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-marque-acier" />
        <span className="h-2.5 w-2.5 rounded-full bg-marque-acier" />
        <span className="h-2.5 w-2.5 rounded-full bg-marque-acier" />
      </div>
      <Capture src={src} alt={alt} largeur={largeur} hauteur={hauteur} prioritaire={prioritaire} />
    </div>
  );
}

export function CadreTel({ src, alt, largeur, hauteur, prioritaire = false, className = '' }) {
  return (
    <div
      className={`mx-auto w-full overflow-hidden rounded-[2.25rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl shadow-marque-nuit/20${className ? ` ${className}` : ''}`}
    >
      <div className="overflow-hidden rounded-[1.625rem] bg-white">
        <Capture src={src} alt={alt} largeur={largeur} hauteur={hauteur} prioritaire={prioritaire} />
      </div>
    </div>
  );
}
