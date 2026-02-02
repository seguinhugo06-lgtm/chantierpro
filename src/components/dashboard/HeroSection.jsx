/**
 * HeroSection Component
 * Welcoming hero section for Dashboard with dynamic greeting and urgent actions
 *
 * Design System:
 * - Spacing: 4-point grid (4, 8, 12, 16, 20, 24, 32, 40, 48)
 * - Border radius: sm=8, md=12, lg=16, xl=20
 * - Shadows: subtle elevation system
 * - Transitions: 200ms ease
 *
 * @module HeroSection
 */

import { useMemo } from 'react';
import { HardHat, AlertCircle, ArrowRight, CloudRain, FileText, Banknote, Sparkles } from 'lucide-react';
import { getGreeting, formatDate, capitalize } from '../../lib/formatters';

/**
 * Get formatted date in French (weekday + day + month)
 */
function getFormattedDate() {
  return capitalize(formatDate(new Date(), 'weekday'));
}

/**
 * Get icon for urgent action type
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
 */
export default function HeroSection({
  userName,
  activeChantiers,
  urgentAction,
  isDark = false,
  onChantiersClick,
}) {
  const greeting = useMemo(() => getGreeting(), []);
  const formattedDate = useMemo(() => getFormattedDate(), []);

  const UrgentIcon = urgentAction ? getUrgentActionIcon(urgentAction.type) : AlertCircle;

  return (
    <section
      className={`
        relative overflow-hidden
        px-4 sm:px-6 py-6
        ${isDark ? 'bg-slate-900' : 'bg-slate-100'}
      `}
    >
      {/* Subtle gradient background */}
      <div
        className={`
          absolute inset-0 opacity-[0.03]
          bg-gradient-to-br from-primary-500 via-transparent to-purple-500
        `}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Greeting & Metadata */}
        <div className="mb-5">
          {/* Dynamic Greeting */}
          <h1
            className={`
              text-xl sm:text-2xl font-bold leading-tight
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            {greeting},{' '}
            <span className="text-primary-600 dark:text-primary-400">
              {userName}
            </span>
          </h1>

          {/* Metadata Row */}
          <div
            className={`
              flex items-center gap-2 text-sm mt-1
              ${isDark ? 'text-slate-400' : 'text-gray-600'}
            `}
          >
            <span>{formattedDate}</span>
            <span className={isDark ? 'text-slate-600' : 'text-gray-300'}>•</span>
            <button
              onClick={onChantiersClick}
              className={`
                inline-flex items-center gap-1.5 px-2 py-0.5 -mx-2 -my-0.5 rounded-md
                transition-colors duration-150
                hover:bg-primary-500/10 hover:text-primary-600
                focus:outline-none focus:ring-2 focus:ring-primary-500/30
                ${isDark ? 'hover:text-primary-400' : 'hover:text-primary-600'}
              `}
              title="Voir tous les chantiers en cours"
            >
              <HardHat size={14} className="flex-shrink-0" />
              <span className="font-medium">{activeChantiers}</span> chantier{activeChantiers !== 1 ? 's' : ''} actif{activeChantiers !== 1 ? 's' : ''}
            </button>
          </div>
        </div>

        {/* Urgent Action Banner - Level 3 Elevation */}
        {urgentAction && (
          <div
            className={`
              rounded-lg overflow-hidden border-l-4 border-red-500
              shadow-md
              transition-all duration-200 ease-out
              hover:shadow-lg
              ${isDark
                ? 'bg-red-500/10'
                : 'bg-red-50'
              }
            `}
          >

            <div className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Icon & Content */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`
                      flex-shrink-0 w-10 h-10 rounded-xl
                      flex items-center justify-center
                      ${isDark ? 'bg-red-500/20' : 'bg-red-100'}
                    `}
                  >
                    <UrgentIcon size={20} className="text-red-500" />
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`
                        text-sm font-semibold leading-snug
                        ${isDark ? 'text-red-300' : 'text-red-800'}
                      `}
                    >
                      {urgentAction.title}
                    </p>
                    <p
                      className={`
                        text-sm mt-1 leading-relaxed
                        ${isDark ? 'text-red-400/80' : 'text-red-700'}
                      `}
                    >
                      {urgentAction.description}
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={urgentAction.ctaAction}
                  className="
                    inline-flex items-center justify-center gap-2
                    px-5 py-2.5 rounded-lg
                    bg-red-500 hover:bg-red-600
                    text-white text-sm font-medium
                    shadow-sm hover:shadow-md
                    focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                    active:scale-95
                    transition-all duration-150
                    flex-shrink-0
                    group
                  "
                >
                  {urgentAction.ctaLabel}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * HeroSectionSkeleton - Loading placeholder for HeroSection
 */
export function HeroSectionSkeleton({ isDark = false }) {
  return (
    <section
      className={`
        px-4 sm:px-6 py-6
        ${isDark ? 'bg-slate-900' : 'bg-slate-100'}
      `}
    >
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className="mb-6">
          {/* Greeting skeleton */}
          <div
            className={`
              h-8 sm:h-9 w-56 rounded-lg
              ${isDark ? 'bg-slate-800' : 'bg-gray-100'}
            `}
          />
          {/* Metadata skeleton */}
          <div className="flex items-center gap-3 mt-3">
            <div
              className={`
                h-5 w-32 rounded-md
                ${isDark ? 'bg-slate-800' : 'bg-gray-100'}
              `}
            />
            <div
              className={`
                h-6 w-28 rounded-full
                ${isDark ? 'bg-slate-800' : 'bg-gray-100'}
              `}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
