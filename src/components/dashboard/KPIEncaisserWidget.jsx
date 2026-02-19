/**
 * KPIEncaisserWidget - "À encaisser" KPI card widget
 * Wraps KPICard with cash-flow collection data
 *
 * @module KPIEncaisserWidget
 */

import React, { useMemo, useCallback } from 'react';
import { Wallet, Receipt, CheckCircle, AlertTriangle } from 'lucide-react';
import KPICard from './KPICard';

function daysSince(date) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

export default function KPIEncaisserWidget({
  stats,
  clients = [],
  isDark,
  modeDiscret,
  formatMoney,
  setSelectedDevis,
  setPage,
  onOpenEncaisser,
}) {
  const donutData = useMemo(() => {
    if (stats.enAttente > 0) {
      return [
        { value: stats.encaisse || 1, color: '#10b981' },
        { value: stats.enAttente, color: stats.facturesOverdue?.length > 0 ? '#f59e0b' : '#10b981' },
      ];
    }
    return undefined;
  }, [stats.enAttente, stats.encaisse, stats.facturesOverdue]);

  const donutTooltip = useMemo(() => {
    const total = stats.encaisse + stats.enAttente || 1;
    return `${Math.round((stats.encaisse / total) * 100)}% encaissé sur ${formatMoney(stats.encaisse + stats.enAttente)} facturé`;
  }, [stats.encaisse, stats.enAttente, formatMoney]);

  const details = useMemo(() => {
    const result = [];

    // First pending invoice with client name and age
    if (stats.facturesEnAttente?.length > 0) {
      const firstFacture = stats.facturesEnAttente[0];
      const client = clients.find(c => c.id === firstFacture?.client_id);
      const days = daysSince(firstFacture?.date);
      result.push({
        icon: Receipt,
        label: client?.nom || 'Client',
        subLabel: `${firstFacture?.numero || 'Facture'} • ${days}j`,
        value: formatMoney(firstFacture?.total_ttc),
        highlight: days > 30,
        onClick: () => {
          setSelectedDevis?.(firstFacture);
          setPage?.('devis');
        },
        badge: days > 30 ? { type: 'warning', label: 'En retard' } : undefined,
      });
    }

    // Already collected
    result.push({
      icon: CheckCircle,
      label: 'Déjà encaissé',
      value: formatMoney(stats.encaisse),
    });

    // Overdue
    if (stats.montantOverdue > 0) {
      result.push({
        icon: AlertTriangle,
        label: `En retard (+30j) • ${stats.facturesOverdue?.length} fact.`,
        value: formatMoney(stats.montantOverdue),
        highlight: true,
      });
    }

    return result;
  }, [stats, clients, formatMoney, setSelectedDevis, setPage]);

  return (
    <KPICard
      icon={Wallet}
      label="À ENCAISSER"
      value={formatMoney(stats.enAttente)}
      comparison={stats.facturesOverdue?.length > 0
        ? `⚠️ ${stats.facturesOverdue.length} facture${stats.facturesOverdue.length > 1 ? 's' : ''} en retard`
        : `${stats.facturesEnAttente?.length || 0} facture${(stats.facturesEnAttente?.length || 0) > 1 ? 's' : ''} en attente`
      }
      color={stats.facturesOverdue?.length > 0 ? 'orange' : 'green'}
      isDark={isDark}
      onClick={onOpenEncaisser}
      donutData={donutData}
      donutTooltip={donutTooltip}
      details={details}
    />
  );
}
