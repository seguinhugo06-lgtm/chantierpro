import React, { useState } from 'react';
import { X, ChevronRight, FileText, ArrowLeft, Check, TrendingUp, Star, Trash2, Search } from 'lucide-react';
import { MODELES_DEVIS, getMetiersWithModeles, prepareModeleLignes, calculateModeleTotal, calculateModeleMarge, searchModeles } from '../lib/data/modeles-devis';

/**
 * Composant de sélection de templates de devis par métier (unifié)
 * Utilise le système MODELES_DEVIS (~308 modèles en 29 catégories)
 */

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
  const [searchQuery, setSearchQuery] = useState('');

  // Theme classes
  const cardBg = "bg-surface";
  const textPrimary = "text-encre";
  const textSecondary = "text-encre-2";
  const textMuted = "text-encre-2";

  if (!isOpen) return null;

  const metiers = getMetiersWithModeles();
  const selectedMetierData = selectedMetier ? MODELES_DEVIS[selectedMetier] : null;

  // Recherche globale
  const searchResults = searchQuery.length >= 2 ? searchModeles(searchQuery).slice(0, 12) : [];

  const handleSelectTemplate = (metierId, template) => {
    const lines = prepareModeleLignes(template);
    onSelectTemplate({
      metier: metierId,
      template,
      lignes: lines
    });
    onClose();
    setSelectedMetier(null);
    setSearchQuery('');
  };

  const handleBack = () => {
    setSelectedMetier(null);
  };

  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' €';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div role="dialog" aria-modal="true" aria-label="Choisir un modèle" className={`${cardBg} rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="p-5 border-b border-bord flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {selectedMetier && (
              <button
                onClick={handleBack}
                aria-label="Retour"
                className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-surface-2 transition-colors"
              >
                <ArrowLeft size={20} className={textSecondary} />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2" aria-hidden="true">
              {selectedMetierData ? (
                <span className="text-xl">{selectedMetierData.icon}</span>
              ) : (
                <FileText size={20} />
              )}
            </div>
            <div>
              <h2 className={`font-bold text-lg ${textPrimary}`}>
                {selectedMetierData ? selectedMetierData.nom : 'Modèles de devis'}
              </h2>
              <p className={`text-sm ${textMuted}`}>
                {selectedMetier ? `${selectedMetierData?.modeles?.length || 0} modèles` : 'Sélectionnez votre métier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-surface-2 transition-colors"
          >
            <X size={20} className={textSecondary} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!selectedMetier ? (
            <div>
              {/* Barre de recherche globale */}
              <div className="mb-4">
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-fond border-bord`}>
                  <Search size={16} className={textMuted} />
                  <input
                    type="text"
                    placeholder="Rechercher un modèle..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`flex-1 bg-transparent text-sm outline-none ${textPrimary}`}
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} aria-label="Effacer la recherche" className="p-1 rounded hover:bg-bord">
                      <X size={14} className={textMuted} />
                    </button>
                  )}
                </div>
              </div>

              {/* Résultats de recherche */}
              {searchQuery.length >= 2 ? (
                <div>
                  <p className={`text-xs font-medium ${textMuted} mb-3`}>
                    {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} pour "{searchQuery}"
                  </p>
                  {searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map(result => (
                        <div
                          key={`${result.metierId}-${result.id}`}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all border-bord hover:border-bord-fort`}
                          onClick={() => handleSelectTemplate(result.metierId, result)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{result.metierIcon}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full bg-surface-2 text-encre-3`}>
                              {result.metierNom}
                            </span>
                          </div>
                          <p className={`font-medium ${textPrimary}`}>{result.nom}</p>
                          <p className={`text-xs ${textMuted}`}>{result.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm text-center py-8 ${textMuted}`}>Aucun modèle trouvé</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Mes modèles personnalisés */}
                  {customTemplates.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Star size={16} className="text-accent-texte" />
                        <p className={`text-sm font-semibold ${textPrimary}`}>Mes modèles</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-surface-2 text-encre-3`}>
                          {customTemplates.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {customTemplates.map(t => (
                          <div
                            key={t.id}
                            className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all border-bord hover:border-bord-fort`}
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
                              <p className={`text-xs ${textMuted}`}>{t.categorie || t.category} · {(t.lignes || []).length} lignes</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm font-medium text-accent-texte">
                                ~{formatMoney((t.lignes || []).reduce((s, l) => s + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0))} HT
                              </span>
                              {onDeleteTemplate && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteTemplate(t.id); }}
                                  aria-label={`Supprimer le modèle ${t.nom || ''}`.trim()}
                                  className="w-11 h-11 flex items-center justify-center rounded-lg transition-colors text-danger-texte hover:bg-danger-fond"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className={`mt-4 pt-4 border-t border-bord`}>
                        <p className={`text-xs font-medium ${textMuted} mb-3`}>Modèles par métier</p>
                      </div>
                    </div>
                  )}

                  {/* Liste des métiers */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {metiers.map(metier => (
                      <button
                        key={metier.id}
                        onClick={() => setSelectedMetier(metier.id)}
                        className={`relative p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all hover:shadow-lg border-bord hover:border-bord-fort bg-surface`}
                      >
                        {metier.isNew && (
                          <span className="absolute -top-2 -right-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-info-fond text-info-texte shadow-e1">
                            Nouveau
                          </span>
                        )}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-surface-2">
                          <span className="text-2xl">{metier.icon}</span>
                        </div>
                        <div className="text-center">
                          <p className={`font-medium ${textPrimary}`}>{metier.nom}</p>
                          <p className={`text-xs ${textMuted}`}>{metier.modelesCount} modèles</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            // Liste des templates du métier
            <div className="space-y-3">
              {selectedMetierData?.modeles.map(template => (
                <div
                  key={template.id}
                  className={`rounded-xl border-2 overflow-hidden transition-all ${
                    hoveredTemplate === template.id
                      ? 'border-bord-fort'
                      : 'border-bord'
                  }`}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                >
                  {/* Header du template */}
                  <div
                    className={`p-4 cursor-pointer flex items-center justify-between hover:bg-surface-2`}
                    onClick={() => handleSelectTemplate(selectedMetier, template)}
                  >
                    <div className="flex-1">
                      <p className={`font-medium ${textPrimary}`}>{template.nom}</p>
                      <p className={`text-sm ${textMuted}`}>{template.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded bg-surface-2 text-encre-2`}>
                          {template.lignes.length} lignes
                        </span>
                        <span className="text-sm font-medium tabular-nums text-encre">
                          ~{formatMoney(calculateModeleTotal(template))} HT
                        </span>
                        <span className={`text-xs font-medium flex items-center gap-1 ${calculateModeleMarge(template) >= 30 ? 'text-succes-texte' : 'text-alerte-texte'}`}>
                          <TrendingUp size={12} />
                          {calculateModeleMarge(template)}% marge
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronRight size={20} className={textMuted} />
                    </div>
                  </div>

                  {/* Preview des lignes (au hover) */}
                  {hoveredTemplate === template.id && (
                    <div className={`p-4 border-t bg-fond border-bord`}>
                      <p className={`text-xs font-medium mb-2 ${textMuted}`}>Aperçu des lignes :</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {template.lignes.slice(0, 6).map((ligne, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className={`truncate flex-1 ${textSecondary}`}>{ligne.description}</span>
                            <span className={textMuted}>
                              {ligne.quantite} {ligne.unite} × {ligne.prixUnitaire} €
                            </span>
                          </div>
                        ))}
                        {template.lignes.length > 6 && (
                          <p className={`text-xs ${textMuted}`}>... et {template.lignes.length - 6} autres lignes</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleSelectTemplate(selectedMetier, template)}
                        className="w-full mt-3 min-h-[44px] rounded-full text-sm font-semibold flex items-center justify-center gap-2 bg-surface text-encre border border-bord-fort hover:bg-surface-2"
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
        <div className={`p-4 border-t shrink-0 bg-fond border-bord`}>
          <p className={`text-xs text-center ${textMuted}`}>
            {Object.keys(MODELES_DEVIS).length} métiers · Les prix sont indicatifs et basés sur les moyennes du marché. Ajustez selon vos tarifs.
          </p>
        </div>
      </div>
    </div>
  );
}
