/**
 * GarantieProgressBar.jsx — Visual progress bar for a warranty
 *
 * Shows elapsed time percentage with color gradient (green→orange→red).
 * Compact mode for lists, full mode for detail pages.
 */

import React, { memo, useMemo } from 'react';

const GarantieProgressBar = memo(function GarantieProgressBar({
  dateDebut,
  dateFin,
  statut = 'active',
  size = 'full', // 'compact' | 'full'
  isDark = false,
  showDates = true,
  showDaysRemaining = true,
}) {
  const progress = useMemo(() => {
    const now = new Date();
    const start = new Date(dateDebut);
    const end = new Date(dateFin);
    const totalMs = end - start;
    const elapsedMs = now - start;
    const totalDays = Math.ceil(totalMs / 86400000);
    const elapsedDays = Math.ceil(elapsedMs / 86400000);
    const daysRemaining = Math.max(0, totalDays - elapsedDays);
    const percentElapsed = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

    let statusColor = '#22c55e'; // green
    if (statut === 'expiree' || daysRemaining <= 0) {
      statusColor = '#ef4444'; // red
    } else if (daysRemaining <= 30) {
      statusColor = '#ef4444'; // red
    } else if (daysRemaining <= 90) {
      statusColor = '#f97316'; // orange
    } else if (percentElapsed > 75) {
      statusColor = '#eab308'; // yellow
    }

    return { percentElapsed, daysRemaining, totalDays, elapsedDays, statusColor };
  }, [dateDebut, dateFin, statut]);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDaysRemaining = (days) => {
    if (days <= 0) return 'Expirée';
    if (days === 1) return '1 jour restant';
    if (days < 30) return `${days}j restants`;
    if (days < 365) return `${Math.floor(days / 30)} mois restants`;
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return months > 0 ? `${years} an${years > 1 ? 's' : ''} ${months} mois` : `${years} an${years > 1 ? 's' : ''}`;
  };

  const isExpired = statut === 'expiree' || progress.daysRemaining <= 0;
  const textPrimary = isDark ? 'text-slate-200' : 'text-slate-700';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
          role="progressbar"
          aria-valuenow={Math.round(progress.percentElapsed)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${Math.round(progress.percentElapsed)}% écoulé, ${formatDaysRemaining(progress.daysRemaining)}`}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress.percentElapsed}%`, backgroundColor: progress.statusColor }}
          />
        </div>
        {showDaysRemaining && (
          <span className={`text-[10px] font-medium whitespace-nowrap ${textMuted}`}>
            {isExpired ? 'Expirée' : `${progress.daysRemaining}j`}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        {showDates && (
          <span className={`text-xs ${textMuted}`}>
            {formatDate(dateDebut)} → {formatDate(dateFin)}
          </span>
        )}
        {showDaysRemaining && (
          <span
            className="text-xs font-semibold"
            style={{ color: progress.statusColor }}
          >
            {isExpired ? '❌ Expirée' : formatDaysRemaining(progress.daysRemaining)}
          </span>
        )}
      </div>
      <div
        className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
        role="progressbar"
        aria-valuenow={Math.round(progress.percentElapsed)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Garantie: ${Math.round(progress.percentElapsed)}% écoulé, ${formatDaysRemaining(progress.daysRemaining)}`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress.percentElapsed}%`, backgroundColor: progress.statusColor }}
        />
      </div>
      <div className={`flex items-center justify-between mt-1`}>
        <span className={`text-[10px] ${textMuted}`}>
          {Math.round(progress.percentElapsed)}% écoulé
        </span>
        <span className={`text-[10px] ${textMuted}`}>
          {progress.elapsedDays}/{progress.totalDays}j
        </span>
      </div>
    </div>
  );
});

export default GarantieProgressBar;
