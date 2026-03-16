/**
 * InterventionForm.jsx — Report a warranty intervention (SAV disorder)
 *
 * Form for signaling a construction defect covered under one of the
 * three legal warranties (parfait achevement, biennale, decennale).
 */

import React, { useState, useCallback, memo } from 'react';
import { Wrench, Calendar, MapPin, Camera, X, AlertCircle } from 'lucide-react';

const TYPES_DESORDRE = [
  'Fissure',
  'Infiltration',
  'Affaissement',
  'Equipement defaillant',
  'Malfacon',
  "Defaut d'etancheite",
  'Probleme electrique',
  'Autre',
];

const InterventionForm = memo(function InterventionForm({
  garantie,
  chantier,
  onSubmit,
  onClose,
  isDark = false,
  couleur = '#f97316',
}) {
  const today = new Date().toISOString().split('T')[0];

  const [dateSignalement, setDateSignalement] = useState(today);
  const [typeDesordre, setTypeDesordre] = useState(TYPES_DESORDRE[0]);
  const [localisation, setLocalisation] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const overlayBg = 'bg-black/50';

  // -- Photo handler --
  const handlePhotosChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files]);
  }, []);

  const removePhoto = useCallback((index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  // -- Format guarantee info --
  const formatGarantieInfo = () => {
    if (!garantie) return null;
    const type = garantie.type || garantie.typeGarantie || '';
    const debut = garantie.dateDebut
      ? new Date(garantie.dateDebut).toLocaleDateString('fr-FR')
      : '';
    const fin = garantie.dateFin
      ? new Date(garantie.dateFin).toLocaleDateString('fr-FR')
      : '';
    return { type, debut, fin };
  };

  const garantieInfo = formatGarantieInfo();

  // -- Submit --
  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      alert('Veuillez fournir une description du desordre.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit?.({
        garantieId: garantie?.id,
        dateSignalement,
        typeDesordre,
        localisation,
        description,
        photos,
      });
    } catch (err) {
      console.error('[InterventionForm] Error:', err);
      alert(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [garantie, dateSignalement, typeDesordre, localisation, description, photos, onSubmit]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayBg}`} onClick={onClose}>
      <div
        className={`w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl ${cardBg} flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: couleur }}>
              <Wrench size={20} />
            </div>
            <div>
              <h2 className={`text-base font-semibold ${textPrimary}`}>
                Signaler un desordre
              </h2>
              {(chantier?.nom || chantier?.name) && (
                <p className={`text-xs ${textMuted}`}>{chantier.nom || chantier.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Garantie concernee */}
          {garantieInfo && (
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700 border border-slate-600' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                <span className={`text-xs font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  Garantie concernee
                </span>
              </div>
              <p className={`text-sm font-medium ${textPrimary}`}>{garantieInfo.type}</p>
              {(garantieInfo.debut || garantieInfo.fin) && (
                <p className={`text-xs ${textMuted}`}>
                  {garantieInfo.debut && `Du ${garantieInfo.debut}`}
                  {garantieInfo.fin && ` au ${garantieInfo.fin}`}
                </p>
              )}
            </div>
          )}

          {/* Date de signalement */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>
              <Calendar size={12} className="inline mr-1" />
              Date de signalement *
            </label>
            <input
              type="date"
              value={dateSignalement}
              onChange={e => setDateSignalement(e.target.value)}
              required
              className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
            />
          </div>

          {/* Type de desordre */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>Type de desordre *</label>
            <select
              value={typeDesordre}
              onChange={e => setTypeDesordre(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
            >
              {TYPES_DESORDRE.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Localisation */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>
              <MapPin size={12} className="inline mr-1" />
              Localisation
            </label>
            <input
              type="text"
              value={localisation}
              onChange={e => setLocalisation(e.target.value)}
              placeholder="Ex: Salle de bain, Cuisine, Terrasse..."
              className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Decrivez le desordre constate en detail..."
              rows={4}
              required
              className={`w-full px-3 py-2 rounded-xl border text-sm resize-none ${inputBg}`}
            />
          </div>

          {/* Photos */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>
              <Camera size={12} className="inline mr-1" />
              Photos
            </label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                isDark
                  ? 'border-slate-600 hover:border-slate-500'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Camera size={20} className={`mx-auto mb-1 ${textMuted}`} />
              <p className={`text-xs ${textMuted}`}>Cliquez ou glissez vos photos ici</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotosChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${
                      isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Camera size={10} />
                    <span className="max-w-[120px] truncate">{photo.name}</span>
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className={`p-0.5 rounded ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className={`flex gap-2 p-5 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
              isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !description.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: couleur }}
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <AlertCircle size={16} />
                Signaler le desordre
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default InterventionForm;
