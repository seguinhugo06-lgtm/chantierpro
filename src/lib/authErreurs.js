/**
 * Messages d'erreur de Supabase Auth → français compréhensible par un artisan.
 *
 * Supabase renvoie ses messages en anglais (« Invalid login credentials »…). Affichés tels quels,
 * ils laissent l'utilisateur sans piste. On reconnaît les cas fréquents par code ou par motif,
 * et on garde un message générique pour le reste (jamais de texte technique à l'écran).
 */
const MOTIFS = [
  [/invalid login credentials|invalid_credentials/i, 'E-mail ou mot de passe incorrect.'],
  [/email not confirmed|email_not_confirmed/i,
    'Adresse e-mail pas encore confirmée : ouvrez le lien reçu par e-mail (pensez aux indésirables).'],
  [/user already registered|already been registered|user_already_exists/i,
    'Un compte existe déjà avec cette adresse. Connectez-vous ou utilisez « Mot de passe oublié ».'],
  [/password should be at least|weak_password|password is too weak/i,
    'Mot de passe trop faible : au moins 8 caractères, avec lettres et chiffres.'],
  [/same_password|should be different from the old password/i,
    'Le nouveau mot de passe doit être différent de l’ancien.'],
  [/for security purposes, you can only request this after (\d+) seconds?|over_email_send_rate_limit/i,
    'Trop de demandes rapprochées : patientez une minute avant de réessayer.'],
  [/rate limit|too many requests|over_request_rate_limit/i, 'Trop de tentatives : patientez quelques minutes.'],
  [/unable to validate email address|invalid format|email_address_invalid/i, 'Adresse e-mail invalide.'],
  [/signups not allowed|signup_disabled/i, 'Les inscriptions sont momentanément fermées.'],
  [/otp_expired|token has expired|link is invalid or has expired|expired/i,
    'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.'],
  [/auth session missing|session_not_found|refresh_token_not_found/i,
    'Votre session a expiré. Reconnectez-vous.'],
  [/failed to fetch|network|load failed/i, 'Connexion impossible : vérifiez votre accès à Internet.'],
  [/mode démo/i, 'Indisponible en mode démo.'],
];

/**
 * @param {unknown} erreur - objet erreur Supabase ({ message, code }), Error ou chaîne
 * @param {string} [repli] - message si rien n'est reconnu
 * @returns {string}
 */
export function traduireErreurAuth(erreur, repli = 'Une erreur est survenue. Réessayez dans un instant.') {
  if (!erreur) return repli;
  const texte = typeof erreur === 'string'
    ? erreur
    : [erreur.code, erreur.error_code, erreur.message, erreur.error_description].filter(Boolean).join(' ');
  for (const [motif, message] of MOTIFS) if (motif.test(texte)) return message;
  return repli;
}

/** Règle minimale côté client, alignée sur le message affiché. */
export function motDePasseValide(mdp) {
  return typeof mdp === 'string' && mdp.length >= 8 && /[a-zA-Z]/.test(mdp) && /\d/.test(mdp);
}
