/**
 * Error Mapper — Centralised Supabase/API error → user-friendly French message
 *
 * Rule: No database constraint name, SQL error, or stack trace
 * should ever reach the UI.
 *
 * @module errorMapper
 */

const ERROR_MAP = [
  // Devis / Facture specific
  { pattern: 'devis_statut_check', message: 'Le statut du devis est invalide. Veuillez réessayer.' },
  { pattern: 'devis_numero_key', message: 'Ce numéro de document existe déjà.' },
  { pattern: 'factures_numero_key', message: 'Ce numéro de facture existe déjà.' },

  // Client specific
  { pattern: 'clients_email_key', message: 'Cette adresse email est déjà utilisée par un autre client.' },
  { pattern: 'clients_pkey', message: 'Ce client existe déjà.' },

  // Generic constraint patterns
  { pattern: 'check constraint', message: 'Une valeur est invalide. Vérifiez vos saisies.' },
  { pattern: 'violates foreign key', message: 'La donnée référencée n\'existe plus. Actualisez la page.' },
  { pattern: 'duplicate key', message: 'Cette entrée existe déjà.' },
  { pattern: 'not-null constraint', message: 'Un champ obligatoire est manquant.' },

  // Network / Auth
  { pattern: 'Failed to fetch', message: 'Connexion impossible. Vérifiez votre connexion internet.' },
  { pattern: 'JWT expired', message: 'Votre session a expiré. Veuillez vous reconnecter.' },
  { pattern: 'PGRST', message: 'Erreur de communication avec le serveur. Réessayez.' },
];

const DEFAULT_MESSAGE = 'Une erreur est survenue. Veuillez réessayer.';

/**
 * Map a raw error to a user-friendly French message.
 * Accepts Error objects, Supabase error objects, or plain strings.
 *
 * @param {Error|Object|string} error - The raw error
 * @returns {string} User-friendly error message
 */
export function mapError(error) {
  if (!error) return DEFAULT_MESSAGE;

  // Extract the message string from various error shapes
  const raw = typeof error === 'string'
    ? error
    : error.message || error.details || error.hint || error.code || '';

  const rawLower = raw.toLowerCase();

  for (const entry of ERROR_MAP) {
    if (rawLower.includes(entry.pattern.toLowerCase())) {
      return entry.message;
    }
  }

  return DEFAULT_MESSAGE;
}

/**
 * Wrap an async operation with error mapping.
 * Usage: const result = await safeAsync(() => supabase.from(...), showToast);
 *
 * @param {Function} fn - Async function to execute
 * @param {Function} onError - Callback receiving (userMessage, rawError)
 * @returns {*} Result of fn, or null on error
 */
export async function safeAsync(fn, onError) {
  try {
    const result = await fn();
    // Handle Supabase-style { data, error } responses
    if (result?.error) {
      const msg = mapError(result.error);
      onError?.(msg, result.error);
      return null;
    }
    return result;
  } catch (err) {
    const msg = mapError(err);
    onError?.(msg, err);
    return null;
  }
}
