import React from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useData } from '../../context/DataContext';
import { WidgetHeader, WidgetContent, WidgetFooter } from './Widget';

/**
 * ConversionFunnelWidget — Visualise le taux de conversion devis → facture.
 */
export default function ConversionFunnelWidget({ setPage, isDark }) {
  const { devis = [] } = useData();

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Calculate funnel stats
  const total = devis.length;
  const brouillons = devis.filter(d => d.statut === 'brouillon').length;
  const envoyes = devis.filter(d => ['envoye', 'vu', 'signe'].includes(d.statut)).length;
  const signes = devis.filter(d => d.statut === 'signe').length;
  const factures = devis.filter(d => d.type === 'facture').length;
  const refuses = devis.filter(d => d.statut === 'refuse').length;

  const conversionRate = total > 0 ? Math.round((factures / Math.max(total - brouillons, 1)) * 100) : 0;

  const funnelData = [
    { name: 'Créés', value: total, color: '#94a3b8' },
    { name: 'Envoyés', value: envoyes + signes + factures, color: '#3b82f6' },
    { name: 'Signés', value: signes + factures, color: '#f59e0b' },
    { name: 'Facturés', value: factures, color: '#22c55e' },
  ];

  if (total === 0) return null;

  return (
    <div className={`rounded-2xl border ${cardBg} p-5`}>
      <WidgetHeader
        icon={TrendingUp}
        iconColor="#3b82f6"
        title="Tunnel de conversion"
        isDark={isDark}
      />

      <WidgetContent>
        {/* Conversion rate */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl font-bold" style={{ color: conversionRate >= 50 ? '#22c55e' : conversionRate >= 25 ? '#f59e0b' : '#ef4444' }}>
            {conversionRate}%
          </div>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Taux de conversion</p>
            <p className={`text-xs ${textMuted}`}>{factures} factures sur {total} devis</p>
          </div>
        </div>

        {/* Funnel chart */}
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={funnelData} layout="vertical" barCategoryGap={6}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={65}
              tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: isDark ? '#1e293b' : '#fff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v) => [v, 'Documents']}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {funnelData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Refusés */}
        {refuses > 0 && (
          <p className={`text-xs mt-2 ${textMuted}`}>
            {refuses} devis refusé{refuses > 1 ? 's' : ''}
          </p>
        )}
      </WidgetContent>

      <WidgetFooter>
        <button
          onClick={() => setPage('devis')}
          className={`flex items-center gap-1 text-sm font-medium ${textMuted} hover:opacity-70`}
        >
          Voir les devis <ChevronRight size={14} />
        </button>
      </WidgetFooter>
    </div>
  );
}
