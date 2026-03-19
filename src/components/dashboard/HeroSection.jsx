/**
 * HeroSection Component — Minimal greeting header
 * Linear-inspired clean design.
 */

import { useMemo } from 'react';
import { HardHat, CalendarDays } from 'lucide-react';
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
  devisEnAttente = 0,
  facturesEnRetard = 0,
  memosAujourdhui = 0,
  actionsCount = 0,
}) {
  const greeting = useMemo(() => getGreeting(), []);
  const formattedDate = useMemo(() => getFormattedDate(), []);

  // Build contextual recap badges
  const recapBadges = useMemo(() => {
    const badges = [];
    if (actionsCount > 0) {
      badges.push({
        label: `${actionsCount} action${actionsCount > 1 ? 's' : ''} en cours`,
        lightBg: 'bg-blue-50 text-blue-700',
        darkBg: 'bg-blue-500/15 text-blue-400',
      });
    }
    if (facturesEnRetard > 0) {
      badges.push({
        label: `${facturesEnRetard} facture${facturesEnRetard > 1 ? 's' : ''} en retard`,
        lightBg: 'bg-rose-50 text-rose-700',
        darkBg: 'bg-rose-500/15 text-rose-400',
      });
    }
    if (devisEnAttente > 0) {
      badges.push({
        label: `${devisEnAttente} devis en attente`,
        lightBg: 'bg-amber-50 text-amber-700',
        darkBg: 'bg-amber-500/15 text-amber-400',
      });
    }
    if (memosAujourdhui > 0) {
      badges.push({
        label: `${memosAujourdhui} memo${memosAujourdhui > 1 ? 's' : ''} du jour`,
        lightBg: 'bg-violet-50 text-violet-700',
        darkBg: 'bg-violet-500/15 text-violet-400',
      });
    }
    return badges;
  }, [actionsCount, facturesEnRetard, devisEnAttente, memosAujourdhui]);

  return (
    <section className="px-4 sm:px-6 py-4 sm:py-5">
      <div className="max-w-[1440px] mx-auto">
        {/* Greeting — font-semibold (not bold, Linear is lighter) */}
        <h1 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {greeting},{' '}
          <span style={{ color: couleur }}>{userName}</span>
        </h1>

        {/* Date — text-sm tertiary */}
        <div className={`flex items-center gap-3 text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} className="flex-shrink-0 opacity-60" />
            {formattedDate}
          </span>
          <span className={isDark ? 'text-slate-700' : 'text-gray-300'}>·</span>
          <button
            onClick={onChantiersClick}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 -mx-2 rounded-lg text-xs font-medium transition-all ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-white/80 hover:shadow-sm text-gray-500 hover:text-gray-700'
            }`}
            title="Voir tous les chantiers en cours"
          >
            <HardHat size={14} className="flex-shrink-0" style={{ color: couleur }} />
            <span className="font-semibold" style={{ color: couleur }}>{activeChantiers}</span>
            <span>chantier{activeChantiers !== 1 ? 's' : ''} actif{activeChantiers !== 1 ? 's' : ''}</span>
          </button>
        </div>

        {/* Contextual Recap Badges — rounded-md, text-[11px] */}
        {recapBadges.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-2.5">
            {recapBadges.map((badge) => (
              <span
                key={badge.label}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium ${
                  isDark ? badge.darkBg : badge.lightBg
                }`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function HeroSectionSkeleton({ isDark = false }) {
  return (
    <section className="px-4 sm:px-6 py-4 sm:py-5">
      <div className="max-w-[1440px] mx-auto animate-pulse">
        <div className={`h-7 w-56 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`} />
        <div className={`h-4 w-40 rounded-md mt-2 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`} />
      </div>
    </section>
  );
}
