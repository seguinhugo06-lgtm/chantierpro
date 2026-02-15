import { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronRight, X, Rocket, Users, HardHat, FileText, ClipboardList, Palette } from 'lucide-react';

const STEPS = [
  {
    key: 'client',
    label: 'Ajouter votre premier client',
    icon: Users,
    page: 'clients',
    check: (data) => data.clients.length > 0,
  },
  {
    key: 'chantier',
    label: 'Créer votre premier chantier',
    icon: HardHat,
    page: 'chantiers',
    check: (data) => data.chantiers.length > 0,
  },
  {
    key: 'devis',
    label: 'Créer votre premier devis',
    icon: FileText,
    page: 'devis',
    check: (data) => data.devis.length > 0,
  },
  {
    key: 'memo',
    label: 'Ajouter un mémo',
    icon: ClipboardList,
    page: 'memos',
    check: (data) => data.memos.length > 0,
  },
  {
    key: 'couleur',
    label: 'Personnaliser votre couleur',
    icon: Palette,
    page: 'settings',
    check: (data) => data.couleur !== '#f97316',
  },
];

/**
 * OnboardingChecklist — Guides new users through first steps
 * Shows on Dashboard until all 5 steps are completed or manually dismissed.
 * Persisted via localStorage key 'chantierpro_onboarding_checklist_dismissed'.
 */
export default function OnboardingChecklist({
  clients = [],
  chantiers = [],
  devis = [],
  memos = [],
  couleur = '#f97316',
  setPage,
  isDark = false,
}) {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('chantierpro_onboarding_checklist_dismissed') === 'true'
  );

  const data = useMemo(() => ({ clients, chantiers, devis, memos, couleur }), [clients, chantiers, devis, memos, couleur]);

  const completedSteps = useMemo(() => STEPS.filter(s => s.check(data)), [data]);
  const completedCount = completedSteps.length;
  const allDone = completedCount === STEPS.length;
  const progress = (completedCount / STEPS.length) * 100;

  // Auto-dismiss when all steps complete (after a brief celebration delay)
  useEffect(() => {
    if (allDone && !dismissed) {
      const timer = setTimeout(() => {
        setDismissed(true);
        localStorage.setItem('chantierpro_onboarding_checklist_dismissed', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allDone, dismissed]);

  // Don't show if dismissed or all done
  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('chantierpro_onboarding_checklist_dismissed', 'true');
  };

  const tc = {
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-900',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    hover: isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50',
    progressBg: isDark ? 'bg-slate-700' : 'bg-slate-100',
  };

  return (
    <div className={`rounded-2xl border ${tc.card} p-5 relative`}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
        title="Masquer"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${couleur}15` }}
        >
          <Rocket size={20} style={{ color: couleur }} />
        </div>
        <div>
          <h2 className={`text-sm font-semibold ${tc.text}`}>
            {allDone ? 'Bravo, tout est prêt !' : 'Premiers pas'}
          </h2>
          <p className={`text-xs ${tc.muted}`}>
            {allDone
              ? 'Vous avez complété toutes les étapes'
              : `${completedCount}/${STEPS.length} étapes complétées`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-2 rounded-full ${tc.progressBg} mb-4 overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%`, backgroundColor: couleur }}
        />
      </div>

      {/* Steps list */}
      <div className="space-y-1">
        {STEPS.map(step => {
          const isDone = step.check(data);
          const Icon = step.icon;

          return (
            <button
              key={step.key}
              onClick={() => !isDone && setPage?.(step.page)}
              disabled={isDone}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isDone
                  ? 'opacity-60 cursor-default'
                  : `cursor-pointer ${tc.hover}`
              }`}
            >
              {isDone ? (
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle size={18} className={`flex-shrink-0 ${tc.muted}`} />
              )}
              <Icon size={15} className={isDone ? 'text-emerald-500 flex-shrink-0' : `flex-shrink-0 ${tc.muted}`} />
              <span className={`text-sm flex-1 ${isDone ? 'line-through' : ''} ${tc.text}`}>
                {step.label}
              </span>
              {!isDone && (
                <ChevronRight size={14} className={`flex-shrink-0 ${tc.muted}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
