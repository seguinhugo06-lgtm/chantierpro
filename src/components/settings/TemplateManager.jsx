import { useState, useMemo } from 'react';
import { Trash2, Edit3, X, Check, Star, ChevronDown, ChevronUp, Search, Copy, FileText, TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatMoney } from '../../lib/formatters';
import { achatConnu, niveauMarge, CLASSES_TON_MARGE } from '../../lib/margeArticle';
import { useConfirm } from '../../context/AppContext';
import { BoutonIcone } from '../ui/Bouton';
import Pastille from '../ui/Pastille';
import EmptyState from '../ui/EmptyState';

/**
 * TemplateManager — manage custom devis templates
 * Used in Settings page, "Modèles" tab
 */
export default function TemplateManager({ isDark, couleur, modeDiscret }) {
  const { customTemplates, addTemplate, updateTemplate, deleteTemplate, toggleTemplateFavori } = useData();
  const { confirm } = useConfirm();

  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editForm, setEditForm] = useState({ nom: '', categorie: '', notes: '' });

  const cardBg = 'bg-surface border-bord';
  const inputBg = 'bg-surface border-bord-fort';
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const textMuted = 'text-encre-3';

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

  // Marge du modèle : seulement si chaque ligne a un prix d'achat connu (src/lib/margeArticle.js) ; avant, un prix d'achat
  // absent comptait 0 € et le modèle affichait « 100 % » de marge
  const getTemplateMarge = (t) => {
    const lignes = t.lignes || [];
    const total = lignes.reduce((sum, l) => sum + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0);
    if (total <= 0 || lignes.some((l) => achatConnu(l.prixAchat) === null)) return null;
    const cout = lignes.reduce((sum, l) => sum + (achatConnu(l.prixAchat) * (l.quantite || 0)), 0);
    return Math.round(((total - cout) / total) * 100);
  };

  const supprimer = async (t) => {
    if (await confirm({ title: 'Supprimer ce modèle ?', message: `« ${t.nom} » ne sera plus proposé pour vos nouveaux devis. Les devis déjà faits ne changent pas.` })) {
      await deleteTemplate(t.id);
    }
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
          Ils sont enregistrés avec votre compte et proposés dans Devis Express et le sélecteur de modèles.
        </p>

        {/* Search */}
        {customTemplates.length > 3 && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-fond border-bord`}>
            <Search size={16} className={textMuted} />
            <input
              type="text"
              placeholder="Rechercher un modèle..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`flex-1 bg-transparent text-sm outline-none ${textPrimary}`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Effacer la recherche" className="-my-2 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-bord">
                <X size={16} className={textMuted} aria-hidden="true" />
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
                        <label htmlFor={`modele-nom-${t.id}`} className="block text-sm font-medium mb-1.5 text-encre-2">Nom</label>
                        <input
                          id={`modele-nom-${t.id}`}
                          value={editForm.nom}
                          onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))}
                          className={`w-full h-11 px-3 border rounded-xl text-base sm:text-sm ${inputBg}`}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label htmlFor={`modele-categorie-${t.id}`} className="block text-sm font-medium mb-1.5 text-encre-2">Catégorie</label>
                        <input
                          id={`modele-categorie-${t.id}`}
                          value={editForm.categorie}
                          onChange={e => setEditForm(f => ({ ...f, categorie: e.target.value }))}
                          className={`w-full h-11 px-3 border rounded-xl text-base sm:text-sm ${inputBg}`}
                          placeholder="Mes modèles"
                        />
                      </div>
                      <div>
                        <label htmlFor={`modele-notes-${t.id}`} className="block text-sm font-medium mb-1.5 text-encre-2">Notes</label>
                        <textarea
                          id={`modele-notes-${t.id}`}
                          value={editForm.notes}
                          onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-xl text-base sm:text-sm ${inputBg}`}
                          rows={2}
                          placeholder="Notes optionnelles..."
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className={`h-11 px-3 rounded-full text-sm font-medium hover:bg-surface-2 ${textSecondary}`}
                        >
                          Annuler
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={!editForm.nom.trim()}
                          className="h-11 px-4 rounded-full text-sm font-semibold disabled:opacity-50 bg-accent text-sur-accent"
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
                        aria-pressed={!!t.favori}
                        aria-label={t.favori ? `Retirer ${t.nom} des favoris` : `Mettre ${t.nom} en favori`}
                        className={`-mt-2 -ml-2 w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${t.favori ? 'text-encre' : 'text-encre-3 hover:text-encre-2'}`}
                      >
                        <Star size={18} fill={t.favori ? 'currentColor' : 'none'} aria-hidden="true" />
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${textPrimary} truncate`}>{t.nom}</h4>
                          <Pastille className="shrink-0">{t.categorie || t.category || 'Mes modèles'}</Pastille>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className={textMuted}>{(t.lignes || []).length} ligne{(t.lignes || []).length > 1 ? 's' : ''}</span>
                          <span className="font-semibold tabular-nums text-encre">
                            {fmt(total)} HT
                          </span>
                          <span className={`flex items-center gap-1 ${CLASSES_TON_MARGE[niveauMarge(marge).ton].texte}`}>
                            <TrendingUp size={14} aria-hidden="true" />
                            {modeDiscret ? '•••' : marge === null ? 'Marge non calculée' : `Marge ${marge} %`}
                          </span>
                          {t.usage_count > 0 && (
                            <span className={textMuted}>
                              Utilisé {t.usage_count}×
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p className={`text-sm mt-1 ${textMuted} truncate`}>{t.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <BoutonIcone icone={isExpanded ? ChevronUp : ChevronDown} taille={18} aria-expanded={isExpanded}
                          libelle={isExpanded ? 'Masquer les lignes' : 'Aperçu des lignes'} onClick={() => setExpandedId(isExpanded ? null : t.id)} />
                        <BoutonIcone icone={Edit3} taille={18} libelle="Modifier" onClick={() => startEdit(t)} />
                        <BoutonIcone icone={Copy} taille={18} libelle="Dupliquer" onClick={() => handleDuplicate(t)} />
                        <BoutonIcone icone={Trash2} taille={18} libelle="Supprimer" className="!text-danger-texte hover:!bg-danger-fond" onClick={() => supprimer(t)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded lines preview */}
                {isExpanded && !isEditing && (
                  <div className={`px-4 sm:px-5 pb-4 pt-0 border-t border-bord`}>
                    <p className={`text-sm font-medium mb-2 mt-3 ${textMuted}`}>Aperçu des lignes :</p>
                    <div className="space-y-1.5">
                      {(t.lignes || []).map((ligne, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm gap-2">
                          <span className={`truncate flex-1 ${textSecondary}`}>{ligne.description}</span>
                          <span className={`${textMuted} shrink-0`}>
                            {ligne.quantite} {ligne.unite} × {fmt(ligne.prixUnitaire)}
                          </span>
                          <span className={`font-medium shrink-0 ${textPrimary}`}>
                            {fmt(ligne.quantite * ligne.prixUnitaire)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={`flex items-center justify-end mt-3 pt-2 border-t text-sm font-medium border-bord`}>
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
