import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ResponsiveTable - Shows table on desktop, cards on mobile
 * Critical for Jean-Marc using app on construction site with gloves
 *
 * @param {Array} columns - Column definitions { key, label, render?, className?, mobileHidden? }
 * @param {Array} data - Array of row objects
 * @param {Function} onRowClick - Optional click handler for rows
 * @param {Function} renderMobileCard - Optional custom mobile card renderer
 * @param {string} mobileCardTitle - Key to use as card title on mobile
 * @param {boolean} isDark - Dark mode
 * @param {string} couleur - Brand color
 */
export default function ResponsiveTable({
  columns = [],
  data = [],
  onRowClick,
  renderMobileCard,
  mobileCardTitle,
  mobileCardSubtitle,
  isDark = false,
  couleur = '#f97316',
  emptyMessage = 'Aucune donnee',
  className = ''
}) {
  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const headerBg = isDark ? 'bg-slate-700' : 'bg-slate-50';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  if (data.length === 0) {
    return (
      <div className={`text-center py-12 ${textMuted} ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full" aria-label="Tableau de données">
          <thead>
            <tr className={headerBg}>
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${textMuted} ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${borderColor}`}>
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick?.(row)}
                className={`${hoverBg} ${onRowClick ? 'cursor-pointer' : ''} transition-colors`}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${textPrimary} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - shown only on mobile */}
      <div className="md:hidden space-y-3">
        {data.map((row, idx) => (
          renderMobileCard ? (
            <div key={row.id || idx}>
              {renderMobileCard(row, idx)}
            </div>
          ) : (
            <MobileCard
              key={row.id || idx}
              row={row}
              columns={columns}
              onClick={() => onRowClick?.(row)}
              titleKey={mobileCardTitle}
              subtitleKey={mobileCardSubtitle}
              isDark={isDark}
              couleur={couleur}
            />
          )
        ))}
      </div>
    </div>
  );
}

/**
 * Default mobile card component
 */
function MobileCard({ row, columns, onClick, titleKey, subtitleKey, isDark, couleur }) {
  const [expanded, setExpanded] = useState(false);
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Find title and subtitle columns
  const titleCol = columns.find(c => c.key === titleKey) || columns[0];
  const subtitleCol = columns.find(c => c.key === subtitleKey) || columns[1];
  const otherCols = columns.filter(c => c.key !== titleKey && c.key !== subtitleKey && !c.mobileHidden);

  const titleValue = titleCol?.render ? titleCol.render(row[titleCol.key], row) : row[titleCol?.key];
  const subtitleValue = subtitleCol?.render ? subtitleCol.render(row[subtitleCol.key], row) : row[subtitleCol?.key];

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-all ${cardBg} ${onClick ? 'active:scale-[0.98]' : ''}`}
      onClick={onClick}
    >
      {/* Card Header - Always visible */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${textPrimary} truncate`}>
              {titleValue}
            </p>
            {subtitleValue && (
              <p className={`text-sm ${textMuted} mt-0.5 truncate`}>
                {subtitleValue}
              </p>
            )}
          </div>

          {/* Expand button if there are more columns */}
          {otherCols.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              {expanded ? (
                <ChevronUp size={18} className={textMuted} />
              ) : (
                <ChevronDown size={18} className={textMuted} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && otherCols.length > 0 && (
        <div className={`px-4 pb-4 pt-0 space-y-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          {otherCols.map(col => {
            const value = col.render ? col.render(row[col.key], row) : row[col.key];
            return (
              <div key={col.key} className="flex items-center justify-between py-2">
                <span className={`text-sm ${textMuted}`}>{col.label}</span>
                <span className={`text-sm font-medium ${textPrimary}`}>{value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Utility: Format money for mobile display
 */
export function formatMobileMoney(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Utility: Status badge component
 */
export function StatusBadge({ status, statusConfig, isDark }) {
  const config = statusConfig[status] || { label: status, color: '#94a3b8' };
  return (
    <span
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color
      }}
    >
      {config.label}
    </span>
  );
}
