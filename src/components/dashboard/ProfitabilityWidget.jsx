import React, { useMemo } from 'react';
import { PieChart as PieChartIcon, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useData } from '../../context/DataContext';
import { WidgetHeader, WidgetContent, WidgetFooter, WidgetEmptyState } from './Widget';

/**
 * ProfitabilityWidget — Vue synthétique de la rentabilité par chantier.
 */
export default function ProfitabilityWidget({ setPage, isDark }) {
  const { chantiers = [], depenses = [], devis = [] } = useData();

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';

  // Compute profitability summary
  const profitData = useMemo(() => {
    const actifs = chantiers.filter(c => c.statut === 'en_cours' || c.statut === 'termine');
    if (actifs.length === 0) return null;

    let totalRevenu = 0;
    let totalDepenses = 0;
    let rentables = 0;
    let nonRentables = 0;

    actifs.forEach(ch => {
      // Revenue: sum of invoices linked to this chantier
      const chRevenu = devis
        .filter(d => d.type === 'facture' && d.chantier_id === ch.id)
        .reduce((sum, d) => sum + (d.total_ttc || 0), 0);

      // Expenses
      const chDepenses = depenses
        .filter(d => d.chantier_id === ch.id)
        .reduce((sum, d) => sum + (d.montant || 0), 0);

      totalRevenu += chRevenu;
      totalDepenses += chDepenses;

      const marge = chRevenu > 0 ? ((chRevenu - chDepenses) / chRevenu) * 100 : 0;
      if (marge >= 20) rentables++;
      else nonRentables++;
    });

    const margeGlobale = totalRevenu > 0
      ? Math.round(((totalRevenu - totalDepenses) / totalRevenu) * 100)
      : 0;

    return {
      totalRevenu,
      totalDepenses,
      benefice: totalRevenu - totalDepenses,
      margeGlobale,
      rentables,
      nonRentables,
      totalChantiers: actifs.length,
    };
  }, [chantiers, depenses, devis]);

  if (!profitData) {
    return (
      <div className={`rounded-2xl border ${cardBg} p-5`}>
        <WidgetHeader icon={PieChartIcon} iconColor="#8b5cf6" title="Rentabilité" isDark={isDark} />
        <WidgetEmptyState icon={PieChartIcon} message="Aucun chantier actif" isDark={isDark} />
      </div>
    );
  }

  const pieData = [
    { name: 'Bénéfice', value: Math.max(profitData.benefice, 0), color: '#22c55e' },
    { name: 'Dépenses', value: profitData.totalDepenses, color: isDark ? '#475569' : '#cbd5e1' },
  ];

  const margeColor = profitData.margeGlobale >= 40 ? '#22c55e' : profitData.margeGlobale >= 20 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`rounded-2xl border ${cardBg} p-5`}>
      <WidgetHeader icon={PieChartIcon} iconColor="#8b5cf6" title="Rentabilité" isDark={isDark} />

      <WidgetContent>
        <div className="flex items-center gap-4">
          {/* Donut chart */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={42}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: isDark ? '#1e293b' : '#fff',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${v.toLocaleString('fr-FR')} €`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold" style={{ color: margeColor }}>
                {profitData.margeGlobale}%
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2">
            <div>
              <p className={`text-xs ${textMuted}`}>CA total</p>
              <p className={`text-sm font-semibold ${textPrimary}`}>
                {profitData.totalRevenu.toLocaleString('fr-FR')} €
              </p>
            </div>
            <div>
              <p className={`text-xs ${textMuted}`}>Bénéfice net</p>
              <p className="text-sm font-semibold" style={{ color: margeColor }}>
                {profitData.benefice.toLocaleString('fr-FR')} €
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {profitData.rentables} rentable{profitData.rentables > 1 ? 's' : ''}
              </span>
              {profitData.nonRentables > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {profitData.nonRentables} en déficit
                </span>
              )}
            </div>
          </div>
        </div>
      </WidgetContent>

      <WidgetFooter>
        <button
          onClick={() => setPage('chantiers')}
          className={`flex items-center gap-1 text-sm font-medium ${textMuted} hover:opacity-70`}
        >
          Voir les chantiers <ChevronRight size={14} />
        </button>
      </WidgetFooter>
    </div>
  );
}
