/**
 * SituationsTravaux - Progress Billing Component
 *
 * Tracks intermediate invoicing progress on construction projects.
 * Allows creating "situations de travaux" that record cumulative
 * completion percentages per devis line item, automatically computing
 * period amounts, TVA, retenue de garantie, and net payable.
 *
 * Data is persisted in localStorage keyed by chantier ID.
 * All data flows through props - no context imports.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Plus,
  Save,
  CheckCircle,
  FileText,
  ChevronLeft,
  Trash2,
  ClipboardList,
  Receipt,
  TrendingUp,
  Calendar,
  Hash,
  Euro
} from 'lucide-react';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** French-locale currency formatter */
const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

/** French-locale short date */
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/** localStorage key scoped to a chantier */
const storageKey = (chantierId) => `situations_travaux_${chantierId}`;

/** Read situations from localStorage */
const loadSituations = (chantierId) => {
  try {
    const raw = localStorage.getItem(storageKey(chantierId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** Write situations to localStorage */
const persistSituations = (chantierId, situations) => {
  localStorage.setItem(storageKey(chantierId), JSON.stringify(situations));
};

/** Status configuration: label, Tailwind classes for light/dark */
const STATUT_CONFIG = {
  brouillon: {
    label: 'Brouillon',
    light: 'bg-gray-100 text-gray-700',
    dark: 'bg-slate-700 text-slate-300'
  },
  validee: {
    label: 'Validée',
    light: 'bg-blue-100 text-blue-700',
    dark: 'bg-blue-900/40 text-blue-300'
  },
  facturee: {
    label: 'Facturée',
    light: 'bg-green-100 text-green-700',
    dark: 'bg-green-900/40 text-green-300'
  },
  payee: {
    label: 'Payée',
    light: 'bg-emerald-100 text-emerald-700',
    dark: 'bg-emerald-900/40 text-emerald-300'
  }
};

/** Default TVA rate used when devis lines don't specify one */
const DEFAULT_TVA_RATE = 10;

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SituationsTravaux({
  chantier,
  devis = [],
  isDark = false,
  couleur = '#f97316',
  onClose
}) {
  // ---- State ---------------------------------------------------------------

  const [situations, setSituations] = useState(() => loadSituations(chantier?.id));
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);

  // Editor state: the situation currently being created / modified
  const [draft, setDraft] = useState(null);
  const [retenueGarantie, setRetenueGarantie] = useState(false);
  const [acomptesDeduits, setAcomptesDeduits] = useState(0);

  // ---- Theme helpers -------------------------------------------------------

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const hoverBg = isDark ? 'hover:bg-slate-700/60' : 'hover:bg-slate-50';
  const containerBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  // ---- Derived data --------------------------------------------------------

  /** Flatten all lignes from devis linked to this chantier */
  const allLignes = useMemo(() => {
    const chantierDevis = devis.filter(
      (d) => d.chantier_id === chantier?.id && d.type === 'devis' && d.statut !== 'refuse'
    );
    return chantierDevis.flatMap((d) =>
      (d.lignes || []).map((l) => ({
        id: l.id || generateId('ligne'),
        description: l.description || 'Sans description',
        quantite: parseFloat(l.quantite) || 0,
        prixUnitaire: parseFloat(l.prixUnitaire) || parseFloat(l.prix_unitaire) || 0,
        unite: l.unite || '',
        tva: l.tva !== undefined ? l.tva : DEFAULT_TVA_RATE,
        total_ht: (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || parseFloat(l.prix_unitaire) || 0),
        devisNumero: d.numero
      }))
    );
  }, [devis, chantier?.id]);

  /** Currently selected situation (for read-only detail view) */
  const selectedSituation = useMemo(
    () => situations.find((s) => s.id === selectedId) || null,
    [situations, selectedId]
  );

  /** Next situation number */
  const nextNumero = situations.length + 1;

  // ---- Persistence wrapper -------------------------------------------------

  const saveSituations = useCallback(
    (next) => {
      setSituations(next);
      persistSituations(chantier?.id, next);
    },
    [chantier?.id]
  );

  // ---- Build a new draft situation -----------------------------------------

  const createNewDraft = useCallback(() => {
    // Determine previous cumul per line from the latest validated/facturee/payee situation
    const previousSituation = [...situations]
      .filter((s) => s.statut !== 'brouillon')
      .sort((a, b) => b.numero - a.numero)[0];

    const lignes = allLignes.map((l) => {
      const prev = previousSituation?.lignes?.find((pl) => pl.ligneId === l.id);
      return {
        ligneId: l.id,
        description: l.description,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        unite: l.unite,
        tva: l.tva,
        total_ht: l.total_ht,
        devisNumero: l.devisNumero,
        cumulPrecedent: prev ? prev.cumulActuel : 0, // percentage
        cumulActuel: prev ? prev.cumulActuel : 0      // start at previous level
      };
    });

    return {
      id: generateId('sit'),
      numero: nextNumero,
      date: new Date().toISOString().split('T')[0],
      statut: 'brouillon',
      lignes,
      created_at: new Date().toISOString()
    };
  }, [situations, allLignes, nextNumero]);

  // ---- Handlers ------------------------------------------------------------

  const handleNewSituation = useCallback(() => {
    const newDraft = createNewDraft();
    setDraft(newDraft);
    setRetenueGarantie(false);
    setAcomptesDeduits(0);
    setEditing(true);
    setSelectedId(null);
  }, [createNewDraft]);

  /** Update cumul % for a single line in the draft */
  const handleCumulChange = useCallback((ligneId, value) => {
    const clamped = Math.min(100, Math.max(0, parseFloat(value) || 0));
    setDraft((prev) => ({
      ...prev,
      lignes: prev.lignes.map((l) =>
        l.ligneId === ligneId ? { ...l, cumulActuel: clamped } : l
      )
    }));
  }, []);

  /** Save the current draft as brouillon */
  const handleSaveBrouillon = useCallback(() => {
    if (!draft) return;
    const exists = situations.find((s) => s.id === draft.id);
    const updated = exists
      ? situations.map((s) => (s.id === draft.id ? { ...draft, statut: 'brouillon' } : s))
      : [...situations, { ...draft, statut: 'brouillon' }];
    saveSituations(updated);
    setEditing(false);
    setDraft(null);
    setSelectedId(null);
  }, [draft, situations, saveSituations]);

  /** Validate the current draft */
  const handleValider = useCallback(() => {
    if (!draft) return;
    const validated = { ...draft, statut: 'validee', validated_at: new Date().toISOString() };
    const exists = situations.find((s) => s.id === draft.id);
    const updated = exists
      ? situations.map((s) => (s.id === draft.id ? validated : s))
      : [...situations, validated];
    saveSituations(updated);
    setEditing(false);
    setDraft(null);
    setSelectedId(validated.id);
  }, [draft, situations, saveSituations]);

  /** Mark an existing validated situation as "facturee" */
  const handleGenererFacture = useCallback(
    (sitId) => {
      const updated = situations.map((s) =>
        s.id === sitId ? { ...s, statut: 'facturee', facturee_at: new Date().toISOString() } : s
      );
      saveSituations(updated);
    },
    [situations, saveSituations]
  );

  /** Delete a brouillon situation */
  const handleDelete = useCallback(
    (sitId) => {
      const updated = situations.filter((s) => s.id !== sitId);
      saveSituations(updated);
      if (selectedId === sitId) setSelectedId(null);
      if (draft?.id === sitId) {
        setDraft(null);
        setEditing(false);
      }
    },
    [situations, saveSituations, selectedId, draft]
  );

  /** Open an existing brouillon for editing */
  const handleEditExisting = useCallback(
    (sit) => {
      setDraft({ ...sit });
      setEditing(true);
      setSelectedId(null);
    },
    []
  );

  // ---- Computed totals for the current draft (memoised) --------------------

  const draftTotals = useMemo(() => {
    if (!draft) return null;

    let montantCumulHT = 0;
    let montantPrecedentHT = 0;
    let totalTVA = 0;

    draft.lignes.forEach((l) => {
      const cumul = (l.cumulActuel / 100) * l.total_ht;
      const precedent = (l.cumulPrecedent / 100) * l.total_ht;
      montantCumulHT += cumul;
      montantPrecedentHT += precedent;
      // TVA on the period amount
      const periodAmount = cumul - precedent;
      totalTVA += periodAmount * (l.tva / 100);
    });

    const montantSituationHT = montantCumulHT - montantPrecedentHT;
    const montantSituationTTC = montantSituationHT + totalTVA;
    const retenue = retenueGarantie ? montantSituationTTC * 0.05 : 0;
    const netAPayer = montantSituationTTC - retenue - acomptesDeduits;

    return {
      montantCumulHT,
      montantPrecedentHT,
      montantSituationHT,
      totalTVA,
      montantSituationTTC,
      retenue,
      acomptesDeduits,
      netAPayer
    };
  }, [draft, retenueGarantie, acomptesDeduits]);

  // ---- Render helpers ------------------------------------------------------

  /** Status badge */
  const StatusBadge = ({ statut }) => {
    const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG.brouillon;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isDark ? cfg.dark : cfg.light
        }`}
      >
        {cfg.label}
      </span>
    );
  };

  // ---- Guard: no chantier --------------------------------------------------

  if (!chantier) return null;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className={`min-h-screen ${containerBg} p-4 md:p-6`}>
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className={`rounded-2xl border ${cardBg} p-5 mb-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${hoverBg} ${textSecondary}`}
                title="Retour"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h1 className={`text-xl font-bold ${textPrimary}`}>
                Situations de Travaux
              </h1>
              <p className={`text-sm ${textMuted}`}>
                {chantier.nom} &mdash; {situations.length} situation{situations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={handleNewSituation}
            disabled={allLignes.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold
                       transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: couleur }}
            title={allLignes.length === 0 ? 'Aucun devis lié au chantier' : ''}
          >
            <Plus size={18} />
            Nouvelle situation n°{nextNumero}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN LAYOUT: list + detail/editor side-by-side on desktop           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ---- SITUATIONS LIST (left panel) ---- */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <h2 className={`text-sm font-semibold ${textPrimary} flex items-center gap-2`}>
                <ClipboardList size={16} />
                Historique
              </h2>
            </div>

            {situations.length === 0 ? (
              <div className="p-6 text-center">
                <Receipt size={32} className={`mx-auto mb-2 ${textMuted}`} />
                <p className={`text-sm ${textMuted}`}>Aucune situation créée</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {[...situations].sort((a, b) => b.numero - a.numero).map((sit) => {
                  const isActive = selectedId === sit.id;
                  const montantHT = (sit.lignes || []).reduce((sum, l) => {
                    const cumul = (l.cumulActuel / 100) * l.total_ht;
                    const prec = (l.cumulPrecedent / 100) * l.total_ht;
                    return sum + (cumul - prec);
                  }, 0);

                  return (
                    <li
                      key={sit.id}
                      onClick={() => {
                        if (editing) return;
                        setSelectedId(isActive ? null : sit.id);
                      }}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        isActive
                          ? isDark
                            ? 'bg-slate-700/70'
                            : 'bg-slate-100'
                          : hoverBg
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${textPrimary}`}>
                          Situation n°{sit.numero}
                        </span>
                        <StatusBadge statut={sit.statut} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${textMuted} flex items-center gap-1`}>
                          <Calendar size={12} />
                          {formatDate(sit.date)}
                        </span>
                        <span className={`text-sm font-medium ${textPrimary}`}>
                          {formatCurrency(montantHT)}
                        </span>
                      </div>

                      {/* Quick actions */}
                      <div className="mt-2 flex gap-2">
                        {sit.statut === 'brouillon' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditExisting(sit);
                              }}
                              className={`text-xs px-2 py-1 rounded-lg ${
                                isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'
                              } hover:opacity-80 transition-opacity`}
                            >
                              Modifier
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(sit.id);
                              }}
                              className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                        {sit.statut === 'validee' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenererFacture(sit.id);
                            }}
                            className="text-xs px-2 py-1 rounded-lg text-white hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: couleur }}
                          >
                            Générer facture
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ---- DETAIL / EDITOR (main area) ---- */}
        <div className="flex-1 min-w-0">
          {/* Empty state when nothing selected and not editing */}
          {!editing && !selectedSituation && (
            <div className={`rounded-2xl border ${cardBg} p-12 text-center`}>
              <TrendingUp size={48} className={`mx-auto mb-4 ${textMuted}`} />
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
                Suivi d'avancement
              </h3>
              <p className={`text-sm ${textMuted} max-w-md mx-auto`}>
                Sélectionnez une situation dans l'historique ou créez-en une nouvelle
                pour commencer le suivi de facturation intermédiaire.
              </p>
            </div>
          )}

          {/* ---- READ-ONLY DETAIL VIEW ---- */}
          {!editing && selectedSituation && (
            <SituationDetail
              situation={selectedSituation}
              isDark={isDark}
              couleur={couleur}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
              StatusBadge={StatusBadge}
            />
          )}

          {/* ---- EDITOR VIEW ---- */}
          {editing && draft && (
            <>
              {/* Editor header */}
              <div className={`rounded-2xl border ${cardBg} p-5 mb-4`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className={`text-lg font-bold ${textPrimary}`}>
                      <Hash size={16} className="inline -mt-0.5 mr-1" />
                      Situation n°{draft.numero}
                    </h2>
                    <p className={`text-sm ${textMuted}`}>
                      {draft.lignes.length} ligne{draft.lignes.length !== 1 ? 's' : ''} de devis
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className={`text-sm ${textSecondary}`}>Date :</label>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
                      className={`text-sm rounded-lg border px-3 py-1.5 ${inputBg}`}
                    />
                  </div>
                </div>
              </div>

              {/* Line items table */}
              <div className={`rounded-2xl border ${cardBg} overflow-hidden mb-4`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                        <th className={`text-left px-4 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide`}>
                          Description
                        </th>
                        <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-24`}>
                          Qté totale
                        </th>
                        <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                          Cumul préc.
                        </th>
                        <th className={`text-center px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-44`}>
                          Cumul actuel (%)
                        </th>
                        <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                          Montant cumul
                        </th>
                        <th className={`text-right px-4 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                          Montant situation
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                      {draft.lignes.map((l) => {
                        const montantCumul = (l.cumulActuel / 100) * l.total_ht;
                        const montantPrec = (l.cumulPrecedent / 100) * l.total_ht;
                        const montantSituation = montantCumul - montantPrec;

                        return (
                          <tr key={l.ligneId} className={`${hoverBg} transition-colors`}>
                            {/* Description */}
                            <td className={`px-4 py-3 ${textPrimary}`}>
                              <div className="font-medium text-sm truncate max-w-xs" title={l.description}>
                                {l.description}
                              </div>
                              {l.devisNumero && (
                                <span className={`text-xs ${textMuted}`}>{l.devisNumero}</span>
                              )}
                            </td>

                            {/* Quantité totale */}
                            <td className={`text-right px-3 py-3 ${textSecondary} tabular-nums`}>
                              {l.quantite} {l.unite}
                            </td>

                            {/* Cumul précédent */}
                            <td className={`text-right px-3 py-3 ${textMuted} tabular-nums`}>
                              {l.cumulPrecedent.toFixed(0)}%
                            </td>

                            {/* Cumul actuel (editable) */}
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={l.cumulPrecedent}
                                  max={100}
                                  step={1}
                                  value={l.cumulActuel}
                                  onChange={(e) => handleCumulChange(l.ligneId, e.target.value)}
                                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                                  style={{
                                    accentColor: couleur,
                                    background: `linear-gradient(to right, ${couleur} 0%, ${couleur} ${
                                      ((l.cumulActuel - l.cumulPrecedent) / (100 - l.cumulPrecedent || 1)) * 100
                                    }%, ${isDark ? '#334155' : '#e2e8f0'} ${
                                      ((l.cumulActuel - l.cumulPrecedent) / (100 - l.cumulPrecedent || 1)) * 100
                                    }%, ${isDark ? '#334155' : '#e2e8f0'} 100%)`
                                  }}
                                />
                                <input
                                  type="number"
                                  min={l.cumulPrecedent}
                                  max={100}
                                  value={l.cumulActuel}
                                  onChange={(e) => handleCumulChange(l.ligneId, e.target.value)}
                                  className={`w-16 text-center text-sm rounded-lg border px-1 py-1 ${inputBg} tabular-nums`}
                                />
                              </div>
                              {/* Progress bar */}
                              <div
                                className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${
                                  isDark ? 'bg-slate-700' : 'bg-slate-200'
                                }`}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${l.cumulActuel}%`,
                                    backgroundColor: couleur
                                  }}
                                />
                              </div>
                            </td>

                            {/* Montant cumul */}
                            <td className={`text-right px-3 py-3 ${textSecondary} tabular-nums`}>
                              {formatCurrency(montantCumul)}
                            </td>

                            {/* Montant situation */}
                            <td className={`text-right px-4 py-3 font-semibold tabular-nums ${
                              montantSituation > 0 ? textPrimary : textMuted
                            }`}>
                              {formatCurrency(montantSituation)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {draft.lignes.length === 0 && (
                  <div className="p-8 text-center">
                    <FileText size={32} className={`mx-auto mb-2 ${textMuted}`} />
                    <p className={`text-sm ${textMuted}`}>
                      Aucune ligne de devis trouvée pour ce chantier.
                      Créez d'abord un devis lié au chantier.
                    </p>
                  </div>
                )}
              </div>

              {/* ---- SUMMARY CARD ---- */}
              {draftTotals && (
                <div className={`rounded-2xl border ${cardBg} p-5 mb-4`}>
                  <h3 className={`text-sm font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                    <Euro size={16} />
                    Récapitulatif
                  </h3>

                  <div className="space-y-2.5 text-sm">
                    {/* Montant cumul HT */}
                    <div className="flex justify-between">
                      <span className={textSecondary}>Montant cumul HT</span>
                      <span className={`${textPrimary} tabular-nums`}>
                        {formatCurrency(draftTotals.montantCumulHT)}
                      </span>
                    </div>

                    {/* Montant précédent HT */}
                    <div className="flex justify-between">
                      <span className={textSecondary}>Montant précédent HT</span>
                      <span className={`${textMuted} tabular-nums`}>
                        - {formatCurrency(draftTotals.montantPrecedentHT)}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />

                    {/* Montant situation HT */}
                    <div className="flex justify-between font-semibold">
                      <span className={textPrimary}>Montant situation HT</span>
                      <span className={textPrimary} style={{ color: couleur }}>
                        {formatCurrency(draftTotals.montantSituationHT)}
                      </span>
                    </div>

                    {/* TVA */}
                    <div className="flex justify-between">
                      <span className={textSecondary}>TVA</span>
                      <span className={`${textSecondary} tabular-nums`}>
                        {formatCurrency(draftTotals.totalTVA)}
                      </span>
                    </div>

                    {/* Montant situation TTC */}
                    <div className="flex justify-between font-medium">
                      <span className={textPrimary}>Montant situation TTC</span>
                      <span className={`${textPrimary} tabular-nums`}>
                        {formatCurrency(draftTotals.montantSituationTTC)}
                      </span>
                    </div>

                    {/* Retenue de garantie toggle */}
                    <div className={`border-t pt-2.5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <label className={`flex items-center gap-2 cursor-pointer ${textSecondary}`}>
                          <input
                            type="checkbox"
                            checked={retenueGarantie}
                            onChange={(e) => setRetenueGarantie(e.target.checked)}
                            className="rounded"
                            style={{ accentColor: couleur }}
                          />
                          Retenue de garantie (5%)
                        </label>
                        <span className={`${textMuted} tabular-nums`}>
                          {retenueGarantie ? `- ${formatCurrency(draftTotals.retenue)}` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Acomptes déjà versés */}
                    <div className="flex items-center justify-between">
                      <span className={textSecondary}>Acomptes déjà versés</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={acomptesDeduits || ''}
                        onChange={(e) => setAcomptesDeduits(parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className={`w-28 text-right text-sm rounded-lg border px-3 py-1.5 ${inputBg} tabular-nums`}
                      />
                    </div>

                    {/* Divider */}
                    <div className={`border-t-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />

                    {/* NET À PAYER */}
                    <div
                      className="flex justify-between items-center text-base font-bold py-1 px-3 -mx-3 rounded-xl"
                      style={{
                        backgroundColor: `${couleur}15`,
                        color: couleur
                      }}
                    >
                      <span>NET À PAYER</span>
                      <span className="tabular-nums">{formatCurrency(draftTotals.netAPayer)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- ACTION BUTTONS ---- */}
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraft(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    isDark
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <X size={16} />
                  Annuler
                </button>

                <button
                  onClick={handleSaveBrouillon}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isDark
                      ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <Save size={16} />
                  Enregistrer brouillon
                </button>

                <button
                  onClick={handleValider}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                             transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: couleur }}
                >
                  <CheckCircle size={16} />
                  Valider la situation
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: Read-only detail view for a past situation
// ============================================================================

function SituationDetail({
  situation,
  isDark,
  couleur,
  cardBg,
  textPrimary,
  textSecondary,
  textMuted,
  StatusBadge
}) {
  /** Compute totals for display */
  const totals = useMemo(() => {
    let montantCumulHT = 0;
    let montantPrecedentHT = 0;
    let totalTVA = 0;

    (situation.lignes || []).forEach((l) => {
      const cumul = (l.cumulActuel / 100) * l.total_ht;
      const precedent = (l.cumulPrecedent / 100) * l.total_ht;
      montantCumulHT += cumul;
      montantPrecedentHT += precedent;
      totalTVA += (cumul - precedent) * ((l.tva || DEFAULT_TVA_RATE) / 100);
    });

    const montantSituationHT = montantCumulHT - montantPrecedentHT;
    const montantSituationTTC = montantSituationHT + totalTVA;

    return { montantCumulHT, montantPrecedentHT, montantSituationHT, totalTVA, montantSituationTTC };
  }, [situation]);

  const hoverBg = isDark ? 'hover:bg-slate-700/60' : 'hover:bg-slate-50';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-2xl border ${cardBg} p-5`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className={`text-lg font-bold ${textPrimary} flex items-center gap-2`}>
              Situation n°{situation.numero}
              <StatusBadge statut={situation.statut} />
            </h2>
            <p className={`text-sm ${textMuted} mt-0.5`}>
              Créée le {formatDate(situation.created_at)} &mdash; Date de situation : {formatDate(situation.date)}
            </p>
          </div>
        </div>
      </div>

      {/* Lines table (read-only) */}
      <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                <th className={`text-left px-4 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide`}>
                  Description
                </th>
                <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                  Cumul préc.
                </th>
                <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                  Cumul actuel
                </th>
                <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                  Montant cumul
                </th>
                <th className={`text-right px-4 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                  Montant situation
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {(situation.lignes || []).map((l) => {
                const montantCumul = (l.cumulActuel / 100) * l.total_ht;
                const montantPrec = (l.cumulPrecedent / 100) * l.total_ht;
                const montantSituation = montantCumul - montantPrec;

                return (
                  <tr key={l.ligneId} className={`${hoverBg} transition-colors`}>
                    <td className={`px-4 py-3 ${textPrimary}`}>
                      <div className="font-medium text-sm">{l.description}</div>
                      {/* Visual progress bar */}
                      <div
                        className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-700' : 'bg-slate-200'
                        }`}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${l.cumulActuel}%`, backgroundColor: couleur }}
                        />
                      </div>
                    </td>
                    <td className={`text-right px-3 py-3 ${textMuted} tabular-nums`}>
                      {l.cumulPrecedent.toFixed(0)}%
                    </td>
                    <td className={`text-right px-3 py-3 tabular-nums font-medium`} style={{ color: couleur }}>
                      {l.cumulActuel.toFixed(0)}%
                    </td>
                    <td className={`text-right px-3 py-3 ${textSecondary} tabular-nums`}>
                      {formatCurrency(montantCumul)}
                    </td>
                    <td className={`text-right px-4 py-3 font-semibold ${textPrimary} tabular-nums`}>
                      {formatCurrency(montantSituation)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className={`rounded-2xl border ${cardBg} p-5`}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={textSecondary}>Montant situation HT</span>
            <span className={`font-semibold ${textPrimary} tabular-nums`}>
              {formatCurrency(totals.montantSituationHT)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={textSecondary}>TVA</span>
            <span className={`${textSecondary} tabular-nums`}>
              {formatCurrency(totals.totalTVA)}
            </span>
          </div>
          <div className={`border-t pt-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div
              className="flex justify-between font-bold text-base py-1 px-3 -mx-3 rounded-xl"
              style={{ backgroundColor: `${couleur}15`, color: couleur }}
            >
              <span>Montant situation TTC</span>
              <span className="tabular-nums">{formatCurrency(totals.montantSituationTTC)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
