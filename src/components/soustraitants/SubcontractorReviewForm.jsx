/**
 * SubcontractorReviewForm.jsx — Rate a subcontractor (5 criteria)
 */

import React, { useState, useCallback, memo } from 'react';
import { Star, X } from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';
import { useOrg } from '../../context/OrgContext';
import { createReview } from '../../services/subcontractorService';
import StarRating from '../ui/StarRating';

const CRITERIA = [
  { key: 'noteQualite', label: 'Qualité du travail' },
  { key: 'noteDelais', label: 'Respect des délais' },
  { key: 'notePrix', label: 'Rapport qualité/prix' },
  { key: 'noteCommunication', label: 'Communication' },
  { key: 'noteProprete', label: 'Propreté du chantier' },
];

const SubcontractorReviewForm = memo(function SubcontractorReviewForm({
  subcontractorId,
  subcontractorName,
  chantiers = [],
  existingReview = null,
  onSubmit,
  onCancel,
  isDark = false,
  couleur = '#f97316',
}) {
  const { orgId } = useOrg();

  const [ratings, setRatings] = useState({
    noteQualite: existingReview?.noteQualite || 0,
    noteDelais: existingReview?.noteDelais || 0,
    notePrix: existingReview?.notePrix || 0,
    noteCommunication: existingReview?.noteCommunication || 0,
    noteProprete: existingReview?.noteProprete || 0,
  });
  const [chantierId, setChantierId] = useState(existingReview?.chantierId || '');
  const [commentaire, setCommentaire] = useState(existingReview?.commentaire || '');
  const [recommande, setRecommande] = useState(existingReview?.recommande ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allRated = Object.values(ratings).every(v => v > 0);
  const noteGlobale = allRated
    ? (Object.values(ratings).reduce((s, v) => s + v, 0) / 5).toFixed(1)
    : null;

  const handleSubmit = useCallback(async () => {
    if (!allRated) return;
    setIsSubmitting(true);
    try {
      const user = isDemo ? { id: 'demo-user-id' } : (await supabase.auth.getUser()).data?.user;
      await createReview(supabase, {
        data: {
          subcontractorId,
          chantierId: chantierId || null,
          ...ratings,
          commentaire,
          recommande,
        },
        userId: user?.id,
        orgId,
      });
      onSubmit?.();
    } catch (err) {
      console.error('[ReviewForm] Error:', err);
      alert(`Erreur : ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [allRated, subcontractorId, chantierId, ratings, commentaire, recommande, orgId, onSubmit]);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className={`rounded-2xl border ${cardBg} p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${textPrimary}`}>
          Évaluer — {subcontractorName}
        </h3>
        {onCancel && (
          <button onClick={onCancel} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Chantier selector */}
      {chantiers.length > 0 && (
        <div className="mb-4">
          <label className={`text-xs font-medium ${textPrimary}`}>Chantier (optionnel)</label>
          <select
            value={chantierId}
            onChange={(e) => setChantierId(e.target.value)}
            className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs ${inputBg}`}
          >
            <option value="">Sélectionner un chantier...</option>
            {chantiers.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.nom || ch.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Rating criteria */}
      <div className="space-y-3 mb-4">
        {CRITERIA.map(criterion => (
          <div key={criterion.key} className="flex items-center justify-between">
            <span className={`text-xs font-medium ${textPrimary}`}>{criterion.label}</span>
            <StarRating
              value={ratings[criterion.key]}
              onChange={(val) => setRatings(prev => ({ ...prev, [criterion.key]: val }))}
              size="md"
              isDark={isDark}
            />
          </div>
        ))}
      </div>

      {/* Global score */}
      {noteGlobale && (
        <div className={`flex items-center justify-center gap-2 py-3 mb-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'}`}>
          <span className={`text-sm font-medium ${textPrimary}`}>Note globale :</span>
          <span className="text-lg font-bold text-amber-500">{noteGlobale}/5</span>
          <StarRating value={parseFloat(noteGlobale)} readOnly size="sm" isDark={isDark} />
        </div>
      )}

      {/* Comment */}
      <div className="mb-4">
        <label className={`text-xs font-medium ${textPrimary}`}>Commentaire</label>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Travail soigné, léger retard sur la livraison..."
          rows={3}
          className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs ${inputBg} resize-none`}
        />
      </div>

      {/* Recommend */}
      <label className={`flex items-center gap-2 mb-5 cursor-pointer`}>
        <input
          type="checkbox"
          checked={recommande}
          onChange={(e) => setRecommande(e.target.checked)}
          className="rounded"
          style={{ accentColor: couleur }}
        />
        <span className={`text-xs font-medium ${textPrimary}`}>Je recommande ce sous-traitant</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
              isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Annuler
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!allRated || isSubmitting}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: couleur }}
        >
          {isSubmitting ? (
            <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
          ) : (
            '✓ Enregistrer'
          )}
        </button>
      </div>
    </div>
  );
});

export default SubcontractorReviewForm;
