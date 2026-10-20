/**
 * DocumentEnGrand — la fenêtre « Voir le document en grand » de l'exemple du document : le même HTML (celui du
 * générateur de devis) dans un `<iframe srcdoc sandbox="">`, à l'échelle 1 et à la largeur d'une page A4 (794 px), pour
 * le lire au téléphone. Le document défile dans la fenêtre, horizontalement aussi si l'écran est plus étroit que la page.
 *
 * - Plein écran au téléphone, grande fenêtre centrée au bureau ; rendue dans `document.body` (un ancêtre animé
 *   enfermerait un élément `fixed`, règle « interface »).
 * - `role="dialog"`, `aria-modal`, titre ; le reste de la page devient inerte (`inert`) et ne défile plus ; le focus
 *   va au bouton « Fermer », reste dans la fenêtre (deux sentinelles le renvoient au début ou à la fin, même depuis le
 *   document) ; Échap, « Fermer » ou un clic sur le voile la ferment. Le parent rend le focus au bouton d'ouverture,
 *   dans les trois cas.
 * - Limite connue : le focus dans le document (cadre isolé, sans script), Échap n'arrive pas à la page ; Tab ressort
 *   vers « Fermer ».
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const LARGEUR_PAGE_A4 = 794;
export const ID_TITRE_DOCUMENT_EN_GRAND = 'document-en-grand-titre';

export default function DocumentEnGrand({ html, titre, titreDuCadre, onFermer }) {
  const voile = useRef(null);
  const boutonFermer = useRef(null);
  const cadre = useRef(null);
  const appuiSurVoile = useRef(false);
  const fermer = useRef(onFermer);
  fermer.current = onFermer;

  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const voisins = [...document.body.children].filter((el) => el !== voile.current && !el.hasAttribute('inert'));
    voisins.forEach((el) => el.setAttribute('inert', ''));
    boutonFermer.current?.focus();
    const echap = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      fermer.current?.();
    };
    document.addEventListener('keydown', echap);
    return () => {
      document.body.style.overflow = avant;
      voisins.forEach((el) => el.removeAttribute('inert'));
      document.removeEventListener('keydown', echap);
    };
  }, []);

  return createPortal(
    // Fermeture au `click` (pas au `mousedown`) : le clic est fini quand la fenêtre se ferme, le focus que le navigateur
    // pose au `mousedown` est déjà passé et le parent peut le rendre au bouton d'ouverture. Seul un clic commencé ET
    // fini sur le voile ferme (un glisser depuis le document jusqu'au voile ne ferme pas).
    <div
      ref={voile}
      data-document-en-grand=""
      onMouseDown={(e) => { appuiSurVoile.current = e.target === voile.current; }}
      onClick={(e) => { if (appuiSurVoile.current && e.target === voile.current) fermer.current?.(); }}
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-marque-encre-sombre/70 sm:items-center sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ID_TITRE_DOCUMENT_EN_GRAND}
        className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-[min(92vh,64rem)] sm:max-w-[54rem] sm:rounded-2xl sm:shadow-2xl"
      >
        {/* Sentinelle de début : Maj+Tab depuis « Fermer » repart vers le document. Focalisable, donc pas `aria-hidden`
            (un élément focalisable caché aux lecteurs d'écran est une faute) : elle ne garde le focus qu'un instant. */}
        <span tabIndex={0} data-sentinelle="" onFocus={() => cadre.current?.focus()} className="sr-only" />
        <div className="flex min-h-[64px] items-center gap-3 border-b border-marque-acier/60 bg-marque-glacier-1 px-4 py-2 sm:px-5">
          <h2 id={ID_TITRE_DOCUMENT_EN_GRAND} className="min-w-0 flex-1 text-base font-bold leading-snug text-marque-nuit">
            {titre}
          </h2>
          <button
            ref={boutonFermer}
            type="button"
            onClick={() => fermer.current?.()}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border-2 border-marque-nuit-2 bg-white px-4 text-base font-semibold text-marque-nuit-2 transition-colors hover:bg-marque-glacier-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2"
          >
            <X size={18} strokeWidth={2.2} aria-hidden="true" />
            Fermer
          </button>
        </div>
        <div data-defilement-document="" className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden bg-slate-100">
          <iframe
            ref={cadre}
            title={titreDuCadre}
            srcDoc={html}
            sandbox=""
            className="mx-auto block h-full border-0 bg-white shadow-[0_0_24px_-12px_rgba(13,46,108,0.4)]"
            style={{ width: LARGEUR_PAGE_A4 }}
          />
        </div>
        {/* Sentinelle de fin : Tab depuis le document revient à « Fermer » */}
        <span tabIndex={0} data-sentinelle="" onFocus={() => boutonFermer.current?.focus()} className="sr-only" />
      </div>
    </div>,
    document.body,
  );
}
