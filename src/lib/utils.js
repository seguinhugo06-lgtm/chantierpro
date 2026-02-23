import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitaire pour fusionner des classes Tailwind de manière intelligente
 * Gère les conflits et les conditions
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} A unique ID string
 */
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
}

/**
 * Levenshtein distance between two strings (normalized 0-1)
 * @param {string} a
 * @param {string} b
 * @returns {number} Similarity ratio 0-1 (1 = identical)
 */
export function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  const m = la.length, n = lb.length;
  if (m === 0 || n === 0) return 0;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = la[i-1] === lb[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

/**
 * Detect duplicate chantiers (same client + similar title)
 * @param {Array} chantiers
 * @returns {Map<string, string[]>} Map of chantier ID → array of duplicate IDs
 */
export function findDuplicateChantiers(chantiers) {
  const duplicates = new Map();
  const active = chantiers.filter(c => c.statut !== 'archive' && c.statut !== 'abandonne');
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      if (a.client_id && a.client_id === b.client_id && stringSimilarity(a.nom, b.nom) > 0.80) {
        if (!duplicates.has(a.id)) duplicates.set(a.id, []);
        if (!duplicates.has(b.id)) duplicates.set(b.id, []);
        if (!duplicates.get(a.id).includes(b.id)) duplicates.get(a.id).push(b.id);
        if (!duplicates.get(b.id).includes(a.id)) duplicates.get(b.id).push(a.id);
      }
    }
  }
  return duplicates;
}

/**
 * Detect test/draft chantiers that should be hidden from counts and lists
 * @param {object} ch - Chantier object
 * @returns {boolean} True if chantier is a test/draft
 */
export function isDraftChantier(ch) {
  const testNames = ['test', 'test1', 'test2', 'test3', 'essai', 'brouillon', 'zzz'];
  const nom = (ch.nom || '').toLowerCase().trim();
  if (testNames.includes(nom)) return true;
  const hasNoData = !ch.adresse && !ch.budget_estime && !ch.budgetPrevu && (!ch.taches || ch.taches.length === 0) && !ch.client_id;
  if (hasNoData && nom.length <= 5) return true;
  return false;
}
