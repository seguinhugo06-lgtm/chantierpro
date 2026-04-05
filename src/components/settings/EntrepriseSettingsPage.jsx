/**
 * EntrepriseSettingsPage.jsx — Full multi-entreprise management page
 *
 * Replaces the old localStorage-only MultiEntreprise component.
 * Shows a list of entreprises with CRUD, activation, archival.
 */

import React, { useState, memo } from 'react';
import {
  Building2, Plus, Star, Edit2, Archive, Check,
  Phone, Mail, MapPin, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { useEntreprise } from '../../context/EntrepriseContext';
import { useConfirm } from '../../context/AppContext';
import EntrepriseFormModal from './EntrepriseFormModal';

const MAX_ENTREPRISES = 5;

/**
 * Compute initiales from a company name.
 */
function getInitiales(ent) {
  if (ent.initiales) return ent.initiales;
  const nom = ent.nom || '';
  const words = nom.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return nom.slice(0, 2).toUpperCase() || '??';
}

const EntrepriseSettingsPage = memo(function EntrepriseSettingsPage({
  isDark = false,
  couleur = '#f97316',
  showToast,
}) {
  const { confirm } = useConfirm();
  const {
    entreprises,
    activeEntreprise,
    hasMultiple,
    switchEntreprise,
    addEntreprise,
    updateEntreprise,
    archiveEntreprise,
    refreshEntreprises,
  } = useEntreprise();

  const [showForm, setShowForm] = useState(false);
  const [editingEntreprise, setEditingEntreprise] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const canAdd = entreprises.length < MAX_ENTREPRISES;

  const handleAdd = () => {
    setEditingEntreprise(null);
    setShowForm(true);
  };

  const handleEdit = (ent) => {
    setEditingEntreprise(ent);
    setShowForm(true);
  };

  const handleSave = async (data) => {
    setIsProcessing(true);
    try {
      if (editingEntreprise) {
        await updateEntreprise(editingEntreprise.id, data);
        showToast?.('Entreprise mise à jour', 'success');
      } else {
        await addEntreprise(data);
        showToast?.('Entreprise créée', 'success');
      }
      setShowForm(false);
      setEditingEntreprise(null);
    } catch (err) {
      showToast?.(`Erreur : ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivate = async (id) => {
    if (id === activeEntreprise?.id) return;
    setIsProcessing(true);
    try {
      await switchEntreprise(id);
      showToast?.('Entreprise activée', 'success');
    } catch (err) {
      showToast?.('Erreur lors de l\'activation', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async (ent) => {
    if (entreprises.length <= 1) {
      showToast?.('Impossible d\'archiver votre seule entreprise', 'error');
      return;
    }

    const confirmed = await confirm({
      title: `Archiver ${ent.nom} ?`,
      message: 'Cette entreprise sera désactivée et masquée. Ses devis et chantiers resteront accessibles.',
      confirmText: 'Archiver',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await archiveEntreprise(ent.id);
      showToast?.(`${ent.nom} archivée`, 'success');
    } catch (err) {
      showToast?.('Erreur lors de l\'archivage', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const tc = {
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    text: isDark ? 'text-white' : 'text-gray-900',
    textMuted: isDark ? 'text-slate-400' : 'text-gray-500',
    bg: isDark ? 'bg-slate-900' : 'bg-gray-50',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-lg font-semibold ${tc.text}`}>
            Mes entreprises
          </h2>
          <p className={`text-sm ${tc.textMuted}`}>
            {entreprises.length} entreprise{entreprises.length > 1 ? 's' : ''} · Maximum {MAX_ENTREPRISES}
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAdd || isProcessing}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
            transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed
          `}
          style={{ background: couleur }}
        >
          <Plus size={16} />
          Nouvelle entreprise
        </button>
      </div>

      {/* Entreprise list */}
      <div className="space-y-3">
        {entreprises.map((ent) => {
          const isActive = ent.id === activeEntreprise?.id;
          const initiales = getInitiales(ent);
          const isExpanded = expandedId === ent.id;

          return (
            <div
              key={ent.id}
              className={`
                rounded-2xl border overflow-hidden transition-shadow
                ${isActive ? 'ring-2' : ''}
                ${tc.card}
              `}
              style={isActive ? { '--tw-ring-color': ent.couleur || couleur } : undefined}
            >
              {/* Main row */}
              <div className="flex items-center gap-4 p-4">
                {/* Logo/Initiales */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${ent.couleur || '#94a3b8'}, ${ent.couleur || '#94a3b8'}cc)` }}
                >
                  {initiales}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold truncate ${tc.text}`}>
                      {ent.nom}
                    </h3>
                    {isActive && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white flex-shrink-0"
                        style={{ background: ent.couleur || couleur }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${tc.textMuted}`}>
                    {[ent.formeJuridique, ent.siret && `SIRET ${ent.siret}`, ent.ville].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => handleActivate(ent.id)}
                      disabled={isProcessing}
                      className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                        isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
                      }`}
                      title="Activer cette entreprise"
                    >
                      <Star size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(ent)}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                      isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ent.id)}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                      isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                    title={isExpanded ? 'Réduire' : 'Détails'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className={`px-4 pb-4 pt-1 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-100'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {ent.adresse && (
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className={`mt-0.5 ${tc.textMuted}`} />
                        <span className={tc.textMuted}>
                          {ent.adresse}{ent.codePostal ? `, ${ent.codePostal}` : ''}{ent.ville ? ` ${ent.ville}` : ''}
                        </span>
                      </div>
                    )}
                    {ent.tel && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className={tc.textMuted} />
                        <span className={tc.textMuted}>{ent.tel}</span>
                      </div>
                    )}
                    {ent.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className={tc.textMuted} />
                        <span className={tc.textMuted}>{ent.email}</span>
                      </div>
                    )}
                    {ent.tvaIntra && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${tc.textMuted}`}>TVA :</span>
                        <span className={tc.textMuted}>{ent.tvaIntra}</span>
                      </div>
                    )}
                  </div>

                  {/* Archive button */}
                  {entreprises.length > 1 && (
                    <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: isDark ? 'rgb(51,65,85,0.5)' : 'rgb(243,244,246)' }}>
                      <button
                        onClick={() => handleArchive(ent)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Archive size={14} />
                        Archiver
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {entreprises.length === 0 && (
        <div className={`text-center py-12 rounded-2xl border ${tc.card}`}>
          <Building2 size={40} className={`mx-auto mb-3 ${tc.textMuted}`} />
          <p className={`font-medium ${tc.text}`}>Aucune entreprise</p>
          <p className={`text-sm mt-1 ${tc.textMuted}`}>Créez votre première entreprise pour commencer</p>
          <button
            onClick={handleAdd}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: couleur }}
          >
            Créer une entreprise
          </button>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <EntrepriseFormModal
          entreprise={editingEntreprise}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingEntreprise(null); }}
          isDark={isDark}
          couleur={couleur}
          isProcessing={isProcessing}
        />
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/10 z-40 flex items-center justify-center pointer-events-none">
          <Loader2 size={24} className="animate-spin text-orange-500" />
        </div>
      )}
    </div>
  );
});

export default EntrepriseSettingsPage;
