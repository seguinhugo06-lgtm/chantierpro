import React, { useMemo } from 'react';
import { Crown, ChevronRight, Users } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { WidgetHeader, WidgetContent, WidgetFooter, WidgetEmptyState } from './Widget';

/**
 * TopClientsWidget — Classement des meilleurs clients par CA facturé.
 */
export default function TopClientsWidget({ setPage, isDark, maxDisplay = 5 }) {
  const { devis = [], clients = [] } = useData();

  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  // Compute revenue per client from invoices
  const topClients = useMemo(() => {
    const factures = devis.filter(d => d.type === 'facture');
    const revenueMap = {};

    factures.forEach(f => {
      const cid = f.client_id;
      if (!cid) return;
      if (!revenueMap[cid]) {
        revenueMap[cid] = { clientId: cid, total: 0, count: 0 };
      }
      revenueMap[cid].total += (f.total_ttc || 0);
      revenueMap[cid].count += 1;
    });

    return Object.values(revenueMap)
      .map(r => {
        const client = clients.find(c => c.id === r.clientId);
        return { ...r, client };
      })
      .filter(r => r.client)
      .sort((a, b) => b.total - a.total)
      .slice(0, maxDisplay);
  }, [devis, clients, maxDisplay]);

  const maxTotal = topClients[0]?.total || 1;

  const medalColors = ['#f59e0b', '#94a3b8', '#cd7f32'];

  if (topClients.length === 0) {
    return (
      <div className={`rounded-2xl border ${cardBg} p-5`}>
        <WidgetHeader icon={Crown} iconColor="#f59e0b" title="Top clients" isDark={isDark} />
        <WidgetEmptyState icon={Users} message="Aucune facture encore" isDark={isDark} />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${cardBg} p-5`}>
      <WidgetHeader icon={Crown} iconColor="#f59e0b" title="Top clients" isDark={isDark} />

      <WidgetContent>
        <div className="space-y-3">
          {topClients.map((item, i) => {
            const pct = Math.round((item.total / maxTotal) * 100);
            return (
              <div key={item.clientId} className="flex items-center gap-3">
                {/* Rank */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: i < 3 ? `${medalColors[i]}20` : (isDark ? '#334155' : '#f1f5f9'),
                    color: i < 3 ? medalColors[i] : (isDark ? '#94a3b8' : '#64748b'),
                  }}
                >
                  {i + 1}
                </div>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <p className={`text-sm font-medium truncate ${textPrimary}`}>
                      {item.client.nom} {item.client.prenom || ''}
                    </p>
                    <span className={`text-xs font-medium ml-2 flex-shrink-0 ${textMuted}`}>
                      {item.total.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: i < 3 ? medalColors[i] : '#94a3b8' }}
                    />
                  </div>
                  <p className={`text-xs mt-0.5 ${textMuted}`}>
                    {item.count} facture{item.count > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </WidgetContent>

      <WidgetFooter>
        <button
          onClick={() => setPage('clients')}
          className={`flex items-center gap-1 text-sm font-medium ${textMuted} hover:opacity-70`}
        >
          Tous les clients <ChevronRight size={14} />
        </button>
      </WidgetFooter>
    </div>
  );
}
