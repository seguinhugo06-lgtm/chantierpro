import React from 'react';

const QUICK_TEMPLATES = [
  { id: 'sdb', label: 'Salle de bain', icon: '🚿', text: 'Rénovation complète salle de bain 8m², remplacement baignoire par douche italienne, pose carrelage sol et faïence murale, meuble vasque, WC suspendu' },
  { id: 'cuisine', label: 'Cuisine', icon: '🍳', text: 'Rénovation cuisine, dépose ancienne, nouvelle cuisine équipée, plomberie et électricité, carrelage crédence' },
  { id: 'peinture', label: 'Peinture', icon: '🎨', text: 'Peinture intérieure appartement 60m², préparation murs, enduit, 2 couches peinture acrylique murs et plafonds' },
  { id: 'electricite', label: 'Électricité', icon: '⚡', text: 'Mise aux normes électrique, remplacement tableau, ajout prises, points lumineux LED, terre' },
  { id: 'carrelage', label: 'Carrelage', icon: '🧱', text: 'Pose carrelage sol 25m², dépose ancien revêtement, ragréage, pose carrelage 60×60, joints' },
  { id: 'renovation', label: 'Rénovation', icon: '🏠', text: 'Rénovation complète appartement 70m², démolition, plomberie, électricité, plâtrerie, carrelage, peinture' },
];

/**
 * IAQuickTemplates — Horizontal scrollable chips for common renovation types
 *
 * @param {function} onSelect - Called with the template text when a chip is clicked
 * @param {boolean} isDark
 * @param {string} couleur
 * @param {string} [selected] - Currently selected template id
 */
export default function IAQuickTemplates({ onSelect, isDark = false, couleur = '#f97316', selected }) {
  return (
    <div className="w-full">
      <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Templates rapides
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK_TEMPLATES.map(t => {
          const isActive = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.text, t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'text-white shadow-md'
                  : isDark
                    ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={isActive ? { backgroundColor: couleur } : {}}
            >
              <span className="text-sm">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { QUICK_TEMPLATES };
