/**
 * EntrepriseFilterBar.jsx — Filter bar for listings by entreprise
 *
 * Displayed above devis/chantiers lists when hasMultiple === true.
 * Shows tabs: [Toutes] [Entreprise A] [Entreprise B] ...
 */

import React, { memo } from 'react';
import { Building2 } from 'lucide-react';
import { useEntreprise } from '../../context/EntrepriseContext';

const EntrepriseFilterBar = memo(function EntrepriseFilterBar({
  value, // 'all' | entrepriseId
  onChange,
  isDark = false,
}) {
  const { entreprises, hasMultiple } = useEntreprise();

  if (!hasMultiple) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {/* "Toutes" button */}
      <button
        onClick={() => onChange('all')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          whitespace-nowrap transition-colors flex-shrink-0
          ${value === 'all'
            ? isDark
              ? 'bg-slate-600 text-white'
              : 'bg-slate-800 text-white'
            : isDark
              ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }
        `}
      >
        <Building2 size={13} />
        Toutes
      </button>

      {/* Per-entreprise buttons */}
      {entreprises.map((ent) => {
        const isActive = value === ent.id;
        const initiales = ent.initiales || (ent.nom || '').slice(0, 2).toUpperCase();
        return (
          <button
            key={ent.id}
            onClick={() => onChange(ent.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              whitespace-nowrap transition-colors flex-shrink-0
              ${isActive
                ? 'text-white shadow-sm'
                : isDark
                  ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }
            `}
            style={isActive ? { background: ent.couleur || '#f97316' } : undefined}
          >
            <span
              className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold"
              style={isActive
                ? { background: 'rgba(255,255,255,0.25)', color: 'white' }
                : { background: (ent.couleur || '#94a3b8') + '20', color: ent.couleur || '#94a3b8' }
              }
            >
              {initiales}
            </span>
            <span className="hidden sm:inline">{ent.nomCourt || ent.nom}</span>
            <span className="sm:hidden">{ent.nomCourt || (ent.nom || '').split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
});

export default EntrepriseFilterBar;
