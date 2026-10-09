/**
 * Quand appliquer une nouvelle version de l'appli sans jamais couper une saisie.
 *
 * Constat du 9 oct. 2026 : en mode « autoUpdate », la page se rechargeait d'un coup dès qu'une
 * version était installée, même en pleine saisie ; et une appli Android laissée en arrière-plan
 * gardait l'ancienne version jusqu'à une relance complète. Désormais :
 * - à l'ouverture, tant que rien n'a été touché : tout de suite ;
 * - appli passée en arrière-plan, sans saisie ni fenêtre ouverte : en silence ;
 * - sinon on attend (et le bandeau « Nouvelle version disponible » propose de le faire).
 */

/** Une saisie ou une fenêtre est en cours : recharger ferait perdre ce qui n'est pas enregistré. */
export function saisieEnCours(doc = document) {
  const actif = doc.activeElement;
  if (actif && (/^(INPUT|TEXTAREA|SELECT)$/.test(actif.tagName) || actif.isContentEditable)) return true;
  return !!doc.querySelector('[role="dialog"], [aria-modal="true"]');
}

/**
 * Programme l'application de la nouvelle version au premier moment sans risque.
 * @param {{ appliquer: () => void, doc?: Document, ouvertureRecente: () => boolean, interagi: () => boolean }} o
 * @returns {() => void} pour renoncer (démontage)
 */
export function programmerMiseAJour({ appliquer, doc = document, ouvertureRecente, interagi }) {
  let faite = false;
  const essayer = () => {
    if (faite || saisieEnCours(doc)) return faite;
    faite = true;
    appliquer();
    return true;
  };
  if (ouvertureRecente() && !interagi() && essayer()) return () => {};
  if (doc.visibilityState === 'hidden' && essayer()) return () => {};
  const surVisibilite = () => {
    if (doc.visibilityState === 'hidden' && essayer()) doc.removeEventListener('visibilitychange', surVisibilite);
  };
  doc.addEventListener('visibilitychange', surVisibilite);
  return () => doc.removeEventListener('visibilitychange', surVisibilite);
}
