import React, { useState, useMemo, useEffect } from 'react';
import { X, Receipt, AlertTriangle, Check, ChevronRight, ChevronLeft, FileText, Minus, Info, RotateCcw } from 'lucide-react';
import { AVOIR_MOTIFS } from '../DevisPage';

/**
 * AvoirCreationModal — Modale 2 étapes pour créer un avoir (note de crédit)
 *
 * Étape 1 : Choix du type (total/partiel) + motif + détail
 * Étape 2 : Sélection des lignes (si partiel) + ajustement quantités
 */
export default function AvoirCreationModal({
  isOpen,
  onClose,
  facture,
  devis = [],
  onCreateAvoir,
  isDark,
  couleur,
  modeDiscret,
  formatMoney: formatMoneyProp,
}) {
  // Theme
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Format money helper
  const fm = (amount) => {
    if (modeDiscret) return '·····';
    if (formatMoneyProp) return formatMoneyProp(amount);
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // State
  const [step, setStep] = useState(1);
  const [avoirType, setAvoirType] = useState('total'); // 'total' | 'partiel'
  const [motif, setMotif] = useState('');
  const [motifDetail, setMotifDetail] = useState('');
  const [selectedLines, setSelectedLines] = useState({}); // { lineIndex: { selected: bool, quantite: number } }

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setAvoirType('total');
      setMotif('');
      setMotifDetail('');
      setSelectedLines({});
    }
  }, [isOpen]);

  // Compute existing avoirs on this facture
  const existingAvoirs = useMemo(() =>
    devis.filter(d => d.facture_type === 'avoir' && d.avoir_source_id === facture?.id),
    [devis, facture?.id]
  );

  const totalExistingAvoirs = useMemo(() =>
    existingAvoirs.reduce((s, a) => s + Math.abs(a.total_ttc || 0), 0),
    [existingAvoirs]
  );

  const factureTTC = Math.abs(facture?.total_ttc || 0);
  const factureHT = Math.abs(facture?.total_ht || 0);
  const remaining = factureTTC - totalExistingAvoirs;
  const remainingPct = factureTTC > 0 ? (remaining / factureTTC) * 100 : 0;

  // Get all flat lines from facture (handle sections)
  const allLines = useMemo(() => {
    if (!facture) return [];
    if (facture.sections && facture.sections.length > 0) {
      return facture.sections.flatMap((section, si) =>
        (section.lignes || []).map((l, li) => ({
          ...l,
          _sectionName: section.nom,
          _sectionIndex: si,
          _lineIndex: `${si}-${li}`,
        }))
      );
    }
    return (facture.lignes || []).map((l, i) => ({
      ...l,
      _lineIndex: `${i}`,
    }));
  }, [facture]);

  // Calculate partial avoir totals
  const partialTotals = useMemo(() => {
    if (avoirType !== 'partiel') return { ht: 0, tva: 0, ttc: 0 };

    let ht = 0;
    let tva = 0;

    allLines.forEach((line, i) => {
      const sel = selectedLines[line._lineIndex];
      if (!sel?.selected) return;

      const qty = sel.quantite || 0;
      const pu = Math.abs(parseFloat(line.prixUnitaire || line.prix_unitaire || 0));
      const lineHT = qty * pu;
      const tvaRate = parseFloat(line.tva || line.tvaRate || facture?.tvaRate || 10) / 100;
      const lineTVA = lineHT * tvaRate;

      ht += lineHT;
      tva += lineTVA;
    });

    return { ht, tva, ttc: ht + tva };
  }, [avoirType, selectedLines, allLines, facture?.tvaRate]);

  // Total avoir amount (for validation)
  const avoirTTC = avoirType === 'total' ? remaining : partialTotals.ttc;
  const avoirHT = avoirType === 'total' ? (factureHT - existingAvoirs.reduce((s, a) => s + Math.abs(a.total_ht || 0), 0)) : partialTotals.ht;

  // Validation
  const canProceedStep1 = motif && (motif !== 'autre' || motifDetail.trim());
  const canProceedStep2 = avoirType === 'total' || (partialTotals.ttc > 0 && partialTotals.ttc <= remaining + 0.01);
  const exceedsRemaining = avoirType === 'partiel' && partialTotals.ttc > remaining + 0.01;

  // Toggle line selection
  const toggleLine = (lineIndex, maxQty) => {
    setSelectedLines(prev => {
      const current = prev[lineIndex];
      if (current?.selected) {
        const next = { ...prev };
        delete next[lineIndex];
        return next;
      }
      return { ...prev, [lineIndex]: { selected: true, quantite: maxQty } };
    });
  };

  // Update line quantity
  const updateLineQty = (lineIndex, qty, maxQty) => {
    const clampedQty = Math.max(0.01, Math.min(qty, maxQty));
    setSelectedLines(prev => ({
      ...prev,
      [lineIndex]: { selected: true, quantite: clampedQty },
    }));
  };

  // Submit
  const handleSubmit = () => {
    if (!canProceedStep1 || (step === 2 && !canProceedStep2)) return;

    let lignes;
    let totalHT, totalTVA, totalTTC;

    if (avoirType === 'total') {
      // Copy all lines with negated amounts
      lignes = allLines.map(l => ({
        ...l,
        prixUnitaire: -(Math.abs(parseFloat(l.prixUnitaire || l.prix_unitaire || 0))),
        montant: -(Math.abs(parseFloat(l.montant || (parseFloat(l.quantite || 0) * parseFloat(l.prixUnitaire || l.prix_unitaire || 0))))),
      }));
      totalHT = -(Math.abs(factureHT - existingAvoirs.reduce((s, a) => s + Math.abs(a.total_ht || 0), 0)));
      totalTVA = -(Math.abs((factureTTC - factureHT) - existingAvoirs.reduce((s, a) => s + Math.abs((a.total_ttc || 0) - (a.total_ht || 0)), 0)));
      totalTTC = -(Math.abs(remaining));
    } else {
      // Build partial lines
      lignes = [];
      allLines.forEach(l => {
        const sel = selectedLines[l._lineIndex];
        if (!sel?.selected) return;
        const pu = Math.abs(parseFloat(l.prixUnitaire || l.prix_unitaire || 0));
        lignes.push({
          ...l,
          quantite: sel.quantite,
          prixUnitaire: -pu,
          montant: -(sel.quantite * pu),
        });
      });
      totalHT = -partialTotals.ht;
      totalTVA = -partialTotals.tva;
      totalTTC = -partialTotals.ttc;
    }

    onCreateAvoir({
      sourceFacture: facture,
      type: avoirType,
      motif,
      motifDetail,
      lignes,
      totalHT: Math.abs(totalHT),
      totalTVA: Math.abs(totalTVA),
      totalTTC: Math.abs(totalTTC),
    });
  };

  if (!isOpen || !facture) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full sm:max-w-lg max-h-[95vh] sm:max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl ${cardBg}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-100">
              <RotateCcw size={18} className="text-red-600" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>Créer un avoir</h2>
              <p className={`text-xs ${textMuted}`}>
                {step === 1 ? 'Type et motif' : 'Sélection des lignes'}
                {' '} — {facture.numero}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <X size={20} className={textMuted} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 py-3 flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${step === 1 ? 'text-white' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`} style={step === 1 ? { background: couleur } : {}}>
            <span>1</span> Type & Motif
          </div>
          <ChevronRight size={14} className={textMuted} />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${step === 2 ? 'text-white' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`} style={step === 2 ? { background: couleur } : {}}>
            <span>2</span> {avoirType === 'total' ? 'Confirmation' : 'Lignes'}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Remaining alert */}
          {remaining < factureTTC && remaining > 0 && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-800'}`}>
              <Info size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                Des avoirs existent déjà ({fm(totalExistingAvoirs)}).
                <br />Montant restant disponible : <strong>{fm(remaining)}</strong> ({remainingPct.toFixed(0)}%)
              </div>
            </div>
          )}
          {remaining <= 0 && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <div>Cette facture est déjà intégralement couverte par des avoirs.</div>
            </div>
          )}

          {/* ======== STEP 1 ======== */}
          {step === 1 && remaining > 0 && (
            <>
              {/* Facture source summary */}
              <div className={`p-4 rounded-xl border ${borderColor} ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${textPrimary}`}>Facture source</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                    {facture.numero}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textMuted}`}>{facture.client_nom || 'Client'}</span>
                  <span className={`text-base font-bold ${textPrimary}`}>{fm(factureTTC)}</span>
                </div>
              </div>

              {/* Type selection */}
              <div>
                <label className={`text-sm font-medium ${textPrimary} mb-2 block`}>Type d'avoir</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'total', label: 'Avoir total', desc: 'Annule l\'intégralité', icon: Receipt },
                    { value: 'partiel', label: 'Avoir partiel', desc: 'Sélection de lignes', icon: FileText },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const isSelected = avoirType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setAvoirType(opt.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-red-500 shadow-md'
                            : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={isSelected ? { borderColor: '#ef4444', background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)' } : {}}
                      >
                        <Icon size={20} className={isSelected ? 'text-red-500 mb-2' : `${textMuted} mb-2`} />
                        <p className={`text-sm font-semibold ${textPrimary}`}>{opt.label}</p>
                        <p className={`text-xs mt-0.5 ${textMuted}`}>{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Motif */}
              <div>
                <label className={`text-sm font-medium ${textPrimary} mb-2 block`}>
                  Motif <span className="text-red-500">*</span>
                </label>
                <select
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
                >
                  <option value="">Sélectionner un motif...</option>
                  {Object.entries(AVOIR_MOTIFS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Motif detail */}
              <div>
                <label className={`text-sm font-medium ${textPrimary} mb-2 block`}>
                  Détail {motif === 'autre' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={motifDetail}
                  onChange={e => setMotifDetail(e.target.value)}
                  placeholder="Précisions sur le motif de l'avoir..."
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm resize-none ${inputBg}`}
                />
              </div>

              {/* Amount preview */}
              {avoirType === 'total' && (
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Montant de l'avoir</span>
                    <span className="text-lg font-bold text-red-600">-{fm(remaining)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ======== STEP 2 ======== */}
          {step === 2 && (
            <>
              {avoirType === 'total' ? (
                /* Total confirmation */
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                    <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                      Récapitulatif — Avoir total
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={textMuted}>Facture source</span>
                        <span className={textPrimary}>{facture.numero}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={textMuted}>Motif</span>
                        <span className={textPrimary}>{AVOIR_MOTIFS[motif] || motif}</span>
                      </div>
                      {motifDetail && (
                        <div className="flex justify-between text-sm">
                          <span className={textMuted}>Détail</span>
                          <span className={`${textPrimary} text-right max-w-[60%]`}>{motifDetail}</span>
                        </div>
                      )}
                      <div className={`pt-2 mt-2 border-t ${borderColor}`}>
                        <div className="flex justify-between text-sm">
                          <span className={textMuted}>Total HT</span>
                          <span className="font-semibold text-red-600">-{fm(Math.abs(avoirHT))}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={textMuted}>TVA</span>
                          <span className="font-semibold text-red-600">-{fm(Math.abs(remaining - Math.abs(avoirHT)))}</span>
                        </div>
                        <div className="flex justify-between text-base mt-1">
                          <span className={`font-bold ${textPrimary}`}>Total TTC</span>
                          <span className="font-bold text-red-600">-{fm(remaining)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                    L'avoir sera créé en brouillon. Vous pourrez le vérifier et l'émettre ensuite.
                  </div>
                </div>
              ) : (
                /* Partial — Line selection */
                <div className="space-y-4">
                  <p className={`text-sm ${textMuted}`}>
                    Sélectionnez les lignes à inclure dans l'avoir et ajustez les quantités si nécessaire.
                  </p>

                  {/* Lines list */}
                  <div className={`rounded-xl border divide-y ${borderColor} overflow-hidden`}>
                    {allLines.map((line, i) => {
                      const lineKey = line._lineIndex;
                      const sel = selectedLines[lineKey];
                      const isSelected = sel?.selected;
                      const maxQty = parseFloat(line.quantite || 1);
                      const pu = Math.abs(parseFloat(line.prixUnitaire || line.prix_unitaire || 0));
                      const lineTotal = isSelected ? (sel.quantite || 0) * pu : 0;

                      return (
                        <div
                          key={lineKey}
                          className={`p-3 transition-colors ${
                            isSelected
                              ? isDark ? 'bg-red-900/10' : 'bg-red-50/50'
                              : isDark ? 'bg-slate-800' : 'bg-white'
                          }`}
                        >
                          {/* Section header */}
                          {line._sectionName && i === 0 || (i > 0 && allLines[i - 1]?._sectionIndex !== line._sectionIndex) ? (
                            <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${textMuted}`}>{line._sectionName}</p>
                          ) : null}

                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleLine(lineKey, maxQty)}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                isSelected
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : isDark ? 'border-slate-500' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check size={12} />}
                            </button>

                            {/* Line info */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${textPrimary}`}>
                                {line.description || 'Ligne sans description'}
                              </p>
                              <p className={`text-xs ${textMuted}`}>
                                {maxQty} {line.unite || 'u'} × {fm(pu)} HT
                              </p>
                            </div>

                            {/* Quantity adjuster (if selected) */}
                            {isSelected && (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0.01}
                                  max={maxQty}
                                  step={0.01}
                                  value={sel.quantite}
                                  onChange={e => updateLineQty(lineKey, parseFloat(e.target.value) || 0, maxQty)}
                                  className={`w-16 text-center text-sm px-2 py-1 rounded-lg border ${inputBg}`}
                                />
                                <span className={`text-xs ${textMuted}`}>/ {maxQty}</span>
                              </div>
                            )}

                            {/* Line total */}
                            <span className={`text-sm font-semibold whitespace-nowrap ${isSelected ? 'text-red-600' : textMuted}`}>
                              {isSelected ? `-${fm(lineTotal)}` : fm(maxQty * pu)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Partial totals */}
                  <div className={`p-4 rounded-xl border ${exceedsRemaining ? (isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-300') : (isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200')}`}>
                    {exceedsRemaining && (
                      <div className="flex items-center gap-2 text-sm text-red-600 mb-3">
                        <AlertTriangle size={14} />
                        Le montant dépasse le restant disponible ({fm(remaining)})
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className={textMuted}>Total HT</span>
                        <span className={`font-semibold ${partialTotals.ht > 0 ? 'text-red-600' : textMuted}`}>
                          {partialTotals.ht > 0 ? `-${fm(partialTotals.ht)}` : '0,00 €'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={textMuted}>TVA</span>
                        <span className={`font-semibold ${partialTotals.tva > 0 ? 'text-red-600' : textMuted}`}>
                          {partialTotals.tva > 0 ? `-${fm(partialTotals.tva)}` : '0,00 €'}
                        </span>
                      </div>
                      <div className={`flex justify-between text-base pt-1.5 border-t ${borderColor}`}>
                        <span className={`font-bold ${textPrimary}`}>Total TTC</span>
                        <span className={`font-bold ${partialTotals.ttc > 0 ? 'text-red-600' : textMuted}`}>
                          {partialTotals.ttc > 0 ? `-${fm(partialTotals.ttc)}` : '0,00 €'}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {partialTotals.ttc > 0 && !exceedsRemaining && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={textMuted}>Couverture</span>
                          <span className={textMuted}>{((partialTotals.ttc / factureTTC) * 100).toFixed(1)}%</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                          <div
                            className="h-full rounded-full transition-all bg-red-500"
                            style={{ width: `${Math.min(100, (partialTotals.ttc / factureTTC) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          {remaining > 0 && (
            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 min-h-[48px] ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  <ChevronLeft size={16} /> Retour
                </button>
              )}

              {step === 1 ? (
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 min-h-[48px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: canProceedStep1 ? '#ef4444' : '#94a3b8' }}
                >
                  Suivant <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceedStep2}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 min-h-[48px] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                  style={{ background: canProceedStep2 ? '#ef4444' : '#94a3b8' }}
                >
                  <RotateCcw size={16} /> Créer l'avoir
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
