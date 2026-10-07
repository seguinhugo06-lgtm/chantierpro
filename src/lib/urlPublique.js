import { Capacitor } from '@capacitor/core';

/** Adresse publique du site : celle que reçoivent les clients, Stripe et les e-mails de Supabase. */
export const ORIGINE_PUBLIQUE = 'https://mallettico.fr';

/**
 * URL absolue d'une page publique (signature, paiement, portail, invitation, retour d'e-mail).
 *
 * Sur le site : l'origine courante (préprod et local gardent leurs propres liens).
 * Dans l'app native : TOUJOURS le site public — l'origine y vaut https://localhost ou
 * capacitor://localhost, et un lien de signature envoyé à un client serait mort.
 * @param {string} [chemin]
 */
export function urlPublique(chemin = '/') {
  const base = typeof window === 'undefined' || Capacitor.isNativePlatform()
    ? ORIGINE_PUBLIQUE
    : window.location.origin;
  return `${base}${chemin.startsWith('/') ? chemin : `/${chemin}`}`;
}
