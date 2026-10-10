/**
 * Que faire d'une écriture en base qui a échoué ?
 *
 * Deux cas à ne jamais confondre (recette du 9 oct. 2026 : chaque refus de la base partait
 * dans la file « hors ligne » et l'écran annonçait « Client modifié avec succès ») :
 * - l'écriture n'a pas pu arriver (réseau, serveur indisponible, session expirée) : elle attend
 *   sur l'appareil et partira plus tard ;
 * - la base refuse (droits, valeur interdite, élément disparu) : elle ne passera jamais.
 *   On annule ce que l'écran affichait déjà et on le dit à l'artisan, en français.
 *
 * Le statut HTTP décide d'abord (relecture sécurité du 10 oct. 2026) : une réponse reçue de la base
 * n'est jamais une coupure réseau, même si l'appareil se croit hors ligne à cet instant.
 */

const STATUTS_PASSAGERS = [0, 401, 408, 425, 429];
// Codes SQL qui ne changeront pas en réessayant, même renvoyés avec un statut 5xx
const CODE_DEFINITIF = /^(42|23|22|P0004|XX)/;
const MESSAGE_RESEAU = /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|timed out|aborted|err_internet|err_network/i;

/** Vrai si l'écriture peut réussir plus tard, sans rien changer : il faut la garder en file. */
export function estEcritureDifferable(error, enLigne = typeof navigator === 'undefined' ? true : navigator.onLine) {
  const status = error?.status ?? error?.statusCode;
  if (typeof status === 'number') {
    if (STATUTS_PASSAGERS.includes(status)) return true;
    if (status >= 500) return !CODE_DEFINITIF.test(String(error?.code || ''));
    if (status >= 400) return false;
  }
  if (enLigne === false) return true;
  return MESSAGE_RESEAU.test(`${error?.messageBase || ''} ${error?.message || ''}`);
}

/** Session expirée : l'écriture attend, l'artisan doit se reconnecter. */
export function estSessionExpiree(error) {
  const status = error?.status ?? error?.statusCode;
  return status === 401 || /jwt expired|token.*expired|not authenticated/i.test(`${error?.messageBase || ''} ${error?.message || ''}`);
}

/** Une phrase pour l'artisan : ce que la base a refusé, sans jargon. */
export function messageEcritureRefusee(error) {
  const code = String(error?.code || '');
  const status = error?.status ?? error?.statusCode;
  const texte = `${error?.messageBase || ''} ${error?.message || ''}`;

  if (estSessionExpiree(error)) {
    return 'Votre session a expiré. Reconnectez-vous puis recommencez.';
  }
  if (code === '42501' || status === 403 || /row-level security|permission denied/i.test(texte)) {
    return "Votre compte n'a pas le droit de faire cette modification.";
  }
  if (code === 'PGRST116' || status === 406 || status === 404) {
    return "Cet élément n'existe plus ou ne vous appartient pas. Rechargez la page.";
  }
  if (code === '23505') return 'Cet élément existe déjà (numéro ou identifiant en double).';
  if (code === '23514' || /check constraint/i.test(texte)) return 'Une des valeurs saisies est refusée par la base.';
  if (code === '23502') return 'Une information obligatoire manque.';
  if (code === '23503') return "Cet élément dépend d'un autre qui n'existe plus.";
  if (/limite|limit/i.test(texte)) return 'La limite de votre formule est atteinte.';
  if (code === 'SCHEMA' || code === '42703' || code === 'PGRST204') {
    return "L'application et la base ne sont pas à jour l'une avec l'autre. Rien n'a été enregistré.";
  }
  return "La base a refusé l'enregistrement. Rien n'a été modifié.";
}
