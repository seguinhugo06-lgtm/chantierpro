import { useMemo, useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, ChevronRight, ChevronDown, X, Rocket, Users, HardHat, FileText, ClipboardList, Palette, PartyPopper } from 'lucide-react';

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
 * CSS confetti animation (no external library)
 */
function ConfettiEffect({ couleur }) {
  const colors = [couleur, '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute block rounded-sm"
          style={{
            width: `${6 + Math.random() * 6}px`,
            height: `${6 + Math.random() * 6}px`,
            backgroundColor: colors[i % colors.length],
            left: `${5 + Math.random() * 90}%`,
            top: '-10px',
            opacity: 0,
            animation: `confettiFall ${1.5 + Math.random() * 1.5}s ease-out ${Math.random() * 0.5}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { opacity: 1; top: -10px; transform: rotate(0deg) translateX(0); }
          100% { opacity: 0; top: 100%; transform: rotate(${360 + Math.random() * 360}deg) translateX(${-30 + Math.random() * 60}px); }
        }
      `}</style>
    </div>
  );
}

/**
 * OnboardingChecklist — Guides new users through first steps
 * - Auto-collapses when ≥4/5 steps done
 * - Confetti animation at 5/5 completion
 * - Permanently hidden after completion (localStorage onboarding_completed)
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
    localStorage.getItem('chantierpro_onboarding_completed') === 'true' ||
    localStorage.getItem('chantierpro_onboarding_checklist_dismissed') === 'true'
  );

  // Track first time checklist was seen (for 14-day auto-dismiss)
  useEffect(() => {
    if (!localStorage.getItem('chantierpro_onboarding_first_seen')) {
      localStorage.setItem('chantierpro_onboarding_first_seen', Date.now().toString());
    }
  }, []);

  const data = useMemo(() => ({ clients, chantiers, devis, memos, couleur }), [clients, chantiers, devis, memos, couleur]);

  const completedSteps = useMemo(() => STEPS.filter(s => s.check(data)), [data]);
  const completedCount = completedSteps.length;
  const allDone = completedCount === STEPS.length;
  const almostDone = completedCount >= 4 && !allDone;

  // Auto-collapse when ≥4 steps done
  const [collapsed, setCollapsed] = useState(() => completedCount >= 4);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevCount = useRef(completedCount);

  // Detect 5/5 completion for confetti + permanent hide
  useEffect(() => {
    if (allDone && !dismissed) {
      // Show confetti
      setShowConfetti(true);

      const timer = setTimeout(() => {
        setDismissed(true);
        localStorage.setItem('chantierpro_onboarding_completed', 'true');
        localStorage.setItem('chantierpro_onboarding_checklist_dismissed', 'true');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [allDone, dismissed]);

  // Auto-collapse when reaching 4 steps
  useEffect(() => {
    if (completedCount >= 4 && prevCount.current < 4) {
      setCollapsed(true);
    }
    prevCount.current = completedCount;
  }, [completedCount]);

  // Don't show if permanently completed, dismissed, or 14 days elapsed
  const firstSeen = parseInt(localStorage.getItem('chantierpro_onboarding_first_seen') || '0');
  const daysSinceFirstSeen = firstSeen ? (Date.now() - firstSeen) / (1000 * 60 * 60 * 24) : 0;
  if (dismissed || daysSinceFirstSeen > 14) return null;

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

  const progress = (completedCount / STEPS.length) * 100;

  // Collapsed view: just a button to expand
  if (collapsed && !allDone) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={`w-full rounded-2xl border ${tc.card} p-4 flex items-center justify-between transition-colors ${tc.hover}`}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${couleur}15` }}
          >
            <Rocket size={16} style={{ color: couleur }} />
          </div>
          <span className={`text-sm font-medium ${tc.text}`}>
            Voir les étapes ({completedCount}/{STEPS.length} ✓)
          </span>
        </div>
        <ChevronDown size={16} className={tc.muted} />
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border ${tc.card} p-5 relative overflow-hidden`}>
      {/* Confetti at 5/5 */}
      {showConfetti && <ConfettiEffect couleur={couleur} />}

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors z-20 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
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
          {allDone ? <PartyPopper size={20} style={{ color: couleur }} /> : <Rocket size={20} style={{ color: couleur }} />}
        </div>
        <div>
          <h2 className={`text-sm font-semibold ${tc.text}`}>
            {allDone ? '🎉 Bravo, tout est prêt !' : 'Premiers pas'}
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

      {/* Collapse button when almost done */}
      {almostDone && (
        <button
          onClick={() => setCollapsed(true)}
          className={`mt-3 text-xs font-medium ${tc.muted} hover:underline`}
        >
          Replier
        </button>
      )}
    </div>
  );
}
