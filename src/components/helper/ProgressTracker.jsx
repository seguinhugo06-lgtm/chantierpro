import { useState, useEffect, useMemo } from 'react';
import {
  Settings, User, FileText, Pen, CreditCard, LayoutGrid, PieChart,
  Check, Lock, ChevronRight, Sparkles, Trophy
} from 'lucide-react';

/**
 * Progress Tracker Widget
 * Shows user's journey progress through key milestones
 */
export default function ProgressTracker({
  milestones = {},
  onMilestoneClick,
  showCompact = false,
  isDark = false,
  couleur = '#f97316'
}) {
  // Default milestones with their status
  const defaultMilestones = [
    {
      id: 'setup',
      icon: Settings,
      label: 'Configuration complète',
      description: 'Remplir les informations de l\'entreprise',
      points: 10,
      action: 'open_settings'
    },
    {
      id: 'first_client',
      icon: User,
      label: 'Premier client créé',
      description: 'Ajouter votre premier client',
      points: 10,
      action: 'create_client'
    },
    {
      id: 'first_quote',
      icon: FileText,
      label: 'Premier devis créé',
      description: 'Créer votre premier devis',
      points: 20,
      action: 'create_quote'
    },
    {
      id: 'first_signature',
      icon: Pen,
      label: 'Première signature',
      description: 'Obtenir une signature électronique',
      points: 15,
      action: 'view_quotes'
    },
    {
      id: 'first_payment',
      icon: CreditCard,
      label: 'Premier paiement reçu',
      description: 'Recevoir un acompte via ChantierPro',
      points: 20,
      action: 'view_payments'
    },
    {
      id: 'template_used',
      icon: LayoutGrid,
      label: 'Template métier utilisé',
      description: 'Utiliser un modèle pré-rempli',
      points: 10,
      action: 'view_templates'
    },
    {
      id: 'dashboard_viewed',
      icon: PieChart,
      label: 'Dashboard consulté',
      description: 'Consulter le tableau de bord rentabilité',
      points: 15,
      action: 'view_dashboard'
    }
  ];

  // Calculate progress
  const progress = useMemo(() => {
    const completed = defaultMilestones.filter(m => milestones[m.id]);
    const totalPoints = defaultMilestones.reduce((sum, m) => sum + m.points, 0);
    const earnedPoints = completed.reduce((sum, m) => sum + m.points, 0);
    const percentage = Math.round((earnedPoints / totalPoints) * 100);

    return {
      completed: completed.length,
      total: defaultMilestones.length,
      percentage,
      earnedPoints,
      totalPoints
    };
  }, [milestones, defaultMilestones]);

  // Find next milestone to complete
  const nextMilestone = defaultMilestones.find(m => !milestones[m.id]);

  // Compact view for sidebar/header
  if (showCompact) {
    return (
      <div
        className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Progression
          </span>
          <span className="text-sm font-bold" style={{ color: couleur }}>
            {progress.percentage}%
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress.percentage}%`,
              backgroundColor: couleur
            }}
          />
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div
      className={`rounded-2xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Votre progression
          </h3>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: couleur }} />
            <span className="font-bold" style={{ color: couleur }}>
              {progress.earnedPoints} pts
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className={`h-4 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="h-full rounded-full transition-all duration-500 relative"
              style={{
                width: `${progress.percentage}%`,
                background: `linear-gradient(90deg, ${couleur}, #dc2626)`
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {progress.completed}/{progress.total} étapes
            </span>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {progress.percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Milestones list */}
      <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
        {defaultMilestones.map((milestone, index) => {
          const isCompleted = milestones[milestone.id];
          const isNext = milestone.id === nextMilestone?.id;
          const Icon = milestone.icon;

          return (
            <button
              key={milestone.id}
              onClick={() => !isCompleted && onMilestoneClick?.(milestone.action)}
              disabled={isCompleted}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                isCompleted
                  ? isDark
                    ? 'bg-green-900/20'
                    : 'bg-green-50'
                  : isNext
                  ? isDark
                    ? 'bg-orange-900/20 hover:bg-orange-900/30'
                    : 'bg-orange-50 hover:bg-orange-100'
                  : isDark
                  ? 'bg-gray-700/50 hover:bg-gray-700'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? 'bg-green-500'
                    : isNext
                    ? ''
                    : isDark
                    ? 'bg-gray-600'
                    : 'bg-gray-200'
                }`}
                style={isNext ? { backgroundColor: couleur } : {}}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Icon className={`w-5 h-5 ${isNext ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : isDark
                        ? 'text-white'
                        : 'text-gray-900'
                    }`}
                  >
                    {milestone.label}
                  </span>
                  {isNext && (
                    <span
                      className="px-2 py-0.5 rounded text-xs text-white"
                      style={{ backgroundColor: couleur }}
                    >
                      Suivant
                    </span>
                  )}
                </div>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {isCompleted ? '✓ Complété' : `+${milestone.points} points`}
                </span>
              </div>

              {/* Arrow */}
              {!isCompleted && (
                <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer message */}
      <div
        className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
      >
        {progress.percentage < 100 ? (
          <p className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Sparkles className="w-4 h-4 inline mr-1" style={{ color: couleur }} />
            Encore {100 - progress.percentage}% pour débloquer toutes les fonctionnalités !
          </p>
        ) : (
          <p className="text-sm text-center text-green-500 font-medium">
            🎉 Félicitations ! Vous maîtrisez ChantierPro à 100% !
          </p>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Hook to manage milestone progress
 */
export function useMilestones() {
  const [milestones, setMilestones] = useState({});

  // Load from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('milestones_completed') || '{}');
    setMilestones(saved);
  }, []);

  // Complete a milestone
  const completeMilestone = (milestoneId) => {
    if (milestones[milestoneId]) return; // Already completed

    const newMilestones = { ...milestones, [milestoneId]: Date.now() };
    setMilestones(newMilestones);
    localStorage.setItem('milestones_completed', JSON.stringify(newMilestones));

    console.log('Analytics: milestone_completed', { milestoneId });

    return true;
  };

  // Check if milestone is completed
  const isCompleted = (milestoneId) => !!milestones[milestoneId];

  // Reset progress (for testing)
  const resetProgress = () => {
    setMilestones({});
    localStorage.removeItem('milestones_completed');
  };

  return {
    milestones,
    completeMilestone,
    isCompleted,
    resetProgress
  };
}
