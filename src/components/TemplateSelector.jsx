import React, { useState } from 'react';
import { X, ChevronRight, FileText, Droplets, Zap, Layers, Brush, Ruler, LayoutGrid, Thermometer, Home, Mountain, ArrowLeft, Check, TrendingUp, Star, Trash2 } from 'lucide-react';
import { TEMPLATES_METIER, getMetiers, prepareTemplateLines } from '../lib/templates/devis-templates';

/**
 * Composant de selection de templates de devis par metier
 * Permet de demarrer un devis a partir d'un modele pre-rempli
 */

// Mapping des icones par nom
const ICON_MAP = {
  Droplets,
  Zap,
  Layers,
  Brush,
  Ruler,
  LayoutGrid,
  Thermometer,
  Home,
  Mountain
};

export default function TemplateSelector({
  isOpen,
  onClose,
  onSelectTemplate,
  customTemplates = [],
  onDeleteTemplate,
  isDark,
  couleur
}) {
  const [selectedMetier, setSelectedMetier] = useState(null);
  const [hoveredTemplate, setHoveredTemplate] = useState(null);

  // Theme classes
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  if (!isOpen) return null;

  const metiers = getMetiers();

  const handleSelectTemplate = (metierId, template) => {
    const lines = prepareTemplateLines(template);
    onSelectTemplate({
      metier: metierId,
      template,
      lignes: lines
    });
    onClose();
    setSelectedMetier(null);
  };

  const handleBack = () => {
    setSelectedMetier(null);
  };

  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' EUR';

  // Calcule le total d'un template
  const getTemplateTotal = (template) => {
    return template.lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  };

  // Calcule la marge d'un template
  const getTemplateMarge = (template) => {
    const total = template.lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
    const cout = template.lignes.reduce((sum, l) => sum + ((l.prixAchat || 0) * l.quantite), 0);
    return total > 0 ? ((total - cout) / total * 100).toFixed(0) : 0;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${cardBg} rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            {selectedMetier && (
              <button
                onClick={handleBack}
                className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
              >
                <ArrowLeft size={20} className={textSecondary} />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: selectedMetier ? TEMPLATES_METIER[selectedMetier]?.color + '20' : `${couleur}20` }}>
              <FileText size={20} style={{ color: selectedMetier ? TEMPLATES_METIER[selectedMetier]?.color : couleur }} />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${textPrimary}`}>
                {selectedMetier ? TEMPLATES_METIER[selectedMetier]?.nom : 'Modèles de devis'}
              </h2>
              <p className={`text-sm ${textMuted}`}>
                {selectedMetier ? 'Choisissez un modèle' : 'Sélectionnez votre métier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
          >
            <X size={20} className={textSecondary} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!selectedMetier ? (
            <div>
              {/* Mes modèles personnalisés */}
              {customTemplates.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={16} style={{ color: couleur }} />
                    <p className={`text-sm font-semibold ${textPrimary}`}>Mes modèles</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                      {customTemplates.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {customTemplates.map(t => (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${isDark ? 'border-slate-700 hover:border-slate-500 bg-slate-800' : 'border-slate-200 hover:border-slate-300'}`}
                        onClick={() => {
                          onSelectTemplate({
                            template: t,
                            lignes: (t.lignes || []).map(l => ({ ...l, id: Math.random().toString(36).slice(2) }))
                          });
                          onClose();
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${textPrimary}`}>{t.nom}</p>
                          <p className={`text-xs ${textMuted}`}>{t.category} · {(t.lignes || []).length} lignes</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-medium" style={{ color: couleur }}>
                            ~{formatMoney((t.lignes || []).reduce((s, l) => s + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0))} HT
                          </span>
                          {onDeleteTemplate && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteTemplate(t.id); }}
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-400'}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <p className={`text-xs font-medium ${textMuted} mb-3`}>Modèles par métier</p>
                  </div>
                </div>
              )}
              {/* Liste des metiers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {metiers.map(metier => {
                const IconComponent = ICON_MAP[metier.icon] || FileText;
                return (
                  <button
                    key={metier.id}
                    onClick={() => setSelectedMetier(metier.id)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all hover:shadow-lg ${
                      isDark ? 'border-slate-700 hover:border-slate-500 bg-slate-800' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    style={{ '--hover-color': metier.color }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: metier.color + '20' }}
                    >
                      <IconComponent size={24} style={{ color: metier.color }} />
                    </div>
                    <div className="text-center">
                      <p className={`font-medium ${textPrimary}`}>{metier.nom}</p>
                      <p className={`text-xs ${textMuted}`}>{metier.templatesCount} modèles</p>
                    </div>
                  </button>
                );
              })}
            </div>
            </div>
          ) : (
            // Liste des templates du metier
            <div className="space-y-3">
              {TEMPLATES_METIER[selectedMetier]?.templates.map(template => (
                <div
                  key={template.id}
                  className={`rounded-xl border-2 overflow-hidden transition-all ${
                    hoveredTemplate === template.id
                      ? (isDark ? 'border-slate-500' : 'border-slate-400')
                      : (isDark ? 'border-slate-700' : 'border-slate-200')
                  }`}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                >
                  {/* Header du template */}
                  <div
                    className={`p-4 cursor-pointer flex items-center justify-between ${
                      isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => handleSelectTemplate(selectedMetier, template)}
                  >
                    <div className="flex-1">
                      <p className={`font-medium ${textPrimary}`}>{template.nom}</p>
                      <p className={`text-sm ${textMuted}`}>{template.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {template.lignes.length} lignes
                        </span>
                        <span className="text-sm font-medium" style={{ color: TEMPLATES_METIER[selectedMetier]?.color }}>
                          ~{formatMoney(getTemplateTotal(template))} HT
                        </span>
                        <span className={`text-xs flex items-center gap-1 ${Number(getTemplateMarge(template)) >= 30 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          <TrendingUp size={12} />
                          {getTemplateMarge(template)}% marge
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronRight size={20} className={textMuted} />
                    </div>
                  </div>

                  {/* Preview des lignes (au hover) */}
                  {hoveredTemplate === template.id && (
                    <div className={`p-4 border-t ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <p className={`text-xs font-medium mb-2 ${textMuted}`}>Aperçu des lignes :</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {template.lignes.slice(0, 6).map((ligne, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className={`truncate flex-1 ${textSecondary}`}>{ligne.description}</span>
                            <span className={textMuted}>
                              {ligne.quantite} {ligne.unite} x {ligne.prixUnitaire} EUR
                            </span>
                          </div>
                        ))}
                        {template.lignes.length > 6 && (
                          <p className={`text-xs ${textMuted}`}>... et {template.lignes.length - 6} autres lignes</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleSelectTemplate(selectedMetier, template)}
                        className="w-full mt-3 py-2 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                        style={{ background: TEMPLATES_METIER[selectedMetier]?.color }}
                      >
                        <Check size={16} />
                        Utiliser ce modèle
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t shrink-0 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-xs text-center ${textMuted}`}>
            Les prix sont indicatifs et bases sur les moyennes du marche 2024-2025. Ajustez selon vos tarifs.
          </p>
        </div>
      </div>
    </div>
  );
}
