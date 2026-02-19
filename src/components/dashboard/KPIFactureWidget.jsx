/**
 * KPIFactureWidget - "Facturé ce mois" KPI card widget
 * Wraps KPICard with monthly revenue data and period selector
 *
 * @module KPIFactureWidget
 */

import React, { useState, useMemo } from 'react';
import { TrendingUp, Target, FileText, Zap } from 'lucide-react';
import KPICard from './KPICard';

export default function KPIFactureWidget({
  stats,
  devis = [],
  isDark,
  modeDiscret,
  formatMoney,
  onOpenCeMois,
}) {
  const [kpiPeriod, setKpiPeriod] = useState('month');

  const safeDevis = devis || [];

  const periodValue = useMemo(() => {
    const now = new Date();
    if (kpiPeriod === 'month') {
      return stats.thisMonthCA;
    } else if (kpiPeriod === 'year') {
      return safeDevis
        .filter(d => {
          const dd = new Date(d.date);
          return dd.getFullYear() === now.getFullYear() &&
                 (d.type === 'facture' || ['accepte', 'signe'].includes(d.statut));
        })
        .reduce((s, d) => s + (d.total_ht || 0), 0);
    } else {
      return safeDevis
        .filter(d => {
          const dd = new Date(d.date);
          return dd.getFullYear() >= now.getFullYear() - 4 &&
                 (d.type === 'facture' || ['accepte', 'signe'].includes(d.statut));
        })
        .reduce((s, d) => s + (d.total_ht || 0), 0);
    }
  }, [kpiPeriod, stats.thisMonthCA, safeDevis]);

  const label = useMemo(() => {
    if (kpiPeriod === 'month') {
      const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date());
      return `FACTURÉ EN ${monthName.toUpperCase()}`;
    }
    return kpiPeriod === 'year' ? 'CETTE ANNÉE' : '5 ANS';
  }, [kpiPeriod]);

  const subValue = useMemo(() => {
    if (stats.isEarlyMonth && kpiPeriod === 'month') {
      return `Début de mois • Objectif: ${formatMoney(stats.objectifMensuel)}`;
    }
    if (stats.projectionMensuelle && kpiPeriod === 'month') {
      return `Projection: ${formatMoney(stats.projectionMensuelle)}/mois`;
    }
    return undefined;
  }, [stats, kpiPeriod, formatMoney]);

  const sparklineData = useMemo(() => {
    const now = new Date();
    if (kpiPeriod === 'month') {
      return Array.from({ length: 6 }, (_, i) => {
        const monthOffset = 5 - i;
        const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const monthCA = safeDevis
          .filter(d => {
            const dd = new Date(d.date);
            return dd.getMonth() === targetMonth.getMonth() &&
                   dd.getFullYear() === targetMonth.getFullYear() &&
                   (d.type === 'facture' || ['accepte', 'signe'].includes(d.statut));
          })
          .reduce((s, d) => s + (d.total_ht || 0), 0);
        return { value: monthCA };
      });
    } else if (kpiPeriod === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const monthOffset = 11 - i;
        const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const monthCA = safeDevis
          .filter(d => {
            const dd = new Date(d.date);
            return dd.getMonth() === targetMonth.getMonth() &&
                   dd.getFullYear() === targetMonth.getFullYear() &&
                   (d.type === 'facture' || ['accepte', 'signe'].includes(d.statut));
          })
          .reduce((s, d) => s + (d.total_ht || 0), 0);
        return { value: monthCA };
      });
    } else {
      return Array.from({ length: 5 }, (_, i) => {
        const yearOffset = 4 - i;
        const targetYear = now.getFullYear() - yearOffset;
        const yearCA = safeDevis
          .filter(d => {
            const dd = new Date(d.date);
            return dd.getFullYear() === targetYear &&
                   (d.type === 'facture' || ['accepte', 'signe'].includes(d.statut));
          })
          .reduce((s, d) => s + (d.total_ht || 0), 0);
        return { value: yearCA };
      });
    }
  }, [kpiPeriod, safeDevis]);

  const details = useMemo(() => {
    const result = [];

    if (kpiPeriod === 'month' && stats.objectifMensuel > 0) {
      const progressLabel = stats.isEarlyMonth
        ? `Objectif: ${formatMoney(stats.objectifMensuel)}`
        : `${Math.round(stats.progressionObjectif)}% de l'objectif`;
      result.push({
        icon: Target,
        label: progressLabel,
        value: stats.isEarlyMonth ? '—' : `${Math.round(stats.progressionObjectif)}%`,
        highlight: !stats.isEarlyMonth && stats.progressionObjectif < 50,
      });
    } else {
      result.push({
        icon: Target,
        label: 'Marge brute',
        value: `${Math.round(stats.tauxMarge)}%`,
        highlight: stats.tauxMarge < 20,
      });
    }

    result.push({
      icon: FileText,
      label: 'Devis en attente',
      value: `${stats.devisEnAttente} (${formatMoney(stats.montantDevisEnAttente)})`,
      badge: stats.montantDevisEnAttente > 10000 ? { type: 'highlight', label: '💎 Gros deal' } : undefined,
    });

    result.push({
      icon: Zap,
      label: 'Taux conversion',
      value: `${Math.round(stats.tauxConversion)}%`,
    });

    return result;
  }, [kpiPeriod, stats, formatMoney]);

  return (
    <KPICard
      icon={TrendingUp}
      label={label}
      value={formatMoney(periodValue)}
      subValue={subValue}
      trend={stats.isEarlyMonth && kpiPeriod === 'month' ? null : stats.tendance}
      trendLabel={kpiPeriod === 'month' ? stats.tendanceLabel : kpiPeriod === 'year' ? 'vs an dernier' : 'sur 5 ans'}
      color={stats.tendance === null ? 'blue' : stats.tendance >= 0 ? 'green' : 'red'}
      isDark={isDark}
      onClick={onOpenCeMois}
      showPeriodSelector={true}
      period={kpiPeriod}
      onPeriodChange={setKpiPeriod}
      sparklineData={sparklineData}
      details={details}
    />
  );
}
