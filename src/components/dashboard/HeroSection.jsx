/**
 * HeroSection Component — Compact greeting header
 * Just greeting + date + active chantiers count.
 * Urgent action banner moved to Dashboard.jsx for layout flexibility.
 */

import { useMemo } from 'react';
import { HardHat } from 'lucide-react';
import { getGreeting, formatDate, capitalize } from '../../lib/formatters';

function getFormattedDate() {
  return capitalize(formatDate(new Date(), 'weekday'));
}

export default function HeroSection({
  userName,
  activeChantiers,
  isDark = false,
  couleur = '#f97316',
  onChantiersClick,
}) {
  const greeting = useMemo(() => getGreeting(), []);
  const formattedDate = useMemo(() => getFormattedDate(), []);

  return (
    <section className={`px-4 sm:px-6 pt-5 pb-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Greeting */}
        <h1 className={`text-xl sm:text-2xl font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {greeting},{' '}
          <span style={{ color: couleur }}>{userName}</span>
          {' '}👋
        </h1>

        {/* Metadata Row */}
        <div className={`flex items-center gap-2 text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          <span>{formattedDate}</span>
          <span className={isDark ? 'text-slate-600' : 'text-gray-300'}>•</span>
          <button
            onClick={onChantiersClick}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 -mx-2 -my-0.5 rounded-md transition-colors duration-150 hover:bg-primary-500/10 ${isDark ? 'hover:text-primary-400' : 'hover:text-primary-600'}`}
            title="Voir tous les chantiers en cours"
          >
            <HardHat size={14} className="flex-shrink-0" />
            <span className="font-medium">{activeChantiers}</span> chantier{activeChantiers !== 1 ? 's' : ''} actif{activeChantiers !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </section>
  );
}

export function HeroSectionSkeleton({ isDark = false }) {
  return (
    <section className={`px-4 sm:px-6 pt-5 pb-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className={`h-7 w-56 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`} />
        <div className={`h-4 w-40 rounded-md mt-2 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`} />
      </div>
    </section>
  );
}
