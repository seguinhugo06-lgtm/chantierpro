/**
 * GarantieProgressBar.jsx — Visual progress bar for a warranty
 *
 * Shows elapsed time percentage with color gradient (green→orange→red).
 * Compact mode for lists, full mode for detail pages.
 */

import { memo, useMemo } from 'react';
import { dateLue } from '../../lib/dates';

const GarantieProgressBar = memo(function GarantieProgressBar({
  dateDebut,
  dateFin,
  statut = 'active',
  size = 'full', // 'compact' | 'full'
  isDark: _isDark = false,
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

    // Le ton dit l'urgence : vert tant qu'il reste du temps, ambre à surveiller, rouge à l'échéance
    let statusTon = 'succes';
    if (statut === 'expiree' || daysRemaining <= 0) {
      statusTon = 'danger';
    } else if (daysRemaining <= 30) {
      statusTon = 'danger';
    } else if (daysRemaining <= 90 || percentElapsed > 75) {
      statusTon = 'alerte';
    }

    const barre = { succes: 'bg-succes-point', alerte: 'bg-alerte-point', danger: 'bg-danger-point' }[statusTon];
    const texte = { succes: 'text-succes-texte', alerte: 'text-alerte-texte', danger: 'text-danger-texte' }[statusTon];

    return { percentElapsed, daysRemaining, totalDays, elapsedDays, barre, texte };
  }, [dateDebut, dateFin, statut]);

  const formatDate = (d) => {
    if (!d) return '';
    return dateLue(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  const textMuted = 'text-encre-3';

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden bg-bord"
          role="progressbar"
          aria-valuenow={Math.round(progress.percentElapsed)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${Math.round(progress.percentElapsed)}% écoulé, ${formatDaysRemaining(progress.daysRemaining)}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress.barre}`}
            style={{ width: `${progress.percentElapsed}%` }}
          />
        </div>
        {showDaysRemaining && (
          <span className={`text-xs font-medium whitespace-nowrap ${textMuted}`}>
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
          <span className={`text-xs font-semibold ${progress.texte}`}>
            {isExpired ? '❌ Expirée' : formatDaysRemaining(progress.daysRemaining)}
          </span>
        )}
      </div>
      <div
        className="w-full h-2.5 rounded-full overflow-hidden bg-bord"
        role="progressbar"
        aria-valuenow={Math.round(progress.percentElapsed)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Garantie: ${Math.round(progress.percentElapsed)}% écoulé, ${formatDaysRemaining(progress.daysRemaining)}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${progress.barre}`}
          style={{ width: `${progress.percentElapsed}%` }}
        />
      </div>
      <div className={`flex items-center justify-between mt-1`}>
        <span className={`text-xs ${textMuted}`}>
          {Math.round(progress.percentElapsed)}% écoulé
        </span>
        <span className={`text-xs ${textMuted}`}>
          {progress.elapsedDays}/{progress.totalDays}j
        </span>
      </div>
    </div>
  );
});

export default GarantieProgressBar;
