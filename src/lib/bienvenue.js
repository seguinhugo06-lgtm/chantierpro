/**
 * E-mail de bienvenue, demandé à la première connexion d'un compte récent.
 *
 * Avant : envoyé depuis le formulaire d'inscription, sans session (l'adresse n'est
 * pas encore confirmée), à l'adresse fournie par le navigateur — la fonction Edge
 * acceptait donc d'écrire à n'importe qui. Désormais `send-lifecycle-email` exige
 * un utilisateur connecté, n'écrit qu'à l'adresse de son compte et une seule fois
 * (marque dans app_metadata). Ce filtre évite seulement des appels inutiles.
 */
import { captureException } from './sentry';

const SEPT_JOURS = 7 * 24 * 3600 * 1000;
let demandee = false;

export function bienvenueAttendue(user, maintenant = Date.now()) {
  if (!user?.email || user.is_anonymous) return false;
  if (user.app_metadata?.bienvenue_envoyee_le) return false;
  const age = maintenant - new Date(user.created_at).getTime();
  return age >= 0 && age < SEPT_JOURS;
}

/** Non bloquant : un envoi raté ne doit pas gâcher une connexion. */
export function demanderBienvenue(client, user) {
  if (demandee || !client || !bienvenueAttendue(user)) return;
  demandee = true;
  client.functions
    .invoke('send-lifecycle-email', { body: { type: 'welcome' } })
    .then(({ error }) => {
      // supabase-js ne lève pas : sans ce test, un échec passerait inaperçu.
      if (error) captureException(error, { context: 'email de bienvenue' });
    })
    .catch((err) => captureException(err, { context: 'email de bienvenue' }));
}
