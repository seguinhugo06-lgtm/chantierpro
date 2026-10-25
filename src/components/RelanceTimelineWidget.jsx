/**
 * RelanceTimelineWidget — Timeline of relance executions for a document
 * Shows the complete reminder history and upcoming steps.
 * @module RelanceTimelineWidget
 */

import { useState, useMemo } from 'react';
import {
  BellRing,
  Check,
  Clock,
  XCircle,
  Eye,
  MousePointer2,
  Mail,
  MessageSquare,
  Send,
  Phone,
  ChevronDown,
  SkipForward,
  Ban,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  RELANCE_STATUS_LABELS,
  RELANCE_STATUS_COLORS,
  CHANNEL_LABELS,
  getNextStep,
} from '../lib/relanceUtils';
import { dateLue } from '../lib/dates';

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  email_sms: Send,
  whatsapp: Phone,
};

const STATUS_ICONS = {
  sent: Check,
  opened: Eye,
  clicked: MousePointer2,
  failed: XCircle,
  cancelled: Ban,
};

/**
 * @param {Object} props
 * @param {Array} props.executions - relance_executions for this document
 * @param {Array} props.steps - Configured steps (devisSteps or factureSteps)
 * @param {Object} props.doc - The document
 * @param {Function} [props.onSendNow] - Callback to send next relance immediately
 * @param {Function} [props.onSkipToNext] - Callback to skip to next step
 * @param {Function} [props.onExclude] - Callback to exclude this document
 * @param {boolean} props.isExcluded - Whether the document is excluded
 * @param {boolean} props.isEnabled - Whether relance system is enabled
 * @param {boolean} props.isDark
 * @param {string} props.couleur
 * @param {boolean} [props.modeDiscret]
 * @param {Function} [props.formatMoney]
 */
export default function RelanceTimelineWidget({
  executions = [],
  steps = [],
  doc,
  onSendNow,
  onSkipToNext,
  onExclude,
  isExcluded = false,
  isEnabled = false,
  isDark: _isDark,
  couleur: _couleur,
  modeDiscret: _modeDiscret,
  formatMoney: _formatMoney,
}) {
  const [showExcludeMenu, setShowExcludeMenu] = useState(false);

  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const cardBg = 'bg-surface';
  const borderColor = 'border-bord';
  // Anneau de focus clavier visible (a11y — WCAG 2.4.7), cohérent avec ui/
  const focusRing = cn(
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  );

  // Build timeline entries from executions + future steps
  const timeline = useMemo(() => {
    const enabledSteps = steps.filter(s => s.enabled);

    const entries = [];

    for (const step of enabledSteps) {
      const execution = executions.find(
        e => e.step_id === step.id && e.status !== 'cancelled'
      );

      if (execution) {
        entries.push({
          type: 'executed',
          step,
          execution,
          date: new Date(execution.created_at),
          status: execution.status,
        });
      } else {
        // Future step
        const nextInfo = getNextStep(doc, executions, [step]);
        entries.push({
          type: 'future',
          step,
          execution: null,
          dueDate: nextInfo?.dueDate || null,
          daysUntilDue: nextInfo?.daysUntilDue || null,
          isDue: nextInfo?.isDue || false,
        });
      }
    }

    return entries;
  }, [steps, executions, doc]);

  // Next step info
  const nextStep = useMemo(() => {
    return getNextStep(doc, executions, steps);
  }, [doc, executions, steps]);

  if (!isEnabled && executions.length === 0) return null;

  const ChannelIcon = (channel) => CHANNEL_ICONS[channel] || Mail;

  return (
    <div className={cn('rounded-xl border p-4', cardBg, borderColor)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-accent-texte" />
          <span className={cn('text-sm font-semibold', textPrimary)}>
            {isExcluded ? 'Relances désactivées' : isEnabled ? 'Relance automatique' : 'Historique relances'}
          </span>
          {executions.length > 0 && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-medium',
              'bg-surface-2 text-encre-2'
            )}>
              {executions.filter(e => e.status !== 'cancelled').length} envoyée{executions.filter(e => e.status !== 'cancelled').length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Exclude dropdown */}
        {onExclude && !isExcluded && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExcludeMenu(!showExcludeMenu)}
              aria-haspopup="menu"
              aria-expanded={showExcludeMenu}
              className={cn(
                'flex items-center gap-1 px-2 py-1 min-h-[32px] rounded-lg text-xs font-medium transition-colors',
                focusRing,
                'text-encre-3 hover:bg-surface-2'
              )}
            >
              <Ban className="w-3 h-3" />
              Exclure
              <ChevronDown className="w-3 h-3" />
            </button>
            {showExcludeMenu && (
              <>
                {/* Backdrop : ferme au clic extérieur (a11y — dismiss) */}
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setShowExcludeMenu(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div
                  role="menu"
                  aria-label="Exclure des relances"
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowExcludeMenu(false); }}
                  className={cn(
                    'absolute right-0 top-full mt-1 w-52 rounded-lg border shadow-lg z-20 py-1',
                    'bg-surface border-bord'
                  )}
                >
                  {[
                    { scope: 'document', reason: 'manual', label: 'Exclure ce document' },
                    { scope: 'client', reason: 'manual', label: 'Exclure ce client' },
                    { scope: 'document', reason: 'arrangement', label: 'Arrangement de paiement' },
                    { scope: 'document', reason: 'dispute', label: 'Litige en cours' },
                  ].map(opt => (
                    <button
                      key={`${opt.scope}-${opt.reason}`}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onExclude(opt.scope, opt.reason);
                        setShowExcludeMenu(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 min-h-[40px] text-xs transition-colors',
                        focusRing,
                        'text-encre-2 hover:bg-surface-2'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {isExcluded && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <Ban className="w-3 h-3" />
            Exclu
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {timeline.map((entry, index) => {
          const isLast = index === timeline.length - 1;
          const CIcon = ChannelIcon(entry.step.channel);
          const SIcon = entry.type === 'executed' ? (STATUS_ICONS[entry.status] || Check) : Clock;

          return (
            <div key={entry.step.id} className="relative flex gap-3">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                    entry.type === 'executed'
                      ? (RELANCE_STATUS_COLORS[entry.status]?.bg || 'bg-blue-100')
                      : entry.isDue
                        ? 'bg-amber-100'
                        : 'bg-surface-2'
                  )}
                >
                  <SIcon className={cn(
                    'w-3 h-3',
                    entry.type === 'executed'
                      ? (RELANCE_STATUS_COLORS[entry.status]?.text || 'text-blue-600')
                      : entry.isDue
                        ? 'text-amber-600'
                        : textMuted
                  )} />
                </div>
                {!isLast && (
                  <div className={cn(
                    'w-0.5 flex-1 min-h-[16px] bg-bord',
                  )} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-3 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    'text-xs font-semibold',
                    entry.type === 'executed' ? 'text-encre' : textMuted
                  )}>
                    J+{entry.step.delay}
                  </span>
                  <span className={cn('text-sm font-medium', textPrimary)}>
                    {entry.step.name}
                  </span>
                  <span className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                    'bg-surface-2 text-encre-3'
                  )}>
                    <CIcon className="w-3 h-3" />
                    {CHANNEL_LABELS[entry.step.channel] || entry.step.channel}
                  </span>
                </div>

                {entry.type === 'executed' && (
                  <div className={cn('text-xs mt-0.5', textMuted)}>
                    {RELANCE_STATUS_LABELS[entry.status] || entry.status} le {' '}
                    {dateLue(entry.execution.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    {entry.execution.opened_at && (
                      <span className="ml-2 text-green-600">
                        Ouvert le {dateLue(entry.execution.opened_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short',
                        })}
                      </span>
                    )}
                    {entry.execution.clicked_at && (
                      <span className="ml-2 text-emerald-600">
                        Cliqué le {dateLue(entry.execution.clicked_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short',
                        })}
                      </span>
                    )}
                    {entry.status === 'failed' && entry.execution.error_message && (
                      <span className="ml-2 text-red-500">
                        {entry.execution.error_message}
                      </span>
                    )}
                  </div>
                )}

                {entry.type === 'future' && (
                  <div className={cn('text-xs mt-0.5', textMuted)}>
                    {entry.isDue ? (
                      <span className="text-amber-600 font-medium">
                        En retard de {Math.abs(entry.daysUntilDue)} jour{Math.abs(entry.daysUntilDue) !== 1 ? 's' : ''}
                      </span>
                    ) : entry.dueDate ? (
                      <span>
                        Programmée le {entry.dueDate.toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {entry.daysUntilDue > 0 && ` (dans ${entry.daysUntilDue} jour${entry.daysUntilDue !== 1 ? 's' : ''})`}
                      </span>
                    ) : (
                      <span>En attente</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {isEnabled && !isExcluded && (onSendNow || onSkipToNext) && (
        <div className={cn(
          'flex items-center gap-2 mt-2 pt-3 border-t',
          'border-bord'
        )}>
          {onSendNow && nextStep && (
            <button
              type="button"
              onClick={onSendNow}
              className={cn(
                'flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[36px] rounded-full text-sm font-semibold transition-colors bg-surface text-encre border border-bord-fort hover:bg-surface-2',
                focusRing
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              Relancer maintenant
            </button>
          )}
          {onSkipToNext && nextStep && (
            <button
              type="button"
              onClick={onSkipToNext}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] sm:min-h-[32px] rounded-lg text-xs font-medium transition-colors',
                focusRing,
                'text-encre-3 hover:bg-surface-2'
              )}
            >
              <SkipForward className="w-3.5 h-3.5" />
              Sauter l'étape
            </button>
          )}
        </div>
      )}
    </div>
  );
}
