import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, CreditCard, ClipboardList, GripVertical } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';
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
  couleur,
  modeDiscret = false,
  onEcheancierCreated,
}) {
  // Theme
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const inputBg = 'bg-surface border-bord-fort text-encre';
  const borderColor = 'border-bord';

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
  const premierAuDelaDuDevis = previewEtapes.length > 0 && Number(devis?.acompte_pct) > 0
    && previewEtapes[0]?.pourcentage > Number(devis.acompte_pct);

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

  // Fenêtre : ui/Modal (rôle dialog, nom, Échap, feuille du bas au téléphone, pied collé) ; jetons du thème
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" closeOnBackdrop={!saving} closeOnEscape={!saving}>
      <ModalHeader>
        <ModalTitle>
          <ClipboardList size={18} className="inline mr-2 text-encre-3" aria-hidden="true" />
          Échéancier d'acomptes
        </ModalTitle>
        <ModalDescription>{devis.numero} · {fm(devis.total_ttc)} TTC</ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {/* Modèle */}
        <fieldset>
          <legend className={cn('text-sm font-medium mb-2 block', textPrimary)}>Modèle</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Modèle d'échéancier">
            {[...TEMPLATE_KEYS.map(key => ({ key, label: ECHEANCIER_TEMPLATES[key].label, description: ECHEANCIER_TEMPLATES[key].description })),
              { key: 'custom', label: 'Personnalisé', description: 'Définir manuellement' }].map(({ key, label, description }) => {
              const isActive = selectedTemplate === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSelectedTemplate(key)}
                  className={cn('p-3 rounded-xl border-2 text-left transition-colors', isActive ? 'border-accent bg-accent/10' : 'border-bord hover:border-bord-fort')}
                >
                  <span className={cn('font-medium text-sm block', textPrimary)}>{label}</span>
                  <span className={cn('text-xs', textMuted)}>{description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Étapes personnalisées */}
        {selectedTemplate === 'custom' && (
          <div className="space-y-2">
            <p className={cn('text-sm font-medium', textPrimary)}>Étapes</p>
            {customEtapes.map((etape, idx) => (
              <div key={idx} className={cn('flex items-center gap-2 p-2.5 rounded-xl border', borderColor)}>
                <GripVertical size={14} className={textMuted} aria-hidden="true" />
                <span className={cn('text-sm font-medium w-6', textMuted)}>{idx + 1}.</span>
                <input
                  type="text"
                  value={etape.label}
                  onChange={e => updateCustomEtape(idx, 'label', e.target.value)}
                  aria-label={`Libellé de l'étape ${idx + 1}`}
                  className={cn('flex-1 min-w-0 text-base sm:text-sm px-2.5 h-11 rounded-lg border', inputBg)}
                  placeholder="Libellé"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={etape.pourcentage}
                    onChange={e => updateCustomEtape(idx, 'pourcentage', parseInt(e.target.value) || 0)}
                    aria-label={`Pourcentage de l'étape ${idx + 1}`}
                    className={cn('w-16 text-base sm:text-sm px-2 h-11 rounded-lg border text-center', inputBg)}
                  />
                  <span className={cn('text-sm', textMuted)}>%</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomEtape(idx)}
                  disabled={customEtapes.length <= 2}
                  aria-label={`Supprimer l'étape ${idx + 1}`}
                  className="w-11 h-11 flex items-center justify-center rounded-lg transition-colors text-danger-texte hover:bg-danger-fond disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {customEtapes.length < 10 && (
              <button
                type="button"
                onClick={addCustomEtape}
                className="w-full min-h-[44px] rounded-xl border-2 border-dashed text-sm font-medium transition-colors border-bord-fort text-encre-2 hover:text-encre"
              >
                <Plus size={14} className="inline mr-1" aria-hidden="true" /> Ajouter une étape
              </button>
            )}
            <p className={cn('text-sm text-right font-medium', totalPct === 100 ? 'text-succes-texte' : 'text-danger-texte')}>
              Total : {totalPct} %{totalPct !== 100 && ' ≠ 100 %'}
            </p>
          </div>
        )}

        {/* Aperçu */}
        <div>
          <p className={cn('text-sm font-medium mb-2', textPrimary)}>Aperçu</p>
          <ol className={cn('rounded-xl border px-3 py-1', borderColor)}>
            {previewEtapes.map((etape, idx) => (
              <li key={idx} className={cn('flex items-center justify-between py-2', idx > 0 && `border-t ${borderColor}`)}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-surface-2 text-encre-2" aria-hidden="true">
                    {etape.numero}
                  </span>
                  <div>
                    <p className={cn('text-sm font-medium', textPrimary)}>{etape.label}</p>
                    <p className={cn('text-xs', textMuted)}>{etape.pourcentage} %</p>
                  </div>
                </div>
                <span className={cn('font-semibold text-sm tabular-nums', textPrimary)}>{fm(etape.montant_ttc)}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Il n'y a pas de plafond légal d'acompte pour des travaux (relecture juridique du 10 oct. 2026 :
            l'ancien « limité à 30 %, art. L. 214-1 » était faux). Le devis signé fait foi (C. civ. art. 1103). */}
        {premierAuDelaDuDevis && (
          <div className="rounded-xl p-3 flex items-start gap-2 bg-alerte-fond text-alerte-texte">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm">
              Le devis signé prévoit un acompte de {devis.acompte_pct} % : en facturer davantage demande l'accord du client.
            </p>
          </div>
        )}

        {!validation.valid && (
          <div role="alert" className="rounded-xl p-3 bg-danger-fond text-danger-texte">
            {validation.errors.map((err, i) => (
              <p key={i} className="text-sm">• {err}</p>
            ))}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Bouton variante="discret" onClick={onClose}>Annuler</Bouton>
        <Bouton variante="principal" icone={CreditCard} onClick={handleSave} disabled={!validation.valid} chargement={saving}>
          Créer l'échéancier
        </Bouton>
      </ModalFooter>
    </Modal>
  );
}
