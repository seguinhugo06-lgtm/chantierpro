import { useEffect, useState } from 'react';

/**
 * Cadres des captures du site public : une capture d'écran de l'application dans un cadre de navigateur
 * (ordinateur) ou de téléphone. `largeur` et `hauteur` sont celles de l'image (réserve la place, pas de
 * saut de mise en page) ; `prioritaire` pour une image du premier écran (chargée tout de suite, sinon paresseuse) ;
 * `premiere` pour LA première image visible de la page (`fetchpriority="high"`).
 * `className` règle l'encombrement du cadre (ex. `max-w-xs`).
 * (React 18 ne connaît pas `fetchPriority` : l'attribut s'écrit en minuscules.)
 */

function Capture({ src, alt, largeur, hauteur, prioritaire, premiere }) {
  return (
    <img
      src={src}
      alt={alt}
      width={largeur}
      height={hauteur}
      loading={prioritaire || premiere ? 'eager' : 'lazy'}
      fetchpriority={premiere ? 'high' : undefined}
      decoding="async"
      className="block w-full h-auto"
    />
  );
}

export function CadreOrdi({ src, alt, largeur, hauteur, prioritaire = false, premiere = false, className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-marque-acier bg-white shadow-xl shadow-marque-nuit/15${className ? ` ${className}` : ''}`}
    >
      <div aria-hidden="true" className="flex h-9 items-center gap-1.5 border-b border-marque-acier bg-marque-glacier-2 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-marque-acier" />
        <span className="h-2.5 w-2.5 rounded-full bg-marque-acier" />
        <span className="h-2.5 w-2.5 rounded-full bg-marque-acier" />
      </div>
      <Capture src={src} alt={alt} largeur={largeur} hauteur={hauteur} prioritaire={prioritaire} premiere={premiere} />
    </div>
  );
}

export function CadreTel({ src, alt, largeur, hauteur, prioritaire = false, premiere = false, className = '' }) {
  return (
    <div
      className={`mx-auto w-full overflow-hidden rounded-[2.25rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl shadow-marque-nuit/20${className ? ` ${className}` : ''}`}
    >
      <div className="overflow-hidden rounded-[1.625rem] bg-white">
        <Capture src={src} alt={alt} largeur={largeur} hauteur={hauteur} prioritaire={prioritaire} premiere={premiere} />
      </div>
    </div>
  );
}

const REQUETE_TELEPHONE = '(max-width: 639px)';

/**
 * Vrai sur un écran de téléphone (moins de 640 px de large, le point `sm` de Tailwind), suivi en direct (rotation,
 * fenêtre redimensionnée). Lu dès le premier rendu : une seule image est demandée, la bonne.
 */
export function useEcranTelephone() {
  const lire = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REQUETE_TELEPHONE).matches;
  const [telephone, setTelephone] = useState(lire);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const requete = window.matchMedia(REQUETE_TELEPHONE);
    const suivre = () => setTelephone(requete.matches);
    suivre();
    requete.addEventListener?.('change', suivre);
    return () => requete.removeEventListener?.('change', suivre);
  }, []);
  return telephone;
}

/**
 * CadreCapture — une capture de `featuresContent.js` (`CAPTURES`) dans le bon cadre :
 *   - capture de téléphone (`telephone: true`) : cadre de téléphone ;
 *   - capture d'ordinateur avec sa version téléphone (`mobile`) : au téléphone, la version téléphone dans un cadre de
 *     téléphone (une capture d'ordinateur réduite à 340 px ne se lit plus : texte de 3 px) ; ailleurs, l'ordinateur ;
 *   - sinon le cadre de navigateur.
 * `recadree` : sur ordinateur, la vignette recadrée (`vignette` : la zone utile, sans la barre latérale) quand la
 * capture en a une. `classeTel` / `classeOrdi` : l'encombrement de chaque cadre. `prioritaire`, `premiere` : voir plus
 * haut.
 */
export function CadreCapture({ capture, recadree = false, prioritaire = false, premiere = false, classeTel = '', classeOrdi = '' }) {
  const telephone = useEcranTelephone();
  const vue = capture.telephone ? capture : telephone && capture.mobile ? capture.mobile : null;
  if (vue) {
    return (
      <CadreTel src={vue.src} alt={vue.alt} largeur={vue.largeur} hauteur={vue.hauteur} prioritaire={prioritaire} premiere={premiere} className={classeTel} />
    );
  }
  const ordi = recadree && capture.vignette ? capture.vignette : capture;
  return (
    <CadreOrdi src={ordi.src} alt={capture.alt} largeur={ordi.largeur} hauteur={ordi.hauteur} prioritaire={prioritaire} premiere={premiere} className={classeOrdi} />
  );
}
