/**
 * Carte — la surface unique de l'app (refonte du 9 oct. 2026) : fond surface, bord, arrondi 16 px,
 * élévation posée. Ni liseré coloré, ni cercle décoratif, ni dégradé.
 *
 * @param {'div'|'section'|'article'|'button'|'li'} [as]
 * @param {'normal'|'aucun'|'large'} [marge] padding intérieur : p-4 sm:p-5 · 0 · p-6
 * @param {boolean} [interactive] la carte entière est cliquable (survol, appui)
 */
const MARGES = { normal: 'p-4 sm:p-5', aucun: '', large: 'p-6' };

export default function Carte({ as: Element = 'div', marge = 'normal', interactive = false, className = '', children, ...reste }) {
  const estBouton = Element === 'button';
  return (
    <Element
      data-ui="Carte"
      {...(estBouton ? { type: 'button' } : {})}
      className={`block bg-surface border border-bord rounded-2xl shadow-e1 ${MARGES[marge] ?? MARGES.normal} ${
        interactive || estBouton ? 'w-full text-left transition-colors hover:border-bord-fort active:bg-surface-2 cursor-pointer' : ''
      } ${className}`}
      {...reste}
    >
      {children}
    </Element>
  );
}
