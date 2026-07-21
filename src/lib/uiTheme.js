/**
 * uiTheme — Langage visuel Mallettico "énergique & coloré"
 *
 * Palette vive + helpers partagés par les primitives (KPICard, PageHeader,
 * EmptyState, StatusChip…) et les modules. But : une couleur = du sens,
 * des surfaces vivantes, une identité cohérente sur toute l'app.
 *
 * Convention app : les composants reçoivent `isDark` (bool) et `couleur` (hex
 * accent utilisateur). Ce helper ne dépend d'aucun contexte — que des fonctions
 * pures + des constantes.
 */

// ── Palette catégorielle vive (avatars, tuiles, tags) ───────────────────────
export const CATEGORY_COLORS = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#22c55e', // green
  '#f97316', // orange
  '#06b6d4', // cyan
];

// ── Tons sémantiques pour les tuiles KPI ────────────────────────────────────
export const KPI_TONES = {
  money: '#10b981', // emerald — encaissements / CA
  accent: '#f97316', // orange — accent produit (souvent surchargé par `couleur`)
  info: '#6366f1', // indigo — informatif / pipeline
  warning: '#f59e0b', // amber — attention
  danger: '#ef4444', // rouge — urgent / retard
  neutral: '#64748b', // slate — neutre
};

/**
 * Couleur catégorielle déterministe à partir d'une chaîne (nom client, etc.).
 * @param {string} str
 * @returns {string} hex
 */
export function colorForString(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length];
}

/**
 * Teinte un hex avec un canal alpha (ex: fond léger d'une tuile).
 * @param {string} hex - couleur #rrggbb
 * @param {string} alpha - 2 hex chars (ex '14', '22', '33')
 */
export function tint(hex = '#000000', alpha = '18') {
  return `${hex}${alpha}`;
}

/**
 * Initiales (1-2 lettres) à partir d'un nom complet.
 * @param {string} name
 */
export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/**
 * Classes de surface cohérentes (carte de contenu) selon le mode.
 * @param {boolean} isDark
 */
export function surface(isDark) {
  return isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
}

/**
 * Résout un ton KPI (nom sémantique) ou un hex direct vers une couleur.
 * @param {string} tone - clé de KPI_TONES ou hex
 * @param {string} fallback - hex par défaut
 */
export function resolveTone(tone, fallback = KPI_TONES.accent) {
  if (!tone) return fallback;
  return KPI_TONES[tone] || (tone.startsWith('#') ? tone : fallback);
}
