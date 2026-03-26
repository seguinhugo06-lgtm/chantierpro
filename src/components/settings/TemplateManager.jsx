import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, X, Check, Star, ChevronDown, ChevronUp, Search, Copy, FileText, TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatMoney } from '../../lib/formatters';
import EmptyState from '../ui/EmptyState';

/**
 * TemplateManager — manage custom devis templates
 * Used in Settings page, "Modèles" tab
 */
export default function TemplateManager({ isDark, couleur, modeDiscret }) {
  const { customTemplates, addTemplate, updateTemplate, deleteTemplate, toggleTemplateFavori } = useData();

  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editForm, setEditForm] = useState({ nom: '', categorie: '', notes: '' });

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return customTemplates;
    const q = searchQuery.toLowerCase();
    return customTemplates.filter(t =>
      t.nom?.toLowerCase().includes(q) ||
      (t.categorie || t.category || '').toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [customTemplates, searchQuery]);

  // Sort: favoris first, then by date
  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => {
      if (a.favori && !b.favori) return -1;
      if (!a.favori && b.favori) return 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [filteredTemplates]);

  const getTemplateTotal = (t) => {
    return (t.lignes || []).reduce((sum, l) => sum + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0);
  };

  const getTemplateMarge = (t) => {
    const total = (t.lignes || []).reduce((sum, l) => sum + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0);
    const cout = (t.lignes || []).reduce((sum, l) => sum + ((l.prixAchat || 0) * (l.quantite || 0)), 0);
    return total > 0 ? Math.round(((total - cout) / total) * 100) : 0;
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditForm({
      nom: t.nom || '',
      categorie: t.categorie || t.category || '',
      notes: t.notes || '',
    });
  };

  const saveEdit = async () => {
    if (!editForm.nom.trim()) return;
    await updateTemplate(editingId, {
      nom: editForm.nom.trim(),
      categorie: editForm.categorie.trim() || 'Mes modèles',
      notes: editForm.notes.trim(),
    });
    setEditingId(null);
  };

  const handleDuplicate = async (t) => {
    await addTemplate({
      nom: `${t.nom} (copie)`,
      categorie: t.categorie || t.category || 'Mes modèles',
      description: t.description,
      lignes: t.lignes || [],
      tva_defaut: t.tva_defaut || 10,
      notes: t.notes || '',
      tags: t.tags || [],
    });
  };

  const fmt = (n) => modeDiscret ? '•••' : formatMoney(n);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`font-semibold text-lg ${textPrimary}`}>Modèles de devis</h3>
            <p className={`text-sm ${textMuted}`}>
              {customTemplates.length} modèle{customTemplates.length > 1 ? 's' : ''} personnalisé{customTemplates.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <p className={`text-sm ${textSecondary} mb-4`}>
          Vos modèles personnalisés sont créés depuis vos devis existants (bouton "Sauvegarder comme modèle" dans le menu d'un devis).
          Ils sont synchronisés entre tous vos appareils et disponibles dans Devis Express et le sélecteur de modèles.
        </p>

        {/* Search */}
        {customTemplates.length > 3 && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
            <Search size={16} className={textMuted} />
            <input
              type="text"
              placeholder="Rechercher un modèle..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`flex-1 bg-transparent text-sm outline-none ${textPrimary}`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={`p-0.5 rounded ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
                <X size={14} className={textMuted} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Templates list */}
      {sortedTemplates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? 'Aucun modèle trouvé' : 'Aucun modèle personnalisé'}
          description={searchQuery
            ? `Aucun modèle ne correspond à "${searchQuery}"`
            : 'Créez vos premiers modèles depuis un devis existant en utilisant le menu ⋮ → "Sauvegarder comme modèle".'
          }
          isDark={isDark}
          couleur={couleur}
        />
      ) : (
        <div className="space-y-3">
          {sortedTemplates.map(t => {
            const isEditing = editingId === t.id;
            const isExpanded = expandedId === t.id;
            const total = getTemplateTotal(t);
            const marge = getTemplateMarge(t);

            return (
              <div
                key={t.id}
                className={`${cardBg} rounded-xl sm:rounded-2xl border overflow-hidden transition-all`}
              >
                {/* Main row */}
                <div className="p-4 sm:p-5">
                  {isEditing ? (
                    /* Editing form */
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Nom</label>
                        <input
                          value={editForm.nom}
                          onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Catégorie</label>
                        <input
                          value={editForm.categorie}
                          onChange={e => setEditForm(f => ({ ...f, categorie: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                          placeholder="Mes modèles"
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Notes</label>
                        <textarea
                          value={editForm.notes}
                          onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                          rows={2}
                          placeholder="Notes optionnelles..."
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} ${textSecondary}`}
                        >
                          Annuler
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={!editForm.nom.trim()}
                          className="px-4 py-1.5 rounded-lg text-sm text-white font-medium disabled:opacity-50"
                          style={{ background: couleur }}
                        >
                          <Check size={14} className="inline mr-1" /> Enregistrer
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display row */
                    <div className="flex items-start gap-3">
                      {/* Favori star */}
                      <button
                        onClick={() => toggleTemplateFavori(t.id)}
                        className={`mt-0.5 p-1 rounded-lg transition-colors ${
                          t.favori
                            ? 'text-amber-500'
                            : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-300 hover:text-slate-500'
                        }`}
                      >
                        <Star size={16} fill={t.favori ? 'currentColor' : 'none'} />
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${textPrimary} truncate`}>{t.nom}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                            {t.categorie || t.category || 'Mes modèles'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={textMuted}>{(t.lignes || []).length} lignes</span>
                          <span className="font-medium" style={{ color: couleur }}>
                            {fmt(total)} HT
                          </span>
                          <span className={`flex items-center gap-0.5 ${marge >= 30 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            <TrendingUp size={12} />
                            {modeDiscret ? '•••' : `${marge}%`}
                          </span>
                          {t.usage_count > 0 && (
                            <span className={textMuted}>
                              Utilisé {t.usage_count}×
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p className={`text-xs mt-1 ${textMuted} truncate`}>{t.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                          title="Aperçu des lignes"
                        >
                          {isExpanded ? <ChevronUp size={14} className={textMuted} /> : <ChevronDown size={14} className={textMuted} />}
                        </button>
                        <button
                          onClick={() => startEdit(t)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                          title="Modifier"
                        >
                          <Edit3 size={14} className={textMuted} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(t)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                          title="Dupliquer"
                        >
                          <Copy size={14} className={textMuted} />
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-400'}`}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded lines preview */}
                {isExpanded && !isEditing && (
                  <div className={`px-4 sm:px-5 pb-4 pt-0 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <p className={`text-xs font-medium mb-2 mt-3 ${textMuted}`}>Aperçu des lignes :</p>
                    <div className="space-y-1.5">
                      {(t.lignes || []).map((ligne, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs gap-2">
                          <span className={`truncate flex-1 ${textSecondary}`}>{ligne.description}</span>
                          <span className={`${textMuted} shrink-0`}>
                            {ligne.quantite} {ligne.unite} × {modeDiscret ? '•••' : `${ligne.prixUnitaire} €`}
                          </span>
                          <span className={`font-medium shrink-0 ${textPrimary}`}>
                            {fmt(ligne.quantite * ligne.prixUnitaire)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={`flex items-center justify-end mt-3 pt-2 border-t text-sm font-medium ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <span className={textMuted}>Total HT :</span>
                      <span className={`ml-2 ${textPrimary}`}>{fmt(total)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
