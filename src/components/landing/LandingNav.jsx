/**
 * LandingNav — la barre fixe du site public (accueil et sous-pages marketing), charte « Glacier vif ».
 *
 * Bureau : logo, liens vers les sections, « Connexion » (texte exact : cliqué par `scripts/parcours/reel.cjs`) et
 * la pilule « Créer mon compte ». Téléphone : logo, « Connexion » et le menu (liens + « Créer mon compte ») ;
 * menu ouvert, la page derrière est inerte et Échap le ferme.
 * Les liens visent les sections de l'accueil ; depuis une sous-page, `allerALaSection` ouvre l'accueil au bon
 * endroit. Le flou est posé sur un calque (`absolute inset-0`), pas sur la barre : sinon le voile `fixed` du menu
 * serait enfermé dans la barre (règle « interface »).
 */
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { allerALaSection } from '../../lib/sectionsAccueil';
import BoutonSite from './site/BoutonSite';

const LIENS = [
  { libelle: 'Métiers', ancre: '#metiers' },
  // Mène au cycle au défilement en attendant la section « Les fonctionnalités en action » (`#fonctionnalites`,
  // Task 5b de la refonte), qui prendra ce lien.
  { libelle: 'Fonctionnalités', ancre: '#parcours' },
  { libelle: 'Fiabilité', ancre: '#fiabilite' },
  { libelle: 'Tarifs', ancre: '#pricing' },
  { libelle: 'FAQ', ancre: '#faq' },
];

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

export default function LandingNav({ onLogin, onSignup }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const entete = useRef(null);
  const boutonMenu = useRef(null);

  // Menu ouvert :
  // - la page derrière devient inerte (`inert` sur les voisins de la barre) : le clavier et le lecteur d'écran
  //   restent dans la barre et le menu ;
  // - elle ne défile plus (un doigt sur le voile ferait filer le contenu) ;
  // - Échap le ferme et rend le focus au bouton ; passer au format bureau (tablette tournée) le ferme aussi,
  //   sinon la page resterait inerte sans bouton pour fermer.
  useEffect(() => {
    if (!menuOuvert) return undefined;
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const parent = entete.current?.parentElement;
    const voisins = parent ? [...parent.children].filter((el) => el !== entete.current && !el.hasAttribute('inert')) : [];
    voisins.forEach((el) => el.setAttribute('inert', ''));
    const echap = (e) => {
      if (e.key !== 'Escape') return;
      setMenuOuvert(false);
      boutonMenu.current?.focus();
    };
    const bureau = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)') : null;
    const auBureau = (e) => { if (e.matches) setMenuOuvert(false); };
    document.addEventListener('keydown', echap);
    bureau?.addEventListener?.('change', auBureau);
    return () => {
      document.body.style.overflow = avant;
      voisins.forEach((el) => el.removeAttribute('inert'));
      document.removeEventListener('keydown', echap);
      bureau?.removeEventListener?.('change', auBureau);
    };
  }, [menuOuvert]);

  const aller = (e, ancre) => {
    e.preventDefault();
    if (!menuOuvert) {
      allerALaSection(ancre);
      return;
    }
    // Le menu se ferme d'abord : la page doit pouvoir défiler de nouveau.
    setMenuOuvert(false);
    setTimeout(() => allerALaSection(ancre), 60);
  };

  return (
    <header ref={entete} className="fixed inset-x-0 top-0 z-50">
      <div aria-hidden="true" className="absolute inset-0 border-b border-marque-acier/60 bg-white/90 backdrop-blur-md backdrop-saturate-150" />

      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:gap-6">
        <a href="/" className={`-ml-1 flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-xl px-1 ${FOCUS}`}>
          <img src="/icon.svg" alt="" width="34" height="34" className="h-[34px] w-[34px]" />
          <span className="text-lg font-extrabold tracking-tight text-marque-nuit">Mallettico</span>
        </a>

        <nav aria-label="Sections du site" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {LIENS.map((lien) => (
              <li key={lien.ancre}>
                <a
                  href={`/${lien.ancre}`}
                  onClick={(e) => aller(e, lien.ancre)}
                  className={`flex min-h-[44px] items-center rounded-full px-3 text-[15px] font-medium text-slate-600 transition-colors hover:text-marque-nuit ${FOCUS}`}
                >
                  {lien.libelle}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <button
            type="button"
            onClick={onLogin}
            className={`min-h-[44px] rounded-full px-3 text-base font-semibold text-marque-nuit-2 transition-colors hover:bg-marque-glacier-2 ${FOCUS}`}
          >
            Connexion
          </button>
          <BoutonSite variante="plein" onClick={onSignup} className="hidden sm:inline-flex">
            Créer mon compte
          </BoutonSite>
          <button
            ref={boutonMenu}
            type="button"
            onClick={() => setMenuOuvert((o) => !o)}
            aria-expanded={menuOuvert}
            aria-controls="menu-site"
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            className={`flex h-11 w-11 items-center justify-center rounded-full text-marque-nuit transition-colors hover:bg-marque-glacier-2 lg:hidden ${FOCUS}`}
          >
            {menuOuvert ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOuvert && (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 top-16 bg-marque-encre-sombre/30 lg:hidden"
          onClick={() => setMenuOuvert(false)}
        />
      )}
      {/* Toujours rendu (caché quand il est fermé) : aria-controls du bouton désigne un élément qui existe. */}
      <nav
        id="menu-site"
        aria-label="Menu"
        hidden={!menuOuvert}
        className="relative border-b border-marque-acier/60 bg-white shadow-lg lg:hidden"
      >
        <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
          {LIENS.map((lien) => (
            <li key={lien.ancre}>
              <a
                href={`/${lien.ancre}`}
                onClick={(e) => aller(e, lien.ancre)}
                className={`flex min-h-[48px] items-center rounded-xl px-3 text-base font-medium text-marque-nuit hover:bg-marque-glacier-1 ${FOCUS}`}
              >
                {lien.libelle}
              </a>
            </li>
          ))}
        </ul>
        <div className="mx-auto max-w-6xl border-t border-marque-acier/60 px-4 pb-4 pt-3 sm:hidden">
          <BoutonSite variante="plein" onClick={() => { setMenuOuvert(false); onSignup(); }} className="w-full">
            Créer mon compte
          </BoutonSite>
        </div>
      </nav>
    </header>
  );
}
