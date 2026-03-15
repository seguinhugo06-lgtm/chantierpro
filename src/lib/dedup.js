/**
 * Client deduplication utilities.
 * Provides fuzzy name matching and exact email/phone matching.
 */

/**
 * Normalize a string for fuzzy comparison:
 * lowercase, trim, remove accents, collapse whitespace.
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\s+/g, ' ');
}

/**
 * Normalize a phone number: keep only digits, remove country prefix.
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // Remove French +33 prefix
  if (digits.startsWith('33') && digits.length > 9) {
    return '0' + digits.slice(2);
  }
  return digits;
}

/**
 * Simple Levenshtein distance (for short strings like names).
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
    }
  }
  return d[m][n];
}

/**
 * Check if two names are similar (fuzzy match).
 * Returns true if Levenshtein distance is ≤ threshold relative to string length.
 */
function namesAreSimilar(name1, name2) {
  const a = normalize(name1);
  const b = normalize(name2);
  if (!a || !b) return false;
  if (a === b) return true;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return false;

  const dist = levenshtein(a, b);
  // Allow ~20% difference (e.g., "Dupont" vs "Dupond")
  return dist / maxLen <= 0.2;
}

/**
 * Find potential duplicate clients.
 *
 * @param {Object} newClient - { nom, prenom, email, telephone, entreprise }
 * @param {Array} existingClients - Array of existing client objects
 * @returns {Array} Array of { client, reason } matches
 */
export function findDuplicates(newClient, existingClients) {
  if (!newClient || !existingClients?.length) return [];

  const matches = [];
  const newEmail = normalize(newClient.email);
  const newPhone = normalizePhone(newClient.telephone);
  const newFullName = normalize(`${newClient.nom || ''} ${newClient.prenom || ''}`);
  const newEntreprise = normalize(newClient.entreprise);

  for (const existing of existingClients) {
    const reasons = [];

    // Exact email match (strongest signal)
    if (newEmail && newEmail === normalize(existing.email)) {
      reasons.push('Même email');
    }

    // Exact phone match
    if (newPhone && newPhone === normalizePhone(existing.telephone)) {
      reasons.push('Même téléphone');
    }

    // Fuzzy name match
    const existingFullName = normalize(`${existing.nom || ''} ${existing.prenom || ''}`);
    if (namesAreSimilar(newFullName, existingFullName)) {
      reasons.push('Nom similaire');
    }

    // Same company name (if both have one)
    if (newEntreprise && namesAreSimilar(newEntreprise, existing.entreprise)) {
      // Only flag if combined with name similarity
      if (reasons.length > 0) {
        reasons.push('Même entreprise');
      }
    }

    if (reasons.length > 0) {
      matches.push({ client: existing, reasons });
    }
  }

  // Sort by number of matching reasons (strongest matches first)
  matches.sort((a, b) => b.reasons.length - a.reasons.length);

  return matches;
}

/**
 * Format duplicate matches for display.
 */
export function formatDuplicateWarning(matches) {
  if (!matches.length) return null;

  if (matches.length === 1) {
    const m = matches[0];
    return `Client potentiellement existant : ${m.client.nom || ''} ${m.client.prenom || ''} (${m.reasons.join(', ')})`;
  }

  return `${matches.length} doublons potentiels détectés`;
}
