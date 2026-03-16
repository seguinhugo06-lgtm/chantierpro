import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, Plus, Trash2, AlertTriangle, CreditCard, ClipboardList, GripVertical } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ECHEANCIER_TEMPLATES,
  TEMPLATE_KEYS,
  buildEcheancierEtapes,
  validateEcheancier,
  computeEtapeMontants,
} from '../../lib/acompteUtils';
import { formatMoney as defaultFormatMoney } from '../../lib/formatters';
import supabase, { isDemo } from '../../supabaseClient';
import { cn } from '../../lib/utils';

/**
 * AcompteEcheancierModal — Modal for creating a multi-step payment schedule.
 *
 * Offers predefined templates (30/70, 50/50, 30/30/40) and custom mode.
 * Computes proportional TVA for each step.
 */
export default function AcompteEcheancierModal({
  isOpen,
  onClose,
  devis,
  isDark = false,
  couleur = '#f97316',
  modeDiscret = false,
  onEcheancierCreated,
}) {
  // Theme
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  const fm = (amount) => {
    if (modeDiscret) return '·····';
    return defaultFormatMoney(amount);
  };

  // State
  const [selectedTemplate, setSelectedTemplate] = useState('30-70');
  const [customEtapes, setCustomEtapes] = useState([
    { pourcentage: 30, label: 'Acompte à la commande' },
    { pourcentage: 70, label: 'Solde à la livraison' },
  ]);
  const [saving, setSaving] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate('30-70');
      setCustomEtapes([
        { pourcentage: 30, label: 'Acompte à la commande' },
        { pourcentage: 70, label: 'Solde à la livraison' },
      ]);
      setSaving(false);
    }
  }, [isOpen]);

  // Build preview étapes based on selection
  const previewEtapes = useMemo(() => {
    if (!devis) return [];
    if (selectedTemplate === 'custom') {
      return customEtapes.map((e, idx) => ({
        numero: idx + 1,
        label: e.label,
        pourcentage: e.pourcentage,
        ...computeEtapeMontants(devis, e.pourcentage),
      }));
    }
    return buildEcheancierEtapes(devis, selectedTemplate);
  }, [devis, selectedTemplate, customEtapes]);

  // Validation
  const sourceEtapes = selectedTemplate === 'custom' ? customEtapes : (ECHEANCIER_TEMPLATES[selectedTemplate]?.etapes || []);
  const validation = useMemo(() => validateEcheancier(sourceEtapes), [sourceEtapes]);
  const totalPct = sourceEtapes.reduce((s, e) => s + (e.pourcentage || 0), 0);

  // Legal warning for first step > 30%
  const firstStepOver30 = previewEtapes.length > 0 && previewEtapes[0]?.pourcentage > 30;
  const firstStepOver50 = previewEtapes.length > 0 && previewEtapes[0]?.pourcentage > 50;

  // Custom étape management
  const addCustomEtape = () => {
    if (customEtapes.length >= 10) return;
    const remaining = 100 - customEtapes.reduce((s, e) => s + (e.pourcentage || 0), 0);
    setCustomEtapes([...customEtapes, {
      pourcentage: Math.max(0, remaining),
      label: `Étape ${customEtapes.length + 1}`,
    }]);
  };

  const removeCustomEtape = (idx) => {
    if (customEtapes.length <= 2) return;
    setCustomEtapes(customEtapes.filter((_, i) => i !== idx));
  };

  const updateCustomEtape = (idx, field, value) => {
    setCustomEtapes(customEtapes.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  // Save
  const handleSave = async () => {
    if (!validation.valid || !devis) return;
    setSaving(true);

    try {
      const etapes = selectedTemplate === 'custom'
        ? buildEcheancierEtapes(devis, null, customEtapes)
        : buildEcheancierEtapes(devis, selectedTemplate);

      const echeancierData = {
        id: crypto.randomUUID(),
        devis_id: devis.id,
        template_key: selectedTemplate,
        etapes,
        statut: 'actif',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isDemo || !supabase) {
        // Demo mode: localStorage
        const stored = JSON.parse(localStorage.getItem('cp_echeanciers') || '{}');
        stored[devis.id] = echeancierData;
        localStorage.setItem('cp_echeanciers', JSON.stringify(stored));
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('acompte_echeanciers').insert({
          ...echeancierData,
          user_id: user.id,
        });
        if (error) throw error;
      }

      onEcheancierCreated?.(echeancierData);
      onClose();
    } catch (err) {
      console.error('Error saving echeancier:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !devis) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="echeancier-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            key="echeancier-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(cardBg, 'rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl')}
          >
            {/* Header */}
            <div className={cn('flex items-center justify-between p-5 border-b', borderColor)}>
              <div>
                <h3 className={cn('font-bold text-lg', textPrimary)}>
                  <ClipboardList size={18} className="inline mr-2" style={{ color: couleur }} />
                  Échéancier d'acomptes
                </h3>
                <p className={cn('text-sm mt-0.5', textMuted)}>
                  {devis.numero} · {fm(devis.total_ttc)} TTC
                </p>
              </div>
              <button
                onClick={onClose}
                className={cn('p-2 rounded-xl transition-colors', isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100')}
              >
                <X size={18} className={textMuted} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Template selector */}
              <div>
                <label className={cn('text-sm font-medium mb-2 block', textPrimary)}>Modèle</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TEMPLATE_KEYS.map(key => {
                    const tmpl = ECHEANCIER_TEMPLATES[key];
                    const isActive = selectedTemplate === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedTemplate(key)}
                        className={cn(
                          'p-3 rounded-xl border-2 text-left transition-all',
                          isActive
                            ? (isDark ? 'border-orange-500 bg-orange-900/20' : 'border-orange-500 bg-orange-50')
                            : (isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'),
                        )}
                      >
                        <span className={cn('font-medium text-sm block', textPrimary)}>{tmpl.label}</span>
                        <span className={cn('text-xs', textMuted)}>{tmpl.description}</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setSelectedTemplate('custom')}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      selectedTemplate === 'custom'
                        ? (isDark ? 'border-orange-500 bg-orange-900/20' : 'border-orange-500 bg-orange-50')
                        : (isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'),
                    )}
                  >
                    <span className={cn('font-medium text-sm block', textPrimary)}>Personnalisé</span>
                    <span className={cn('text-xs', textMuted)}>Définir manuellement</span>
                  </button>
                </div>
              </div>

              {/* Custom étapes editor */}
              {selectedTemplate === 'custom' && (
                <div className="space-y-2">
                  <label className={cn('text-sm font-medium', textPrimary)}>Étapes</label>
                  {customEtapes.map((etape, idx) => (
                    <div key={idx} className={cn('flex items-center gap-2 p-3 rounded-xl border', borderColor)}>
                      <GripVertical size={14} className={textMuted} />
                      <span className={cn('text-sm font-medium w-6', textMuted)}>
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={etape.label}
                        onChange={e => updateCustomEtape(idx, 'label', e.target.value)}
                        className={cn('flex-1 text-sm px-2 py-1.5 rounded-lg border', inputBg)}
                        placeholder="Libellé"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={etape.pourcentage}
                          onChange={e => updateCustomEtape(idx, 'pourcentage', parseInt(e.target.value) || 0)}
                          className={cn('w-16 text-sm px-2 py-1.5 rounded-lg border text-center', inputBg)}
                        />
                        <span className={cn('text-sm', textMuted)}>%</span>
                      </div>
                      <button
                        onClick={() => removeCustomEtape(idx)}
                        disabled={customEtapes.length <= 2}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          customEtapes.length <= 2 ? 'opacity-30 cursor-not-allowed' : (isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'),
                        )}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {customEtapes.length < 10 && (
                    <button
                      onClick={addCustomEtape}
                      className={cn(
                        'w-full py-2 rounded-xl border-2 border-dashed text-sm font-medium transition-colors',
                        isDark ? 'border-slate-600 text-slate-400 hover:border-slate-500' : 'border-slate-300 text-slate-500 hover:border-slate-400',
                      )}
                    >
                      <Plus size={14} className="inline mr-1" /> Ajouter une étape
                    </button>
                  )}
                  {/* Total percentage indicator */}
                  <div className={cn('text-sm text-right font-medium', totalPct === 100 ? 'text-emerald-500' : 'text-red-500')}>
                    Total : {totalPct}%{totalPct !== 100 && ' ≠ 100%'}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div>
                <label className={cn('text-sm font-medium mb-2 block', textPrimary)}>Aperçu</label>
                <div className={cn('rounded-xl border p-3 space-y-2', borderColor)}>
                  {previewEtapes.map((etape, idx) => (
                    <div key={idx} className={cn('flex items-center justify-between py-1.5', idx > 0 && `border-t ${borderColor}`)}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: couleur }}
                        >
                          {etape.numero}
                        </div>
                        <div>
                          <p className={cn('text-sm font-medium', textPrimary)}>{etape.label}</p>
                          <p className={cn('text-xs', textMuted)}>{etape.pourcentage}%</p>
                        </div>
                      </div>
                      <span className={cn('font-semibold text-sm', textPrimary)}>
                        {fm(etape.montant_ttc)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal warnings */}
              {firstStepOver50 && (
                <div className={cn('rounded-xl p-3 border flex items-start gap-2', isDark ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-800')}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <p className="text-xs">
                    <strong>Attention :</strong> un acompte de plus de 50% est très inhabituel et peut poser des problèmes juridiques.
                  </p>
                </div>
              )}
              {firstStepOver30 && !firstStepOver50 && (
                <div className={cn('rounded-xl p-3 border flex items-start gap-2', isDark ? 'bg-amber-900/20 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800')}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <p className="text-xs">
                    Pour travaux &gt; 1 500 € chez un particulier, l'acompte initial est limité à 30% (art. L. 214-1 code conso).
                  </p>
                </div>
              )}

              {/* Validation errors */}
              {!validation.valid && (
                <div className={cn('rounded-xl p-3 border', isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200')}>
                  {validation.errors.map((err, i) => (
                    <p key={i} className={cn('text-xs', isDark ? 'text-red-300' : 'text-red-700')}>• {err}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={cn('flex gap-3 p-5 border-t', borderColor)}>
              <button
                onClick={onClose}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors text-sm min-h-[44px]',
                  isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!validation.valid || saving}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-all text-sm min-h-[44px] flex items-center justify-center gap-2',
                  !validation.valid || saving ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg',
                )}
                style={{ backgroundColor: couleur }}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard size={16} />
                    Créer l'échéancier
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
