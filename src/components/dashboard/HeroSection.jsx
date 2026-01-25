/**
 * HeroSection Component
 * Welcoming hero section for Dashboard with dynamic greeting and urgent actions
 *
 * @module HeroSection
 */

import { useMemo } from 'react';
import { HardHat, AlertCircle, ArrowRight, CloudRain, FileText, Banknote } from 'lucide-react';

/**
 * @typedef {'payment_late' | 'quote_pending' | 'weather_alert'} UrgentActionType
 */

/**
 * @typedef {Object} UrgentAction
 * @property {UrgentActionType} type - Type of urgent action
 * @property {string} title - Action title
 * @property {string} description - Action description
 * @property {string} ctaLabel - Call-to-action button label
 * @property {() => void} ctaAction - Call-to-action callback
 */

/**
 * @typedef {Object} HeroSectionProps
 * @property {string} userName - User's display name
 * @property {number} activeChantiers - Number of active chantiers
 * @property {UrgentAction} [urgentAction] - Optional urgent action to display
 * @property {boolean} [isDark] - Dark mode flag
 */

/**
 * Get dynamic greeting based on current hour
 * @returns {string} Greeting message
 */
function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  if (hour >= 18 && hour < 23) return 'Bonsoir';
  return 'Bonne nuit';
}

/**
 * Get formatted date in French
 * @returns {string} Formatted date (e.g., "Dimanche 25 Janvier")
 */
function getFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).replace(/^\w/, c => c.toUpperCase());
}

/**
 * Get icon for urgent action type
 * @param {UrgentActionType} type - Action type
 * @returns {React.ComponentType} Icon component
 */
function getUrgentActionIcon(type) {
  switch (type) {
    case 'payment_late':
      return Banknote;
    case 'quote_pending':
      return FileText;
    case 'weather_alert':
      return CloudRain;
    default:
      return AlertCircle;
  }
}

/**
 * HeroSection - Welcoming dashboard header with greeting and urgent actions
 * @param {HeroSectionProps} props - Component props
 * @returns {JSX.Element}
 */
export default function HeroSection({
  userName,
  activeChantiers,
  urgentAction,
  isDark = false
}) {
  const greeting = useMemo(() => getGreeting(), []);
  const formattedDate = useMemo(() => getFormattedDate(), []);

  // Theme classes
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-600';

  // Get the appropriate icon for urgent action
  const UrgentIcon = urgentAction ? getUrgentActionIcon(urgentAction.type) : AlertCircle;

  return (
    <section className="pt-8 pb-6 px-4 sm:px-6 animate-fade-in">
      {/* Greeting & Metadata */}
      <div className="mb-6">
        {/* Dynamic Greeting */}
        <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-2`}>
          {greeting} {userName}
        </h1>

        {/* Metadata Row */}
        <div className={`flex flex-wrap items-center gap-2 text-sm ${textSecondary}`}>
          <span>{formattedDate}</span>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <HardHat size={16} className="text-purple-500" />
            <span>
              {activeChantiers} chantier{activeChantiers !== 1 ? 's' : ''} actif{activeChantiers !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Urgent Action Banner */}
      {urgentAction && (
        <div
          className={`
            rounded-lg border-l-4 p-4
            ${isDark
              ? 'bg-red-900/20 border-red-500'
              : 'bg-red-50 border-red-500'
            }
            animate-slide-up
          `}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Content */}
            <div className="flex items-start gap-3">
              <div className={`
                p-2 rounded-lg flex-shrink-0
                ${isDark ? 'bg-red-900/50' : 'bg-red-100'}
              `}>
                <UrgentIcon size={20} className="text-red-600" />
              </div>
              <div>
                <p className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-900'}`}>
                  {urgentAction.title}
                </p>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                  {urgentAction.description}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={urgentAction.ctaAction}
              className="
                flex items-center justify-center gap-2
                px-4 py-2.5 rounded-lg
                bg-red-600 hover:bg-red-700
                text-white font-medium text-sm
                transition-colors
                flex-shrink-0
                min-w-[180px] sm:min-w-0
              "
            >
              {urgentAction.ctaLabel}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * HeroSectionSkeleton - Loading placeholder for HeroSection
 * @param {Object} props - Component props
 * @param {boolean} [props.isDark] - Dark mode flag
 * @returns {JSX.Element}
 */
export function HeroSectionSkeleton({ isDark = false }) {
  const skeletonBg = isDark ? 'bg-slate-700' : 'bg-gray-200';

  return (
    <section className="pt-8 pb-6 px-4 sm:px-6 animate-pulse">
      <div className="mb-6">
        {/* Greeting skeleton */}
        <div className={`h-9 w-64 ${skeletonBg} rounded-lg mb-3`} />
        {/* Metadata skeleton */}
        <div className={`h-5 w-48 ${skeletonBg} rounded-lg`} />
      </div>
    </section>
  );
}
