import React, { useState, useRef, useCallback } from 'react';
import { X, Camera, Upload, Scan, CheckCircle, AlertCircle, Edit3, RefreshCw, FileText, Calendar, Building2, Euro, Tag, Percent, Save, Sparkles } from 'lucide-react';
import { scanInvoice, formatAsExpense, EXPENSE_CATEGORIES } from '../lib/ocr/invoice-scanner';

/**
 * Composant de scan de factures avec OCR
 * Permet de photographier ou uploader une facture et extraire les donnees
 */
export default function InvoiceScanner({
  isOpen,
  onClose,
  onSave,
  chantiers = [],
  defaultChantierId = null,
  isDark,
  couleur
}) {
  const [step, setStep] = useState('capture'); // capture, processing, review, edit
  const [imageData, setImageData] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";
  const modalBg = isDark ? "bg-slate-900" : "bg-slate-50";

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image trop volumineuse (max 10 Mo)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      setImageData(dataUrl);
      setStep('processing');
      setError(null);

      try {
        const result = await scanInvoice(dataUrl);
        if (result.success) {
          setExtractedData(result);
          const expenseData = formatAsExpense(result, defaultChantierId);
          setFormData(expenseData);
          setStep('review');
        } else {
          setError(result.error || 'Erreur lors de l\'analyse');
          setStep('capture');
        }
      } catch (err) {
        setError(err.message || 'Erreur lors du scan');
        setStep('capture');
      }
    };
    reader.readAsDataURL(file);
  }, [defaultChantierId]);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('capture');
    setImageData(null);
    setExtractedData(null);
    setFormData(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!formData) return;

    // Validate required fields
    if (!formData.montant || formData.montant <= 0) {
      setError('Le montant est requis');
      return;
    }

    onSave({
      ...formData,
      justificatif: imageData // Save the image as proof
    });
    handleReset();
    onClose();
  };

  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'text-emerald-500';
    if (confidence >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 70) return 'Bonne reconnaissance';
    if (confidence >= 40) return 'Reconnaissance partielle';
    return 'Verification requise';
  };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={`relative ${modalBg} flex-1 m-2 sm:m-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-2xl mx-auto w-full`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: `${couleur}20` }}>
              <Scan size={24} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>Scanner une facture</h2>
              <p className={textMuted}>
                {step === 'capture' && 'Photographiez ou importez votre facture'}
                {step === 'processing' && 'Analyse en cours...'}
                {step === 'review' && 'Vérifiez les informations'}
                {step === 'edit' && 'Modifier les informations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}
          >
            <X size={20} className={textSecondary} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Error message */}
          {error && (
            <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
              <AlertCircle size={20} className="text-red-500" />
              <p className={isDark ? 'text-red-300' : 'text-red-700'}>{error}</p>
            </div>
          )}

          {/* Capture Step */}
          {step === 'capture' && (
            <div className="space-y-6">
              {/* Hidden inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Upload options */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Camera */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className={`${cardBg} rounded-xl border p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1`}
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                    <Camera size={32} style={{ color: couleur }} />
                  </div>
                  <h3 className={`font-semibold mb-1 ${textPrimary}`}>Prendre une photo</h3>
                  <p className={`text-sm ${textMuted}`}>Photographiez votre facture directement</p>
                </button>

                {/* File upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`${cardBg} rounded-xl border p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1`}
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                    <Upload size={32} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className={`font-semibold mb-1 ${textPrimary}`}>Importer un fichier</h3>
                  <p className={`text-sm ${textMuted}`}>JPG, PNG ou PDF (max 10 Mo)</p>
                </button>
              </div>

              {/* AI info */}
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="text-amber-500 mt-0.5" />
                  <div>
                    <p className={`font-medium ${textPrimary}`}>Reconnaissance intelligente</p>
                    <p className={`text-sm mt-1 ${textMuted}`}>
                      Notre IA détecte automatiquement le fournisseur, la date, les montants HT/TTC et la TVA.
                      Vérifiez toujours les informations extraites avant de valider.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: `${couleur}20` }}>
                <Scan size={40} className="animate-pulse" style={{ color: couleur }} />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>Analyse en cours...</h3>
              <p className={textMuted}>Détection du texte et extraction des informations</p>
              <div className="mt-6 w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
                <div className="h-full rounded-full animate-progress-bar" style={{ background: couleur }} />
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && formData && (
            <div className="space-y-6">
              {/* Confidence indicator */}
              <div className={`${cardBg} rounded-xl border p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={24} className={getConfidenceColor(extractedData?.confidence || 0)} />
                    <div>
                      <p className={`font-medium ${textPrimary}`}>{getConfidenceLabel(extractedData?.confidence || 0)}</p>
                      <p className={`text-sm ${textMuted}`}>Confiance: {extractedData?.confidence || 0}%</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep('edit')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                  >
                    <Edit3 size={14} />
                    Modifier
                  </button>
                </div>
              </div>

              {/* Image preview */}
              {imageData && (
                <div className={`${cardBg} rounded-xl border overflow-hidden`}>
                  <img src={imageData} alt="Facture scannée" className="w-full max-h-48 object-contain bg-slate-100 dark:bg-slate-700" />
                </div>
              )}

              {/* Extracted data summary */}
              <div className={`${cardBg} rounded-xl border p-4 space-y-4`}>
                <h3 className={`font-semibold ${textPrimary}`}>Informations extraites</h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Building2 size={18} className={textMuted} />
                    <div>
                      <p className={`text-xs ${textMuted}`}>Fournisseur</p>
                      <p className={`font-medium ${textPrimary}`}>{formData.fournisseur || 'Non detecte'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar size={18} className={textMuted} />
                    <div>
                      <p className={`text-xs ${textMuted}`}>Date</p>
                      <p className={`font-medium ${textPrimary}`}>
                        {formData.date ? new Date(formData.date).toLocaleDateString('fr-FR') : 'Non detecte'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Euro size={18} className={textMuted} />
                    <div>
                      <p className={`text-xs ${textMuted}`}>Montant HT</p>
                      <p className={`font-medium ${textPrimary}`}>
                        {formData.montant ? `${formData.montant.toFixed(2)} EUR` : 'Non detecte'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Percent size={18} className={textMuted} />
                    <div>
                      <p className={`text-xs ${textMuted}`}>TVA ({formData.tauxTVA || 20}%)</p>
                      <p className={`font-medium ${textPrimary}`}>
                        {formData.montantTVA ? `${formData.montantTVA.toFixed(2)} EUR` : 'Non detecte'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Tag size={18} className={textMuted} />
                    <div>
                      <p className={`text-xs ${textMuted}`}>Categorie</p>
                      <p className={`font-medium ${textPrimary}`}>
                        {EXPENSE_CATEGORIES[formData.categorie?.toUpperCase()]?.label || 'Autre'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FileText size={18} className={textMuted} />
                    <div>
                      <p className={`text-xs ${textMuted}`}>N° Facture</p>
                      <p className={`font-medium ${textPrimary}`}>{formData.numeroFacture || 'Non detecte'}</p>
                    </div>
                  </div>
                </div>

                {/* Chantier selection */}
                <div className={`pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Associer a un chantier</label>
                  <select
                    value={formData.chantierId || ''}
                    onChange={(e) => updateFormField('chantierId', e.target.value || null)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                  >
                    <option value="">Aucun chantier</option>
                    {chantiers.filter(c => c.statut === 'en_cours').map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                >
                  <RefreshCw size={18} />
                  Rescanner
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-white"
                  style={{ background: couleur }}
                >
                  <Save size={18} />
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Edit Step */}
          {step === 'edit' && formData && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Fournisseur</label>
                <input
                  type="text"
                  value={formData.fournisseur || ''}
                  onChange={(e) => updateFormField('fournisseur', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                  placeholder="Nom du fournisseur"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Date</label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => updateFormField('date', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>N° Facture</label>
                  <input
                    type="text"
                    value={formData.numeroFacture || ''}
                    onChange={(e) => updateFormField('numeroFacture', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                    placeholder="FA-2024-001"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Montant HT (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.montant || ''}
                    onChange={(e) => updateFormField('montant', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Taux TVA (%)</label>
                  <select
                    value={formData.tauxTVA || 20}
                    onChange={(e) => updateFormField('tauxTVA', parseFloat(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                  >
                    <option value="20">20%</option>
                    <option value="10">10%</option>
                    <option value="5.5">5.5%</option>
                    <option value="2.1">2.1%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Categorie</label>
                <select
                  value={formData.categorie || 'autre'}
                  onChange={(e) => updateFormField('categorie', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                >
                  {Object.values(EXPENSE_CATEGORIES).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Description</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                  placeholder="Description de la depense"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Chantier</label>
                <select
                  value={formData.chantierId || ''}
                  onChange={(e) => updateFormField('chantierId', e.target.value || null)}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                >
                  <option value="">Aucun chantier</option>
                  {chantiers.filter(c => c.statut === 'en_cours').map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('review')}
                  className={`flex-1 py-3 rounded-xl font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                >
                  Retour
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-white"
                  style={{ background: couleur }}
                >
                  <Save size={18} />
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS for progress animation */}
      <style>{`
        @keyframes progress-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-progress-bar {
          animation: progress-bar 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
