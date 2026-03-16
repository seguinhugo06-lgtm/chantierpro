import React, { useMemo } from 'react';
import { CreditCard, Receipt, ClipboardList, CheckCircle, Circle, ChevronRight, BarChart3, AlertTriangle } from 'lucide-react';
import {
  ETAPE_STATUT,
  ETAPE_STATUT_LABELS,
  ETAPE_STATUT_COLORS,
  getEcheancierProgress,
  getNextEtapeAFacturer,
} from '../../lib/acompteUtils';
import { cn } from '../../lib/utils';

/**
 * AcompteSuiviCard — Displays invoicing options or échéancier progress on a devis.
 *
 * Two modes:
 * 1. With échéancier: shows progress bar + step list + "Facturer l'étape suivante" button
 * 2. Without échéancier: shows invoicing option cards (Acompte / Facturer 100% / Échéancier)
 *
 * Also handles the legacy single-acompte display (backward compatibility).
 */
export default function AcompteSuiviCard({
  devis,
  echeancier,
  facturesLiees = [],
  allDevis = [],
  isDark = false,
  couleur = '#f97316',
  textPrimary,
  textMuted,
  modeDiscret = false,
  formatMoney: fm,
  // Actions
  onFacturerEtape,
  onFacturerSolde,
  onOpenAcompteSimple,
  onOpenEcheancierModal,
  onSelectFacture,
  onFacturer100,
  onOpenSituation,
  // Status helpers
  canAcompte = false,
  canFacturer = false,
  hasChantier = false,
  acompteFacture = null,
  resteAFacturer = 0,
}) {
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // --- Mode 1: Échéancier exists ---
  if (echeancier && echeancier.etapes?.length > 0) {
    const progress = getEcheancierProgress(echeancier.etapes);
    const nextEtape = getNextEtapeAFacturer(echeancier.etapes);
    const templateLabel = echeancier.template_key && echeancier.template_key !== 'custom'
      ? echeancier.template_key.replace(/-/g, '/')
      : 'Personnalisé';

    return (
      <div className={cn('rounded-xl border p-4', isDark ? 'bg-blue-900/10 border-blue-800' : 'bg-blue-50/50 border-blue-200')}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            <span className={cn('text-sm font-medium', isDark ? 'text-blue-400' : 'text-blue-700')}>
              Échéancier {templateLabel}
            </span>
          </div>
          <span className={cn('text-xs font-medium', textMuted)}>
            {progress.etapesFacturees}/{progress.totalEtapes} facturé{progress.etapesFacturees > 1 ? 's' : ''}
          </span>
        </div>

        {/* Progress bar */}
        <div className={cn('h-2 rounded-full mb-4', isDark ? 'bg-slate-700' : 'bg-blue-200')}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress.pourcentageFacture}%`,
              backgroundColor: couleur,
            }}
          />
        </div>

        {/* Steps list */}
        <div className="space-y-1.5">
          {echeancier.etapes.map((etape) => {
            const isFacture = etape.statut === ETAPE_STATUT.FACTURE || etape.statut === ETAPE_STATUT.PAYE;
            const isNext = nextEtape && etape.numero === nextEtape.numero;
            const linkedFacture = etape.facture_id
              ? allDevis.find(d => d.id === etape.facture_id) || facturesLiees.find(f => f.id === etape.facture_id)
              : null;
            const colorClass = ETAPE_STATUT_COLORS[etape.statut] || ETAPE_STATUT_COLORS.a_facturer;

            return (
              <div
                key={etape.numero}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all',
                  isNext && (isDark ? 'bg-slate-700/50' : 'bg-white shadow-sm'),
                  isFacture && linkedFacture && 'cursor-pointer',
                  isFacture && linkedFacture && (isDark ? 'hover:bg-slate-700/30' : 'hover:bg-blue-50'),
                )}
                onClick={() => isFacture && linkedFacture && onSelectFacture?.(linkedFacture)}
              >
                {/* Status icon */}
                {isFacture ? (
                  <CheckCircle size={16} className={etape.statut === ETAPE_STATUT.PAYE ? 'text-emerald-500' : 'text-blue-500'} />
                ) : (
                  <Circle size={16} className={isNext ? 'text-orange-400' : (isDark ? 'text-slate-600' : 'text-slate-300')} />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', textPrimary)}>
                    {etape.label}
                  </p>
                  <p className={cn('text-xs', textMuted)}>
                    {etape.pourcentage}%
                    {linkedFacture ? ` · ${linkedFacture.numero}` : ''}
                    {etape.date_facture ? ` · ${new Date(etape.date_facture).toLocaleDateString('fr-FR')}` : ''}
                  </p>
                </div>

                {/* Amount */}
                <span className={cn('text-sm font-semibold whitespace-nowrap', isFacture ? (isDark ? 'text-blue-300' : 'text-blue-600') : textPrimary)}>
                  {modeDiscret ? '·····' : fm(etape.montant_ttc)}
                </span>

                {/* Badge */}
                <span className={cn('text-xs px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap', isDark ? colorClass.dark : colorClass.light)}>
                  {ETAPE_STATUT_LABELS[etape.statut]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Reste à facturer + Action button */}
        {nextEtape && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className={cn('text-xs', textMuted)}>Reste à facturer</span>
              <span className={cn('text-sm font-bold', textPrimary)}>
                {modeDiscret ? '·····' : fm(progress.resteAFacturer)}
              </span>
            </div>
            <button
              onClick={() => onFacturerEtape?.(echeancier, nextEtape)}
              className="w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm text-white"
              style={{ backgroundColor: couleur }}
            >
              <Receipt size={16} />
              Facturer : {nextEtape.label} ({nextEtape.pourcentage}%)
            </button>
          </div>
        )}

        {/* All invoiced */}
        {!nextEtape && (
          <div className={cn('mt-3 text-center py-2 rounded-lg', isDark ? 'bg-emerald-900/20' : 'bg-emerald-50')}>
            <p className={cn('text-sm font-medium', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
              <CheckCircle size={14} className="inline mr-1" />
              Échéancier terminé — Toutes les étapes facturées
            </p>
          </div>
        )}
      </div>
    );
  }

  // --- Mode 2: Legacy single acompte (backward compat) ---
  if (devis.statut === 'acompte_facture' && !echeancier) {
    return (
      <div className={cn('rounded-xl border p-4', isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200')}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            <span className={cn('text-sm font-medium', isDark ? 'text-blue-400' : 'text-blue-700')}>
              Acompte {devis.acompte_pct}% facturé
            </span>
            {acompteFacture && (
              <button
                onClick={() => onSelectFacture?.(acompteFacture)}
                className="text-xs text-blue-500 hover:underline"
              >
                ({acompteFacture.numero})
              </button>
            )}
          </div>
          <span className={cn('font-bold', textPrimary)}>
            {modeDiscret ? '·····' : fm(resteAFacturer)} restant
          </span>
        </div>
        <div className={cn('h-2 rounded-full mb-3', isDark ? 'bg-slate-700' : 'bg-blue-200')}>
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${devis.acompte_pct}%` }} />
        </div>
        {canFacturer && (
          <button
            onClick={onFacturerSolde}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Receipt size={16} /> Facturer le solde
          </button>
        )}
      </div>
    );
  }

  // --- Mode 3: Devis accepted/signed — show invoicing options ---
  if (canAcompte || canFacturer) {
    return (
      <div className={cn(
        'rounded-xl border p-4',
        (devis.statut === 'accepte' || devis.statut === 'signe')
          ? (isDark ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200')
          : (isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'),
      )}>
        <div className="flex items-center gap-2 mb-3">
          {(devis.statut === 'accepte' || devis.statut === 'signe') ? (
            <>
              <CheckCircle size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              <p className={cn('text-sm font-medium', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                Devis signé — Choisir le mode de facturation
              </p>
            </>
          ) : (
            <>
              <Receipt size={18} className={textMuted} />
              <p className={cn('text-sm font-medium', textMuted)}>Options de facturation</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {canAcompte && (
            <button
              onClick={onOpenAcompteSimple}
              className={cn(
                'p-3 rounded-lg border text-left transition-all hover:shadow-md',
                isDark ? 'border-purple-700 bg-purple-900/30 hover:bg-purple-900/50' : 'border-purple-200 bg-white hover:bg-purple-50',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={16} className="text-purple-500" />
                <span className={cn('font-medium text-sm', textPrimary)}>Acompte %</span>
              </div>
              <p className={cn('text-xs', textMuted)}>Acompte unique</p>
            </button>
          )}

          {canAcompte && (
            <button
              onClick={onOpenEcheancierModal}
              className={cn(
                'p-3 rounded-lg border text-left transition-all hover:shadow-md',
                isDark ? 'border-blue-700 bg-blue-900/30 hover:bg-blue-900/50' : 'border-blue-200 bg-white hover:bg-blue-50',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList size={16} className="text-blue-500" />
                <span className={cn('font-medium text-sm', textPrimary)}>Échéancier</span>
              </div>
              <p className={cn('text-xs', textMuted)}>Multi-étapes</p>
            </button>
          )}

          {canFacturer && (
            <button
              onClick={onFacturer100}
              className={cn(
                'p-3 rounded-lg border text-left transition-all hover:shadow-md',
                isDark ? 'border-emerald-700 bg-emerald-900/30 hover:bg-emerald-900/50' : 'border-emerald-200 bg-white hover:bg-emerald-50',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Receipt size={16} className="text-emerald-500" />
                <span className={cn('font-medium text-sm', textPrimary)}>100%</span>
              </div>
              <p className={cn('text-xs', textMuted)}>{modeDiscret ? '·····' : fm(devis.total_ttc)}</p>
            </button>
          )}

          {canFacturer && hasChantier && onOpenSituation && (
            <button
              onClick={onOpenSituation}
              className={cn(
                'p-3 rounded-lg border text-left transition-all hover:shadow-md',
                isDark ? 'border-orange-700 bg-orange-900/30 hover:bg-orange-900/50' : 'border-orange-200 bg-white hover:bg-orange-50',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={16} className="text-orange-500" />
                <span className={cn('font-medium text-sm', textPrimary)}>Situation</span>
              </div>
              <p className={cn('text-xs', textMuted)}>Par avancement</p>
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Mode 4: Devis not yet accepted — show guidance ---
  return (
    <div className={cn('rounded-xl border p-4', isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200')}>
      <div className="flex items-center gap-2 mb-1">
        <Receipt size={18} className={textMuted} />
        <p className={cn('text-sm font-medium', textMuted)}>Options de facturation</p>
        {devis.statut === 'brouillon' && (
          <span className={cn('text-xs px-2 py-0.5 rounded', isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700')}>
            Envoyer d'abord recommandé
          </span>
        )}
        {(devis.statut === 'envoye' || devis.statut === 'vu') && (
          <span className={cn('text-xs px-2 py-0.5 rounded', isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700')}>
            Signature recommandée
          </span>
        )}
      </div>
      <p className={cn('text-xs mt-1', textMuted)}>
        {devis.statut === 'brouillon'
          ? 'Envoyez le devis au client pour pouvoir le facturer ensuite.'
          : devis.statut === 'envoye' || devis.statut === 'vu'
            ? 'Le client doit d\'abord accepter le devis avant facturation.'
            : 'Ce statut ne permet pas encore la facturation.'}
      </p>
    </div>
  );
}
