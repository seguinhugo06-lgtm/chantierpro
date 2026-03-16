/**
 * ConsolidatedWidget.jsx — Multi-entreprise consolidated overview
 *
 * Shows a CA breakdown by entreprise when hasMultiple === true.
 * Displays:
 * - Total CA consolidated
 * - Breakdown bar per entreprise (color + name + amount + %)
 * - Quick stats: devis en attente, factures impayées
 *
 * Clicks on an entreprise row switches to it.
 */

import React, { useMemo, memo } from 'react';
import { Building2, ChevronRight, TrendingUp } from 'lucide-react';
import { useEntreprise } from '../../context/EntrepriseContext';
import { formatMoney } from '../../lib/formatters';

const ConsolidatedWidget = memo(function ConsolidatedWidget({
  devis = [],
  isDark = false,
  modeDiscret = false,
  couleur = '#f97316',
}) {
  const { entreprises, activeEntreprise, switchEntreprise, hasMultiple } = useEntreprise();

  // Don't render if only 1 entreprise
  if (!hasMultiple) return null;

  // Compute stats per entreprise from available devis data
  const stats = useMemo(() => {
    const byEnt = {};

    // Initialize all entreprises
    entreprises.forEach(ent => {
      byEnt[ent.id] = {
        id: ent.id,
        nom: ent.nomCourt || ent.nom,
        couleur: ent.couleur || '#94a3b8',
        initiales: ent.initiales || (ent.nom || '').slice(0, 2).toUpperCase(),
        ca: 0,
        devisEnAttente: 0,
        facturesImpayees: 0,
      };
    });

    // Aggregate devis by entreprise
    devis.forEach(d => {
      const entId = d.entrepriseId || d.entreprise_id;
      if (!entId || !byEnt[entId]) return;

      const isFact = d.type === 'facture';
      const isDevis = d.type === 'devis' || !d.type;

      if (isFact && ['accepte', 'payee', 'facture'].includes(d.statut)) {
        byEnt[entId].ca += d.total_ttc || d.total_ht || 0;
      }
      if (isFact && d.statut === 'envoye') {
        byEnt[entId].facturesImpayees++;
      }
      if (isDevis && ['envoye', 'vu'].includes(d.statut)) {
        byEnt[entId].devisEnAttente++;
      }
    });

    const list = Object.values(byEnt);
    const totalCA = list.reduce((sum, s) => sum + s.ca, 0);
    return { list, totalCA };
  }, [devis, entreprises]);

  return (
    <div
      className={`
        rounded-2xl border overflow-hidden transition-shadow duration-200 hover:shadow-md
        ${isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-gray-100 shadow-sm'}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 p-5 pb-4">
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${isDark ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
          <TrendingUp size={18} className="text-purple-500" />
        </div>
        <div className="flex-1">
          <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Vue consolidée
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {entreprises.length} entreprises
          </p>
        </div>
        {!modeDiscret && (
          <div className="text-right">
            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatMoney(stats.totalCA)}
            </p>
            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              CA total
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!modeDiscret && stats.totalCA > 0 && (
        <div className="px-5 pb-3">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700">
            {stats.list
              .filter(s => s.ca > 0)
              .map(s => (
                <div
                  key={s.id}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(s.ca / stats.totalCA) * 100}%`,
                    background: s.couleur,
                  }}
                  title={`${s.nom}: ${formatMoney(s.ca)}`}
                />
              ))}
          </div>
        </div>
      )}

      {/* Entreprise rows */}
      <div className="px-5 pb-5 space-y-1.5">
        {stats.list.map(s => {
          const isActive = s.id === activeEntreprise?.id;
          const pct = stats.totalCA > 0 ? ((s.ca / stats.totalCA) * 100).toFixed(0) : 0;

          return (
            <button
              key={s.id}
              onClick={() => switchEntreprise(s.id)}
              className={`
                w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors
                ${isActive
                  ? isDark ? 'bg-slate-700/50' : 'bg-gray-50'
                  : isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'
                }
              `}
            >
              {/* Color dot */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
                style={{ background: s.couleur }}
              >
                {s.initiales}
              </div>

              {/* Name + stats */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {s.nom}
                </p>
                <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {s.devisEnAttente > 0 && (
                    <span>{s.devisEnAttente} devis en attente</span>
                  )}
                  {s.facturesImpayees > 0 && (
                    <span>{s.facturesImpayees} factures impayées</span>
                  )}
                  {s.devisEnAttente === 0 && s.facturesImpayees === 0 && (
                    <span>Aucune action</span>
                  )}
                </div>
              </div>

              {/* Amount + % */}
              {!modeDiscret && (
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatMoney(s.ca)}
                  </p>
                  {stats.totalCA > 0 && (
                    <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {pct}%
                    </p>
                  )}
                </div>
              )}

              <ChevronRight size={14} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default ConsolidatedWidget;
