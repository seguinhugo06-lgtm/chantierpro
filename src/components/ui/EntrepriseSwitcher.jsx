/**
 * EntrepriseSwitcher.jsx — Company switcher dropdown
 *
 * Shows the active entreprise name in the sidebar/header.
 * When hasMultiple === true, renders a dropdown to switch between companies.
 * When hasMultiple === false, just shows the company name (no dropdown).
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { Building2, ChevronDown, Check, Settings, Plus } from 'lucide-react';
import { useEntreprise } from '../../context/EntrepriseContext';

/**
 * Compute initiales from a company name.
 * "Martin Renovation" → "MR", "Dupont" → "DU"
 */
function getInitiales(ent) {
  if (ent.initiales) return ent.initiales;
  const nom = ent.nom || '';
  const words = nom.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return nom.slice(0, 2).toUpperCase() || '??';
}

const EntrepriseSwitcher = memo(function EntrepriseSwitcher({
  isDark = false,
  compact = false,
  user = null,
  onNavigateSettings,
}) {
  const {
    entreprises,
    activeEntreprise,
    hasMultiple,
    switchEntreprise,
  } = useEntreprise();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const couleur = activeEntreprise?.couleur || '#f97316';
  const nom = activeEntreprise?.nom || 'BatiGesti';
  const initiales = activeEntreprise ? getInitiales(activeEntreprise) : 'BG';

  // ── Single entreprise: simple display (no dropdown) ──
  if (!hasMultiple) {
    if (compact) {
      // Header: logo + name
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: couleur }}
          >
            <Building2 size={18} className="text-white" />
          </div>
          <span
            className={`font-semibold text-sm truncate hidden sm:block lg:text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
            title={nom}
          >
            {nom}
          </span>
        </div>
      );
    }

    // Sidebar: profile-style button
    return (
      <button
        onClick={() => onNavigateSettings?.()}
        className={`group flex items-center gap-3 flex-1 min-w-0 rounded-xl -m-1 p-2 transition-all ${isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'}`}
        title="Mon profil"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover:scale-105"
          style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)` }}
        >
          <Building2 size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={nom}>
            {nom}
          </p>
          {user?.email && (
            <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</p>
          )}
        </div>
      </button>
    );
  }

  // ── Multiple entreprises: dropdown switcher ──
  const handleSwitch = async (id) => {
    if (id === activeEntreprise?.id) {
      setIsOpen(false);
      return;
    }
    await switchEntreprise(id);
    setIsOpen(false);
  };

  if (compact) {
    // Header: compact switcher
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 min-w-0 rounded-xl px-2 py-1.5 transition-colors ${
            isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
          }`}
        >
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 text-white text-xs font-bold"
            style={{ background: couleur }}
          >
            {initiales}
          </div>
          <span
            className={`font-semibold text-sm truncate hidden sm:block lg:text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
            title={nom}
          >
            {nom}
          </span>
          <ChevronDown
            size={14}
            className={`hidden sm:block flex-shrink-0 transition-transform ${
              isOpen ? 'rotate-180' : ''
            } ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          />
        </button>

        {isOpen && (
          <div
            className={`absolute top-full left-0 mt-2 w-72 rounded-2xl border shadow-xl z-50 overflow-hidden ${
              isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-gray-200'
            }`}
          >
            <DropdownContent
              entreprises={entreprises}
              activeId={activeEntreprise?.id}
              isDark={isDark}
              onSwitch={handleSwitch}
              onSettings={() => { setIsOpen(false); onNavigateSettings?.(); }}
            />
          </div>
        )}
      </div>
    );
  }

  // Sidebar: full switcher
  return (
    <div className="relative flex-1 min-w-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-3 flex-1 w-full min-w-0 rounded-xl -m-1 p-2 transition-all hover:bg-slate-800/80"
        title="Changer d'entreprise"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover:scale-105 text-white text-xs font-bold"
          style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)` }}
        >
          {initiales}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <p className="text-white font-semibold text-sm truncate" title={nom}>
              {nom}
            </p>
            <ChevronDown
              size={12}
              className={`flex-shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
          {user?.email && (
            <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
          )}
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-xl z-50 overflow-hidden bg-slate-800 border-slate-700"
        >
          <DropdownContent
            entreprises={entreprises}
            activeId={activeEntreprise?.id}
            isDark={true}
            onSwitch={handleSwitch}
            onSettings={() => { setIsOpen(false); onNavigateSettings?.(); }}
          />
        </div>
      )}
    </div>
  );
});

/**
 * Shared dropdown content for both compact and full modes
 */
function DropdownContent({ entreprises, activeId, isDark, onSwitch, onSettings }) {
  return (
    <div className="py-2">
      {/* Header */}
      <div className={`px-4 py-2 text-xs font-medium uppercase tracking-wider ${
        isDark ? 'text-slate-500' : 'text-gray-400'
      }`}>
        Mes entreprises
      </div>

      {/* Entreprise list */}
      <div className="max-h-64 overflow-y-auto">
        {entreprises.map((ent) => {
          const isActive = ent.id === activeId;
          const entInitiales = getInitiales(ent);
          return (
            <button
              key={ent.id}
              onClick={() => onSwitch(ent.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                isActive
                  ? isDark ? 'bg-slate-700/50' : 'bg-gray-50'
                  : isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'
              }`}
            >
              {/* Color dot + initiales */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
                style={{ background: ent.couleur || '#94a3b8' }}
              >
                {entInitiales}
              </div>

              {/* Name + info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {ent.nom}
                </p>
                <p className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {[ent.formeJuridique, ent.ville].filter(Boolean).join(' · ') || 'Entreprise'}
                </p>
              </div>

              {/* Active check */}
              {isActive && (
                <Check size={16} className="flex-shrink-0" style={{ color: ent.couleur || '#f97316' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className={`my-1 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`} />

      {/* Actions */}
      <button
        onClick={onSettings}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-sm ${
          isDark
            ? 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <Settings size={16} />
        <span>Gérer les entreprises</span>
      </button>
    </div>
  );
}

export default EntrepriseSwitcher;
