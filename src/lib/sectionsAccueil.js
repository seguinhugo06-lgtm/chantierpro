/**
 * Sections de la page d'accueil et leur adresse partageable.
 *
 * Constat du 8 oct. 2026 : « la page Tarifs renvoie à l'accueil ». mallettico.fr/tarifs affichait
 * l'accueil sans descendre aux prix, et « Tarifs » ne faisait rien depuis une sous-page
 * (/fonctionnalites), qui n'a pas la section #pricing.
 */
const ADRESSE_DE_LA_SECTION = { '#pricing': '/tarifs', '#faq': '/faq' };
const SECTION_DE_L_ADRESSE = { '/tarifs': '#pricing', '/faq': '#faq' };

/** Section visée à l'arrivée sur l'accueil (« /tarifs », « /#faq »), ou null. */
export function sectionDemandee(chemin, ancre) {
  const parAdresse = SECTION_DE_L_ADRESSE[(chemin || '').replace(/\/+$/, '')];
  if (parAdresse) return parAdresse;
  return ancre && /^#[a-z][\w-]*$/i.test(ancre) ? ancre : null;
}

/**
 * Va à une section de l'accueil : défile si elle est sur la page, sinon ouvre l'accueil à cet
 * endroit (sous-pages marketing servies par main.jsx : navigation complète).
 */
export function allerALaSection(ancre, { doc = document, naviguer = (u) => window.location.assign(u) } = {}) {
  if (!/^#[a-z][\w-]*$/i.test(ancre || '')) return;
  const element = doc.querySelector(ancre);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  naviguer(ADRESSE_DE_LA_SECTION[ancre] || `/${ancre}`);
}
