import { resolveTone } from '../../lib/uiTheme';

/**
 * StatusChip — Pastille de statut colorée, pilotée par couleur/ton libre.
 *
 * Complète Badge (variantes fixes) quand on veut une couleur catégorielle
 * arbitraire (statut client, étape, tag…). Design system BatiGesti.
 *
 * @param {string} label - Texte de la pastille
 * @param {string} [color] - Hex direct
 * @param {string} [tone] - Ton sémantique (money|info|warning|danger|neutral|accent)
 * @param {React.ComponentType} [icon] - Lucide icon optionnel
 * @param {boolean} [dot] - Affiche un point coloré
 * @param {boolean} [isDark] - Dark mode
 */
export default function StatusChip({ label, color, tone, icon: Icon, dot = false, isDark = false }) {
  const c = resolveTone(tone, color || '#64748b');
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: isDark ? `${c}26` : `${c}18`, color: isDark ? `${c}` : c }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} aria-hidden="true" />}
      {Icon && <Icon size={12} strokeWidth={2.4} aria-hidden="true" />}
      {label}
    </span>
  );
}
