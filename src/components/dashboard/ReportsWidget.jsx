/**
 * ReportsWidget — Dashboard widget showing last generated report
 * Allows quick navigation to Finances > Rapports tab
 */

import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Wallet, HardHat, Download, ChevronRight, Loader2 } from 'lucide-react';
import Widget, { WidgetHeader, WidgetContent, WidgetFooter, WidgetEmptyState } from './Widget';
import supabase, { isDemo } from '../../supabaseClient';
import { cn } from '../../lib/utils';
import { captureException } from '../../lib/sentry';

const TYPE_ICONS = {
  activite: TrendingUp,
  financier: Wallet,
  chantier: HardHat,
};

const TYPE_COLORS = {
  activite: '#3b82f6',
  financier: '#8b5cf6',
  chantier: '#f97316',
};

const TYPE_LABELS = {
  activite: "Rapport d'activité",
  financier: 'Rapport financier',
  chantier: 'Rapport chantier',
};

export default function ReportsWidget({ isDark = false, setPage }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestReports();
  }, []);

  const fetchLatestReports = async () => {
    if (isDemo || !supabase) {
      // Demo data
      const now = new Date();
      setReports([
        {
          id: 'demo_1',
          type: 'activite',
          titre: `Rapport d'activité — ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
          page_count: 4,
          auto_genere: false,
          created_at: now.toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('rapports')
        .select('id, type, titre, page_count, auto_genere, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      if (data) setReports(data);
    } catch (e) {
      captureException(e, { context: 'ReportsWidget: Error fetching reports' });
    } finally {
      setLoading(false);
    }
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  return (
    <Widget isDark={isDark}>
      <WidgetHeader
        title="Rapports PDF"
        icon={<FileText />}
        isDark={isDark}
      />
      <WidgetContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className={`animate-spin ${textMuted}`} />
          </div>
        ) : reports.length === 0 ? (
          <WidgetEmptyState
            icon={<FileText />}
            title="Aucun rapport"
            description="Générez votre premier rapport PDF depuis Finances > Rapports"
            ctaLabel="Générer un rapport"
            onCtaClick={() => setPage('finances')}
            isDark={isDark}
          />
        ) : (
          <div className="space-y-2">
            {reports.map(r => {
              const Icon = TYPE_ICONS[r.type] || FileText;
              const color = TYPE_COLORS[r.type] || '#6b7280';
              return (
                <div
                  key={r.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer',
                    isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
                  )}
                  onClick={() => setPage('finances')}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', textPrimary)}>{r.titre}</p>
                    <p className={cn('text-xs', textMuted)}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—'}
                      {r.page_count ? ` · ${r.page_count} pages` : ''}
                      {r.auto_genere ? ' · Auto' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </WidgetContent>
      <WidgetFooter isDark={isDark}>
        <button
          onClick={() => setPage('finances')}
          className={cn(
            'flex items-center gap-1 text-sm font-medium transition-colors',
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          )}
        >
          Tous les rapports <ChevronRight size={14} />
        </button>
      </WidgetFooter>
    </Widget>
  );
}
