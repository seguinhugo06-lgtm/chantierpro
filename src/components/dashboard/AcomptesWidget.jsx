/**
 * AcomptesWidget — Dashboard widget showing pending acompte steps to invoice.
 * Displays devis with active échéanciers and their next steps to invoice.
 */

import React, { useMemo } from 'react';
import { CreditCard, Receipt, ChevronRight, CheckCircle, Circle, ClipboardList } from 'lucide-react';
import Widget, { WidgetHeader, WidgetContent, WidgetEmptyState } from './Widget';
import { cn } from '../../lib/utils';

export default function AcomptesWidget({
  devis = [],
  isDark = false,
  couleur = '#f97316',
  formatMoney,
  setPage,
  setSelected,
}) {
  const fm = formatMoney || ((n) => `${(n || 0).toFixed(2)} €`);

  // Find devis with active acomptes (acompte_facture status or with echeancier_id)
  const acompteDevis = useMemo(() => {
    return devis
      .filter(d =>
        d.type === 'devis' &&
        (d.statut === 'acompte_facture' || d.echeancier_id) &&
        d.statut !== 'facture'
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [devis]);

  // Also find unpaid acompte/solde factures
  const pendingFactures = useMemo(() => {
    return devis
      .filter(d =>
        d.type === 'facture' &&
        (d.facture_type === 'acompte' || d.facture_type === 'solde') &&
        d.statut !== 'payee'
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
  }, [devis]);

  const totalPending = acompteDevis.length + pendingFactures.length;

  if (totalPending === 0) {
    return (
      <Widget isDark={isDark}>
        <WidgetHeader
          title="Acomptes"
          icon={<CreditCard size={16} />}
          isDark={isDark}
          couleur={couleur}
        />
        <WidgetEmptyState
          isDark={isDark}
          icon={<CreditCard size={24} />}
          message="Aucun acompte en cours"
        />
      </Widget>
    );
  }

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <Widget isDark={isDark}>
      <WidgetHeader
        title="Acomptes"
        icon={<CreditCard size={16} />}
        isDark={isDark}
        couleur={couleur}
        badge={totalPending > 0 ? `${totalPending}` : null}
      />
      <WidgetContent isDark={isDark}>
        <div className="space-y-2">
          {/* Devis with active acomptes */}
          {acompteDevis.map(d => {
            const pctFacture = d.acompte_pct || 0;
            const montantFacture = d.montant_facture || 0;
            const reste = (d.total_ttc || 0) - montantFacture;

            return (
              <div
                key={d.id}
                onClick={() => {
                  if (setSelected) setSelected(d);
                  if (setPage) setPage('devis');
                }}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors',
                  isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50',
                )}
              >
                <div className="relative w-9 h-9 flex-shrink-0">
                  <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke={couleur} strokeWidth="3"
                      strokeDasharray={`${pctFacture * 0.942} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={cn('absolute inset-0 flex items-center justify-center text-[9px] font-bold', textPrimary)}>
                    {pctFacture}%
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', textPrimary)}>
                    {d.numero || 'Devis'}
                  </p>
                  <p className={cn('text-xs truncate', textMuted)}>
                    Reste : {fm(reste)}
                  </p>
                </div>
                <ChevronRight size={14} className={textMuted} />
              </div>
            );
          })}

          {/* Pending acompte/solde factures */}
          {pendingFactures.length > 0 && acompteDevis.length > 0 && (
            <div className={cn('border-t pt-2 mt-1', isDark ? 'border-slate-700' : 'border-slate-200')}>
              <p className={cn('text-xs font-medium mb-1.5 px-1', textMuted)}>
                Factures d'acompte en attente
              </p>
            </div>
          )}
          {pendingFactures.map(f => (
            <div
              key={f.id}
              onClick={() => {
                if (setSelected) setSelected(f);
                if (setPage) setPage('devis');
              }}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors',
                isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50',
              )}
            >
              <Receipt size={16} className={f.facture_type === 'solde' ? 'text-emerald-500' : 'text-purple-500'} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium truncate', textPrimary)}>
                  {f.numero}
                </p>
                <p className={cn('text-xs truncate', textMuted)}>
                  {f.facture_type === 'solde' ? 'Solde' : `Acompte${f.acompte_pct ? ` ${f.acompte_pct}%` : ''}`}
                </p>
              </div>
              <span className={cn('text-sm font-semibold', textPrimary)}>
                {fm(f.total_ttc)}
              </span>
            </div>
          ))}
        </div>
      </WidgetContent>
    </Widget>
  );
}
