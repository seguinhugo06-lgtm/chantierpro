/**
 * FirstTimeTooltip — Contextual tooltip shown once per page for new users
 *
 * Shows a small floating badge with an arrow pointing to the main action.
 * Dismisses on click and stores a flag in localStorage so it only shows once.
 *
 * Usage:
 *   <FirstTimeTooltip id="devis" message="Commencez par créer votre premier devis !" isDark={isDark} couleur={couleur} />
 */

import React, { useState, useEffect } from 'react';

const STORAGE_PREFIX = 'cp_tooltip_seen_';

export default function FirstTimeTooltip({ id, message, isDark, couleur }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_PREFIX + id);
      if (!seen) {
        // Small delay so it feels natural
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [id]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_PREFIX + id, '1');
    } catch {}
  };

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      className="animate-fade-in cursor-pointer"
    >
      <div
        className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all hover:scale-105`}
        style={{ backgroundColor: couleur || '#f97316' }}
      >
        <span className="text-base">💡</span>
        <span>{message}</span>
        <span className="ml-1 text-white/70 text-xs">✕</span>
        {/* Arrow pointing up */}
        <div
          className="absolute -top-2 left-6 w-4 h-4 rotate-45"
          style={{ backgroundColor: couleur || '#f97316' }}
        />
      </div>
    </div>
  );
}

/**
 * Predefined tooltips for each page
 */
export const TOOLTIP_MESSAGES = {
  devis: 'Créez votre premier devis professionnel en quelques clics !',
  clients: 'Ajoutez vos premiers clients pour commencer.',
  chantiers: 'Créez un chantier pour suivre vos travaux et dépenses.',
  catalogue: 'Ajoutez vos articles et prestations habituelles.'
};
