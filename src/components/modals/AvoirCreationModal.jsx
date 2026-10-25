import { useState, useMemo, useEffect } from 'react';
import { Receipt, AlertTriangle, Check, ChevronRight, ChevronLeft, FileText, Info, RotateCcw } from 'lucide-react';
import { AVOIR_MOTIFS } from '../DevisPage';
import { avoirTotal, avoirPartiel } from '../../lib/avoir';
import { totalLigne } from '../../lib/totauxDocument';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';

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
  isDark: _isDark,
  couleur: _couleur,
  modeDiscret,
  formatMoney: formatMoneyProp,
}) {
  // Theme
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const inputBg = 'bg-surface border-bord-fort';
  const borderColor = 'border-bord';

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
  const selection = useMemo(() => allLines
    .filter(l => selectedLines[l._lineIndex]?.selected)
    .map(l => ({ ligne: l, quantite: selectedLines[l._lineIndex].quantite || 0 })), [allLines, selectedLines]);
  const partiel = useMemo(() => (avoirType === 'partiel' ? avoirPartiel(facture, selection) : null), [avoirType, facture, selection]);
  const partialTotals = partiel
    ? { ht: -partiel.totalHT, tva: -partiel.totalTVA, ttc: -partiel.totalTTC }
    : { ht: 0, tva: 0, ttc: 0 };
  // Un avoir total sur une facture déjà partiellement créditée recréditerait ce qui l'a déjà été
  const totalPossible = existingAvoirs.length === 0;
  useEffect(() => {
    if (!totalPossible && avoirType === 'total') setAvoirType('partiel');
  }, [totalPossible, avoirType]);

  // Total avoir amount (for validation)
  const avoirHT = avoirType === 'total' ? (factureHT - existingAvoirs.reduce((s, a) => s + Math.abs(a.total_ht || 0), 0)) : partialTotals.ht;

  // Validation
  const canProceedStep1 = motif && (motif !== 'autre' || motifDetail.trim());
  const canProceedStep2 = (avoirType === 'total' && totalPossible) || (avoirType === 'partiel' && partialTotals.ttc > 0 && partialTotals.ttc <= remaining + 0.01);
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

    // Lignes et totaux de src/lib/avoir.js : avoir total = inverse exact de la facture ; avoir partiel = lignes
    // choisies au prix facturé, remise de la facture en ligne visible, totaux arrondis par taux.
    if (avoirType === 'total' && !totalPossible) return;
    const calcul = avoirType === 'total' ? avoirTotal(facture) : avoirPartiel(facture, selection);
    const lignes = calcul.lignes.map(({ _lineIndex, _sectionIndex, _sectionName, ...l }) => l);
    const { totalHT, totalTVA, totalTTC, tvaParTaux } = calcul;

    onCreateAvoir({
      sourceFacture: facture,
      type: avoirType,
      motif,
      motifDetail,
      lignes,
      tvaParTaux,
      totalHT: Math.abs(totalHT),
      totalTVA: Math.abs(totalTVA),
      totalTTC: Math.abs(totalTTC),
    });
  };

  if (!isOpen || !facture) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Créer un avoir</ModalTitle>
        <ModalDescription>{step === 1 ? 'Type et motif' : 'Sélection des lignes'} — {facture.numero}</ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Étapes : celle en cours en encre (l'accent reste à l'action) */}
        <ol className="flex items-center gap-2" aria-label="Étapes">
          <li aria-current={step === 1 ? 'step' : undefined} className={`flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold ${step === 1 ? 'bg-encre text-surface' : 'bg-surface-2 text-encre-3'}`}>
            <span>1</span> Type & Motif
          </li>
          <ChevronRight size={14} className={textMuted} aria-hidden="true" />
          <li aria-current={step === 2 ? 'step' : undefined} className={`flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold ${step === 2 ? 'bg-encre text-surface' : 'bg-surface-2 text-encre-3'}`}>
            <span>2</span> {avoirType === 'total' ? 'Confirmation' : 'Lignes'}
          </li>
        </ol>

          {/* Remaining alert */}
          {remaining < factureTTC && remaining > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-alerte-fond text-alerte-texte">
              <Info size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                Des avoirs existent déjà ({fm(totalExistingAvoirs)}).
                <br />Montant restant disponible : <strong>{fm(remaining)}</strong> ({remainingPct.toFixed(0)}%)
              </div>
            </div>
          )}
          {remaining <= 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-danger-fond text-danger-texte">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <div>Cette facture est déjà intégralement couverte par des avoirs.</div>
            </div>
          )}

          {/* ======== STEP 1 ======== */}
          {step === 1 && remaining > 0 && (
            <>
              {/* Facture source summary */}
              <div className={`p-4 rounded-xl border ${borderColor} bg-fond`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${textPrimary}`}>Facture source</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-surface-2 text-encre-2">
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
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setAvoirType(opt.value)}
                        disabled={opt.value === 'total' && !totalPossible}
                        title={opt.value === 'total' && !totalPossible ? 'Un avoir existe déjà sur cette facture : choisissez les lignes à créditer' : undefined}
                        className={`p-4 rounded-xl border-2 text-left transition-colors disabled:opacity-40 ${
                          isSelected
                            ? 'border-accent bg-accent/10'
                            : 'border-bord hover:border-bord-fort'
                        }`}
                      >
                        <Icon size={20} className={isSelected ? 'text-encre mb-2' : `${textMuted} mb-2`} aria-hidden="true" />
                        <p className={`text-sm font-semibold ${textPrimary}`}>{opt.label}</p>
                        <p className={`text-xs mt-0.5 ${textMuted}`}>{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Motif */}
              <div>
                <label htmlFor="avoir-motif" className={`text-sm font-medium ${textPrimary} mb-2 block`}>
                  Motif
                </label>
                <select
                  id="avoir-motif"
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  className={`w-full px-4 h-12 rounded-xl border text-base sm:text-sm ${inputBg}`}
                >
                  <option value="">Sélectionner un motif...</option>
                  {Object.entries(AVOIR_MOTIFS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Motif detail */}
              <div>
                <label htmlFor="avoir-detail" className={`text-sm font-medium ${textPrimary} mb-2 block`}>
                  Détail {motif === 'autre' ? null : <span className="font-normal text-encre-3">(facultatif)</span>}
                </label>
                <textarea
                  id="avoir-detail"
                  value={motifDetail}
                  onChange={e => setMotifDetail(e.target.value)}
                  placeholder="Précisions sur le motif de l'avoir..."
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-xl border text-base sm:text-sm resize-none ${inputBg}`}
                />
              </div>

              {/* Amount preview */}
              {avoirType === 'total' && (
                <div className="p-4 rounded-xl border bg-fond border-bord">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-encre-2">Montant de l'avoir</span>
                    <span className="text-lg font-bold tabular-nums text-danger-texte">-{fm(remaining)}</span>
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
                  <div className="p-4 rounded-xl border bg-fond border-bord">
                    <h3 className="text-sm font-semibold mb-3 text-encre">
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
                          <span className="font-semibold tabular-nums text-danger-texte">-{fm(Math.abs(avoirHT))}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={textMuted}>TVA</span>
                          <span className="font-semibold tabular-nums text-danger-texte">-{fm(Math.abs(remaining - Math.abs(avoirHT)))}</span>
                        </div>
                        <div className="flex justify-between text-base mt-1">
                          <span className={`font-bold ${textPrimary}`}>Total TTC</span>
                          <span className="font-bold tabular-nums text-danger-texte">-{fm(remaining)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-fond text-encre-3">
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
                      // Remise ou acompte déduit : pris en compte automatiquement, pas une ligne à créditer
                      const creditable = totalLigne(line) > 0;

                      return (
                        <div
                          key={lineKey}
                          className={`p-3 transition-colors ${
                            isSelected
                              ? 'bg-accent/5'
                              : 'bg-surface'
                          }`}
                        >
                          {/* Section header */}
                          {line._sectionName && i === 0 || (i > 0 && allLines[i - 1]?._sectionIndex !== line._sectionIndex) ? (
                            <p className={`text-xs font-semibold mb-2 ${textMuted}`}>{line._sectionName}</p>
                          ) : null}

                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <button
                              onClick={() => creditable && toggleLine(lineKey, maxQty)}
                              disabled={!creditable}
                              aria-label={creditable ? `Créditer « ${line.description || 'la ligne'} »` : 'Remise ou déduction : prise en compte automatiquement'}
                              role="checkbox"
                              aria-checked={!!isSelected}
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors disabled:opacity-30 ${
                                isSelected
                                  ? 'bg-accent border-accent text-sur-accent'
                                  : 'border-bord-fort'
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
                            <span className={`text-sm font-semibold whitespace-nowrap tabular-nums ${isSelected ? 'text-danger-texte' : textMuted}`}>
                              {isSelected ? `-${fm(lineTotal)}` : fm(maxQty * pu)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Partial totals */}
                  <div className={`p-4 rounded-xl border ${exceedsRemaining ? 'bg-danger-fond border-danger-point/40' : 'bg-fond border-bord'}`}>
                    {exceedsRemaining && (
                      <div role="alert" className="flex items-center gap-2 text-sm text-danger-texte mb-3">
                        <AlertTriangle size={14} />
                        Le montant dépasse le restant disponible ({fm(remaining)})
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className={textMuted}>Total HT</span>
                        <span className={`font-semibold tabular-nums ${partialTotals.ht > 0 ? 'text-danger-texte' : textMuted}`}>
                          {partialTotals.ht > 0 ? `-${fm(partialTotals.ht)}` : '0,00 €'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={textMuted}>TVA</span>
                        <span className={`font-semibold tabular-nums ${partialTotals.tva > 0 ? 'text-danger-texte' : textMuted}`}>
                          {partialTotals.tva > 0 ? `-${fm(partialTotals.tva)}` : '0,00 €'}
                        </span>
                      </div>
                      <div className={`flex justify-between text-base pt-1.5 border-t ${borderColor}`}>
                        <span className={`font-bold ${textPrimary}`}>Total TTC</span>
                        <span className={`font-bold tabular-nums ${partialTotals.ttc > 0 ? 'text-danger-texte' : textMuted}`}>
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
                        <div className="h-2 rounded-full overflow-hidden bg-surface-2">
                          <div
                            className="h-full rounded-full transition-all bg-accent"
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

      </ModalBody>

      {remaining > 0 && (
        <ModalFooter>
          {step === 2 ? (
            <Bouton variante="discret" icone={ChevronLeft} onClick={() => setStep(1)}>Retour</Bouton>
          ) : (
            <Bouton variante="discret" onClick={onClose}>Annuler</Bouton>
          )}
          {step === 1 ? (
            <Bouton variante="principal" iconeFin={ChevronRight} onClick={() => setStep(2)} disabled={!canProceedStep1}>Suivant</Bouton>
          ) : (
            <Bouton variante="principal" icone={RotateCcw} onClick={handleSubmit} disabled={!canProceedStep2}>Créer l'avoir</Bouton>
          )}
        </ModalFooter>
      )}
    </Modal>
  );
}
