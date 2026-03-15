/**
 * ReceptionForm.jsx — Modal form for "Reception des travaux"
 *
 * Formal delivery of completed construction work (French BTP legal requirement).
 * Triggers the 3 legal warranties: parfait achevement (1yr), biennale (2yr), decennale (10yr).
 */

import React, { useState, useCallback, memo } from 'react';
import { Calendar, Plus, X, AlertTriangle, FileText, Upload, Check } from 'lucide-react';

const ReceptionForm = memo(function ReceptionForm({
  chantier,
  onSubmit,
  onClose,
  isDark = false,
  couleur = '#f97316',
  user,
}) {
  const today = new Date().toISOString().split('T')[0];

  const [dateReception, setDateReception] = useState(today);
  const [typeReception, setTypeReception] = useState('sans_reserve');
  const [signataireClient, setSignataireClient] = useState(
    chantier?.client?.nom || chantier?.client?.name || chantier?.clientName || ''
  );
  const [signataireEntreprise, setSignataireEntreprise] = useState('');
  const [observations, setObservations] = useState('');
  const [reserves, setReserves] = useState([]);
  const [pvFile, setPvFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const overlayBg = 'bg-black/50';

  // -- Reserve helpers --
  const addReserve = useCallback(() => {
    setReserves(prev => [
      ...prev,
      { id: crypto.randomUUID(), description: '', localisation: '', priorite: 'normale' },
    ]);
  }, []);

  const updateReserve = useCallback((id, field, value) => {
    setReserves(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  const removeReserve = useCallback((id) => {
    setReserves(prev => prev.filter(r => r.id !== id));
  }, []);

  // -- File handler --
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0] || null;
    setPvFile(file);
  }, []);

  // -- Submit --
  const handleSubmit = useCallback(async () => {
    if (!dateReception) return;
    if (typeReception === 'avec_reserves' && reserves.some(r => !r.description.trim())) {
      alert('Veuillez remplir la description de chaque reserve.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit?.({
        dateReception,
        typeReception,
        signataireClient,
        signataireEntreprise,
        observations,
        reserves: typeReception === 'avec_reserves' ? reserves : [],
        pvFile,
      });
    } catch (err) {
      console.error('[ReceptionForm] Error:', err);
      alert(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [dateReception, typeReception, signataireClient, signataireEntreprise, observations, reserves, pvFile, onSubmit]);

  const TYPE_OPTIONS = [
    { value: 'sans_reserve', label: 'Sans reserve', desc: 'Travaux conformes' },
    { value: 'avec_reserves', label: 'Avec reserves', desc: 'Travaux acceptes sous conditions' },
    { value: 'refusee', label: 'Refusee', desc: 'Travaux non conformes' },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayBg}`} onClick={onClose}>
      <div
        className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl ${cardBg} flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: couleur }}>
              <FileText size={20} />
            </div>
            <div>
              <h2 className={`text-base font-semibold ${textPrimary}`}>
                Reception des travaux
              </h2>
              {chantier?.nom || chantier?.name ? (
                <p className={`text-xs ${textMuted}`}>{chantier.nom || chantier.name}</p>
              ) : null}
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
          {/* Date de reception */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>
              <Calendar size={12} className="inline mr-1" />
              Date de reception *
            </label>
            <input
              type="date"
              value={dateReception}
              onChange={e => setDateReception(e.target.value)}
              required
              className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
            />
          </div>

          {/* Type de reception */}
          <div>
            <label className={`block text-xs font-medium mb-2 ${textPrimary}`}>Type de reception *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(opt => {
                const isSelected = typeReception === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-offset-1'
                        : isDark
                          ? 'border-slate-600 hover:border-slate-500'
                          : 'border-gray-200 hover:border-gray-300'
                    } ${isDark ? 'bg-slate-700' : 'bg-white'}`}
                    style={isSelected ? { borderColor: couleur, ringColor: couleur } : undefined}
                  >
                    <input
                      type="radio"
                      name="typeReception"
                      value={opt.value}
                      checked={isSelected}
                      onChange={e => setTypeReception(e.target.value)}
                      className="mt-0.5"
                      style={{ accentColor: couleur }}
                    />
                    <div>
                      <span className={`text-sm font-medium ${textPrimary}`}>{opt.label}</span>
                      <p className={`text-[10px] ${textMuted}`}>{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Signataire client */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>Signataire client</label>
            <input
              type="text"
              value={signataireClient}
              onChange={e => setSignataireClient(e.target.value)}
              placeholder="Nom du client signataire"
              className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
            />
          </div>

          {/* Signataire entreprise */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>Signataire entreprise</label>
            <input
              type="text"
              value={signataireEntreprise}
              onChange={e => setSignataireEntreprise(e.target.value)}
              placeholder="Nom du representant de l'entreprise"
              className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
            />
          </div>

          {/* Observations */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>Observations</label>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Remarques generales sur l'etat des travaux..."
              rows={3}
              className={`w-full px-3 py-2 rounded-xl border text-sm resize-none ${inputBg}`}
            />
          </div>

          {/* Reserves section — shown only for avec_reserves */}
          {typeReception === 'avec_reserves' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-medium ${textPrimary}`}>
                  <AlertTriangle size={12} className="inline mr-1 text-orange-500" />
                  Reserves ({reserves.length})
                </label>
                <button
                  type="button"
                  onClick={addReserve}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                  style={{ background: couleur }}
                >
                  <Plus size={12} /> Ajouter une reserve
                </button>
              </div>

              {reserves.length === 0 && (
                <p className={`text-xs text-center py-4 ${textMuted}`}>
                  Aucune reserve ajoutee. Cliquez sur &quot;Ajouter une reserve&quot; pour commencer.
                </p>
              )}

              <div className="space-y-3">
                {reserves.map((reserve, idx) => (
                  <div
                    key={reserve.id}
                    className={`p-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold ${textPrimary}`}>Reserve {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeReserve(reserve.id)}
                        className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={reserve.description}
                        onChange={e => updateReserve(reserve.id, 'description', e.target.value)}
                        placeholder="Description de la reserve *"
                        required
                        className={`w-full px-3 py-2 rounded-lg border text-xs ${inputBg}`}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={reserve.localisation}
                          onChange={e => updateReserve(reserve.id, 'localisation', e.target.value)}
                          placeholder="Localisation (ex: Cuisine)"
                          className={`px-3 py-2 rounded-lg border text-xs ${inputBg}`}
                        />
                        <select
                          value={reserve.priorite}
                          onChange={e => updateReserve(reserve.id, 'priorite', e.target.value)}
                          className={`px-3 py-2 rounded-lg border text-xs ${inputBg}`}
                        >
                          <option value="mineure">Mineure</option>
                          <option value="normale">Normale</option>
                          <option value="majeure">Majeure</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PV de reception — file upload */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>
              <Upload size={12} className="inline mr-1" />
              PV de reception (optionnel)
            </label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                isDark
                  ? 'border-slate-600 hover:border-slate-500'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {pvFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={16} className={textMuted} />
                  <span className={`text-sm ${textPrimary}`}>{pvFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setPvFile(null)}
                    className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={20} className={`mx-auto mb-1 ${textMuted}`} />
                  <p className={`text-xs ${textMuted}`}>PDF, JPG ou PNG</p>
                </div>
              )}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Warning notice */}
          <div className={`flex items-start gap-2 p-3 rounded-xl ${isDark ? 'bg-amber-900/30 border border-amber-700/50' : 'bg-amber-50 border border-amber-200'}`}>
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              La reception declenche automatiquement les 3 garanties legales (parfait achevement 1 an, biennale 2 ans, decennale 10 ans)
            </p>
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
            disabled={loading || !dateReception}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: couleur }}
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Check size={16} />
                Valider la reception
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ReceptionForm;
