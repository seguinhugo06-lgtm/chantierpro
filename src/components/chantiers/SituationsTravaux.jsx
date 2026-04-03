/**
 * SituationsTravaux - Progress Billing Component (v2)
 *
 * Tracks intermediate invoicing progress on construction projects.
 * Creates "situations de travaux" recording cumulative completion %
 * per devis line item, computing period amounts, TVA, retenue de garantie.
 *
 * Data persisted in chantier.situations_data (JSONB) via updateChantier.
 * Factures generated as standard devis entries via addDevis.
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
  Euro,
  Printer,
  BarChart3,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { generateId } from '../../lib/utils';
import { formatMoney } from '../../lib/formatters';
import {
  calculateSituationTotals,
  calculateGlobalAvancement,
  initSituationLignes,
  validateAvancement,
  getCumulativeInvoiced,
  createSituationsData,
  SITUATION_STATUS,
  SITUATION_STATUS_LABELS,
  SITUATION_STATUS_COLORS,
  DEFAULT_RETENUE_GARANTIE_PCT,
  DEFAULT_TVA_RATE,
} from '../../lib/situationUtils';
import { printSituationFacture } from '../../lib/devisHtmlBuilder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SituationsTravaux({
  chantier,
  devis = [],
  updateChantier,
  addDevis,
  generateNextNumero,
  clients,
  entreprise,
  modeDiscret = false,
  isDark = false,
  couleur = '#f97316',
  setPage,
  onClose,
}) {
  // ---- Data from chantier.situations_data ---------------------------------

  const situationsData = chantier?.situations_data || null;
  const situations = situationsData?.situations || [];
  const retenuePct = situationsData?.retenue_garantie_pct ?? DEFAULT_RETENUE_GARANTIE_PCT;
  const devisSourceId = situationsData?.devis_source_id || null;

  // ---- State --------------------------------------------------------------

  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [isDGD, setIsDGD] = useState(false);
  const [showDevisSelector, setShowDevisSelector] = useState(false);
  const [retenuePctLocal, setRetenuePctLocal] = useState(retenuePct);

  // ---- Theme helpers ------------------------------------------------------

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const hoverBg = isDark ? 'hover:bg-slate-700/60' : 'hover:bg-slate-50';

  // Money display helper (respects modeDiscret)
  const showMoney = (amount) => {
    if (modeDiscret) return '***';
    return formatMoney(amount);
  };

  // ---- Derived data -------------------------------------------------------

  /** Source devis (the signed quote used as the market reference) */
  const sourceDevis = useMemo(() => {
    if (devisSourceId) {
      return devis.find((d) => d.id === devisSourceId) || null;
    }
    return null;
  }, [devis, devisSourceId]);

  /** Eligible devis for situation mode (signed or accepted, linked to this chantier) */
  const eligibleDevis = useMemo(() => {
    return devis.filter(
      (d) =>
        d.chantier_id === chantier?.id &&
        d.type === 'devis' &&
        ['accepte', 'signe', 'acompte_facture', 'facture'].includes(d.statut)
    );
  }, [devis, chantier?.id]);

  /** Flatten lignes from the source devis */
  const sourceLignes = useMemo(() => {
    if (!sourceDevis) return [];
    return (sourceDevis.lignes || [])
      .filter((l) => !l._isSection)
      .map((l, index) => ({
        id: l.id || `ligne-${index}`,
        posteIndex: index,
        description: l.description || 'Sans description',
        quantite: parseFloat(l.quantite) || 0,
        prixUnitaire: parseFloat(l.prixUnitaire) || parseFloat(l.prix_unitaire) || 0,
        unite: l.unite || '',
        tva: l.tva !== undefined ? parseFloat(l.tva) : (sourceDevis.tvaRate || DEFAULT_TVA_RATE),
        total_ht:
          (parseFloat(l.quantite) || 0) *
          (parseFloat(l.prixUnitaire) || parseFloat(l.prix_unitaire) || 0),
      }));
  }, [sourceDevis]);

  /** Montant total du marche HT */
  const totalMarcheHT = useMemo(() => {
    return sourceLignes.reduce((s, l) => s + l.total_ht, 0);
  }, [sourceLignes]);

  /** Currently selected situation */
  const selectedSituation = useMemo(
    () => situations.find((s) => s.id === selectedId) || null,
    [situations, selectedId]
  );

  /** Next situation number */
  const nextNumero = situations.length + 1;

  /** Global avancement */
  const globalAvancement = useMemo(
    () => calculateGlobalAvancement(situationsData),
    [situationsData]
  );

  /** Cumulative invoiced */
  const cumulInvoiced = useMemo(
    () => getCumulativeInvoiced(situations),
    [situations]
  );

  // ---- Persistence --------------------------------------------------------

  const saveSituationsData = useCallback(
    (updatedSituations, extraData = {}) => {
      if (!chantier?.id || !updateChantier) return;
      const newData = {
        ...(situationsData || {}),
        mode: 'situation',
        devis_source_id: devisSourceId,
        retenue_garantie_pct: retenuePctLocal,
        situations: updatedSituations,
        ...extraData,
      };
      updateChantier(chantier.id, {
        situations_data: newData,
        mode_facturation: 'situation',
      });
    },
    [chantier?.id, updateChantier, situationsData, devisSourceId, retenuePctLocal]
  );

  // ---- Activate situation mode for this chantier --------------------------

  const handleActivateSituationMode = useCallback(
    (selectedDevisId) => {
      if (!chantier?.id || !updateChantier) return;
      const data = createSituationsData(selectedDevisId, retenuePctLocal);
      updateChantier(chantier.id, {
        situations_data: data,
        mode_facturation: 'situation',
      });
      setShowDevisSelector(false);
    },
    [chantier?.id, updateChantier, retenuePctLocal]
  );

  // ---- Build a new draft --------------------------------------------------

  const createNewDraft = useCallback(() => {
    const previousSituation = [...situations]
      .filter((s) => s.statut !== SITUATION_STATUS.BROUILLON)
      .sort((a, b) => b.numero - a.numero)[0];

    const lignes = initSituationLignes(
      sourceLignes.map((l) => ({
        ...l,
        _devisNumero: sourceDevis?.numero,
      })),
      previousSituation,
      sourceDevis?.tvaRate || DEFAULT_TVA_RATE
    );

    return {
      id: generateId('sit'),
      numero: nextNumero,
      date: new Date().toISOString().split('T')[0],
      statut: SITUATION_STATUS.BROUILLON,
      isDGD: false,
      retenuePct: retenuePctLocal,
      lignes,
      created_at: new Date().toISOString(),
    };
  }, [situations, sourceLignes, sourceDevis, nextNumero, retenuePctLocal]);

  // ---- Handlers -----------------------------------------------------------

  const handleNewSituation = useCallback(() => {
    if (!sourceDevis) {
      setShowDevisSelector(true);
      return;
    }
    const newDraft = createNewDraft();
    setDraft(newDraft);
    setIsDGD(false);
    setEditing(true);
    setSelectedId(null);
  }, [createNewDraft, sourceDevis]);

  const handleCumulChange = useCallback((ligneId, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lignes: prev.lignes.map((l) => {
          if (l.ligneId !== ligneId) return l;
          const { clamped } = validateAvancement(value, l.cumulPrecedent);
          return { ...l, cumulActuel: clamped };
        }),
      };
    });
  }, []);

  const handleSetAllTo100 = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isDGD: true,
        lignes: prev.lignes.map((l) => ({ ...l, cumulActuel: 100 })),
      };
    });
    setIsDGD(true);
  }, []);

  const handleSaveBrouillon = useCallback(() => {
    if (!draft) return;
    const draftWithDGD = { ...draft, isDGD, retenuePct: retenuePctLocal };
    const exists = situations.find((s) => s.id === draft.id);
    const updated = exists
      ? situations.map((s) => (s.id === draft.id ? { ...draftWithDGD, statut: SITUATION_STATUS.BROUILLON } : s))
      : [...situations, { ...draftWithDGD, statut: SITUATION_STATUS.BROUILLON }];
    saveSituationsData(updated);
    setEditing(false);
    setDraft(null);
    setSelectedId(null);
  }, [draft, isDGD, retenuePctLocal, situations, saveSituationsData]);

  const handleValider = useCallback(() => {
    if (!draft) return;
    const totals = calculateSituationTotals(draft.lignes, isDGD ? 0 : retenuePctLocal, isDGD);
    const validated = {
      ...draft,
      statut: SITUATION_STATUS.VALIDEE,
      isDGD,
      retenuePct: retenuePctLocal,
      totaux: totals,
      validated_at: new Date().toISOString(),
    };
    const exists = situations.find((s) => s.id === draft.id);
    const updated = exists
      ? situations.map((s) => (s.id === draft.id ? validated : s))
      : [...situations, validated];
    saveSituationsData(updated);
    setEditing(false);
    setDraft(null);
    setSelectedId(validated.id);
  }, [draft, isDGD, retenuePctLocal, situations, saveSituationsData]);

  const handleGenererFacture = useCallback(
    async (sitId) => {
      if (!addDevis || !generateNextNumero) return;

      const sit = situations.find((s) => s.id === sitId);
      if (!sit || sit.statut !== SITUATION_STATUS.VALIDEE) return;

      const totals = sit.totaux || calculateSituationTotals(sit.lignes, sit.isDGD ? 0 : (sit.retenuePct || retenuePct), sit.isDGD);
      const numero = generateNextNumero('facture');
      const client = clients?.find((c) => c.id === (sourceDevis?.client_id || chantier?.client_id || chantier?.clientId));

      // Build facture lignes from situation lignes
      const factureLignes = (sit.lignes || []).map((l) => {
        const marcheHT = (l.quantite || 0) * (l.prixUnitaire || 0);
        const cumuleHT = marcheHT * (l.cumulActuel || 0) / 100;
        const precedentHT = marcheHT * (l.cumulPrecedent || 0) / 100;
        const situationHT = cumuleHT - precedentHT;
        return {
          description: l.description,
          quantite: 1,
          prixUnitaire: situationHT,
          prix_unitaire: situationHT,
          unite: 'ens',
          tva: l.tva,
          montant: situationHT,
        };
      }).filter((l) => l.montant > 0);

      const facture = {
        id: generateId('fac'),
        client_id: client?.id || sourceDevis?.client_id || null,
        client_nom: client ? `${client.prenom || ''} ${client.nom}`.trim() : '',
        chantier_id: chantier?.id,
        numero,
        type: 'facture',
        facture_type: 'situation',
        situation_numero: sit.numero,
        devis_source_id: devisSourceId || sourceDevis?.id || null,
        statut: 'facture',
        date: new Date().toISOString().split('T')[0],
        objet: `Facture de situation n°${sit.numero}${sit.isDGD ? ' - Décompte Général Définitif' : ''} - ${chantier?.nom || ''}`,
        lignes: factureLignes,
        tvaRate: sourceDevis?.tvaRate || DEFAULT_TVA_RATE,
        total_ht: totals.montantSituationHT,
        tva: totals.totalTVA,
        total_ttc: totals.netAPayer,
        conditions: sourceDevis?.conditions || '',
      };

      try {
        await addDevis(facture);
        // Update situation status
        const updated = situations.map((s) =>
          s.id === sitId
            ? {
                ...s,
                statut: SITUATION_STATUS.FACTUREE,
                facture_id: facture.id,
                facture_numero: numero,
                facturee_at: new Date().toISOString(),
              }
            : s
        );
        saveSituationsData(updated);
        setSelectedId(sitId);
      } catch (err) {
        console.error('Erreur génération facture situation:', err);
      }
    },
    [addDevis, generateNextNumero, situations, sourceDevis, chantier, clients, devisSourceId, retenuePct, saveSituationsData]
  );

  const handlePrintSituation = useCallback(
    (sit) => {
      const client = clients?.find((c) => c.id === (sourceDevis?.client_id || chantier?.client_id || chantier?.clientId));
      printSituationFacture({
        situation: {
          ...sit,
          numero: sit.numero,
          retenueGarantiePct: sit.isDGD ? 0 : (sit.retenuePct || retenuePct),
        },
        parentDevis: sourceDevis,
        client: client || {},
        chantier,
        entreprise: entreprise || {},
        couleur,
      });
    },
    [sourceDevis, chantier, clients, entreprise, couleur, retenuePct]
  );

  const handleDelete = useCallback(
    (sitId) => {
      const updated = situations.filter((s) => s.id !== sitId);
      saveSituationsData(updated);
      if (selectedId === sitId) setSelectedId(null);
      if (draft?.id === sitId) {
        setDraft(null);
        setEditing(false);
      }
    },
    [situations, saveSituationsData, selectedId, draft]
  );

  const handleEditExisting = useCallback((sit) => {
    setDraft({ ...sit });
    setIsDGD(sit.isDGD || false);
    setEditing(true);
    setSelectedId(null);
  }, []);

  // ---- Draft totals (memoised) -------------------------------------------

  const draftTotals = useMemo(() => {
    if (!draft) return null;
    return calculateSituationTotals(draft.lignes, isDGD ? 0 : retenuePctLocal, isDGD);
  }, [draft, isDGD, retenuePctLocal]);

  // ---- Status badge -------------------------------------------------------

  const StatusBadge = ({ statut }) => {
    const colors = SITUATION_STATUS_COLORS[statut] || SITUATION_STATUS_COLORS.brouillon;
    const label = SITUATION_STATUS_LABELS[statut] || 'Brouillon';
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isDark ? colors.dark : colors.light
        }`}
      >
        {label}
      </span>
    );
  };

  // ---- Guard --------------------------------------------------------------

  if (!chantier) return null;

  // ==========================================================================
  // DEVIS SELECTOR (if no source devis selected yet)
  // ==========================================================================

  if (!devisSourceId && !showDevisSelector && situations.length === 0) {
    // Show a prompt to activate situation mode
    return (
      <div className="p-4 md:p-6">
        <div className={`rounded-2xl border ${cardBg} p-8 text-center max-w-lg mx-auto`}>
          <BarChart3 size={48} className={textMuted} style={{ margin: '0 auto 16px' }} />
          <h2 className={`text-lg font-bold ${textPrimary} mb-2`}>
            Facturation par situation
          </h2>
          <p className={`text-sm ${textMuted} mb-6`}>
            Facturez progressivement selon l'avancement réel des travaux.
            Sélectionnez un devis signé comme référence de marché.
          </p>
          {eligibleDevis.length > 0 ? (
            <button
              onClick={() => setShowDevisSelector(true)}
              className="px-5 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: couleur }}
            >
              <Plus size={16} className="inline -mt-0.5 mr-1" />
              Activer le mode situation
            </button>
          ) : (
            <div className={`text-sm ${textMuted} p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'}`}>
              <AlertTriangle size={16} className="inline -mt-0.5 mr-1 text-amber-500" />
              Aucun devis signé lié à ce chantier. Créez et faites signer un devis d'abord.
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className={`mt-4 text-sm ${textMuted} hover:underline`}
            >
              Retour
            </button>
          )}
        </div>
      </div>
    );
  }

  // Devis selector modal
  if (showDevisSelector) {
    return (
      <div className="p-4 md:p-6">
        <div className={`rounded-2xl border ${cardBg} p-6 max-w-lg mx-auto`}>
          <h2 className={`text-lg font-bold ${textPrimary} mb-1`}>
            Sélectionner le devis de référence
          </h2>
          <p className={`text-sm ${textMuted} mb-4`}>
            Ce devis servira de base (marché) pour toutes les situations de travaux.
          </p>

          {/* Retenue de garantie */}
          <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <Shield size={16} className={textSecondary} />
            <label className={`text-sm ${textSecondary} flex-1`}>Retenue de garantie (%)</label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={retenuePctLocal}
              onChange={(e) => setRetenuePctLocal(parseFloat(e.target.value) || 0)}
              className={`w-20 text-center text-sm rounded-lg border px-2 py-1.5 ${inputBg}`}
            />
          </div>

          <div className="space-y-2">
            {eligibleDevis.map((d) => {
              const totalHT = d.total_ht || (d.lignes || []).reduce((s, l) => {
                const qty = parseFloat(l.quantite) || 0;
                const pu = parseFloat(l.prixUnitaire) || parseFloat(l.prix_unitaire) || 0;
                return s + qty * pu;
              }, 0);
              const client = clients?.find((c) => c.id === d.client_id);

              return (
                <button
                  key={d.id}
                  onClick={() => handleActivateSituationMode(d.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${hoverBg} ${
                    isDark ? 'border-slate-600' : 'border-slate-200'
                  } hover:border-current`}
                  style={{ '--tw-border-opacity': 0.5 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold ${textPrimary}`}>{d.numero}</span>
                    <span className={`text-sm font-medium ${textPrimary}`}>
                      {showMoney(totalHT)} HT
                    </span>
                  </div>
                  <p className={`text-sm ${textMuted} truncate`}>
                    {d.objet || d.titre || 'Sans objet'}
                  </p>
                  {client && (
                    <p className={`text-xs ${textMuted} mt-0.5`}>
                      Client : {client.prenom} {client.nom}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowDevisSelector(false)}
            className={`mt-4 w-full text-center text-sm ${textMuted} hover:underline`}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div className="p-4 md:p-6">
      {/* ------------------------------------------------------------------ */}
      {/* BANDEAU RÉSUMÉ                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className={`rounded-2xl border ${cardBg} p-5 mb-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
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
                {chantier.nom} — {situations.length} situation{situations.length !== 1 ? 's' : ''}
                {sourceDevis && <> · Marché {sourceDevis.numero}</>}
              </p>
            </div>
          </div>

          <button
            onClick={handleNewSituation}
            disabled={sourceLignes.length === 0 && !!devisSourceId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold
                       transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: couleur }}
          >
            <Plus size={18} />
            Nouvelle situation n°{nextNumero}
          </button>
        </div>

        {/* Summary stats */}
        {devisSourceId && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-xs ${textMuted} mb-0.5`}>Marché HT</p>
              <p className={`text-sm font-bold ${textPrimary} tabular-nums`}>
                {showMoney(totalMarcheHT)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-xs ${textMuted} mb-0.5`}>Facturé cumulé</p>
              <p className={`text-sm font-bold tabular-nums`} style={{ color: couleur }}>
                {showMoney(cumulInvoiced.totalFactureHT)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-xs ${textMuted} mb-0.5`}>Reste à facturer</p>
              <p className={`text-sm font-bold ${textPrimary} tabular-nums`}>
                {showMoney(totalMarcheHT - cumulInvoiced.totalFactureHT)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-xs ${textMuted} mb-0.5`}>Retenue retenue</p>
              <p className={`text-sm font-bold text-amber-500 tabular-nums`}>
                {showMoney(cumulInvoiced.retenueRetenue)}
              </p>
            </div>
          </div>
        )}

        {/* Global progress bar */}
        {devisSourceId && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${textSecondary}`}>Avancement global</span>
              <span className={`text-xs font-bold tabular-nums`} style={{ color: globalAvancement >= 100 ? '#10b981' : couleur }}>
                {globalAvancement.toFixed(0)}%
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(globalAvancement, 100)}%`,
                  backgroundColor: globalAvancement >= 100 ? '#10b981' : couleur,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN LAYOUT                                                        */}
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
                <p className={`font-medium ${textPrimary} mb-1`}>Aucune situation créée</p>
                <p className={`text-xs ${textMuted} max-w-xs mx-auto`}>
                  Créez une première situation pour commencer la facturation progressive.
                </p>
              </div>
            ) : (
              <ul className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                {[...situations].sort((a, b) => b.numero - a.numero).map((sit) => {
                  const isActive = selectedId === sit.id;
                  const totals = sit.totaux || calculateSituationTotals(sit.lignes, sit.isDGD ? 0 : (sit.retenuePct || retenuePct), sit.isDGD);

                  return (
                    <li
                      key={sit.id}
                      onClick={() => {
                        if (editing) return;
                        setSelectedId(isActive ? null : sit.id);
                      }}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        isActive
                          ? isDark ? 'bg-slate-700/70' : 'bg-slate-100'
                          : hoverBg
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${textPrimary}`}>
                          Situation n°{sit.numero}
                          {sit.isDGD && (
                            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              DGD
                            </span>
                          )}
                        </span>
                        <StatusBadge statut={sit.statut} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${textMuted} flex items-center gap-1`}>
                          <Calendar size={12} />
                          {formatDate(sit.date)}
                        </span>
                        <span className={`text-sm font-medium ${textPrimary} tabular-nums`}>
                          {showMoney(totals.montantSituationHT)} HT
                        </span>
                      </div>
                      {sit.facture_numero && (
                        <p className={`text-xs ${textMuted} mt-0.5`}>
                          <FileText size={10} className="inline -mt-0.5 mr-0.5" />
                          {sit.facture_numero}
                        </p>
                      )}

                      {/* Quick actions */}
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {sit.statut === SITUATION_STATUS.BROUILLON && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditExisting(sit); }}
                              className={`text-xs px-2 py-1 rounded-lg ${
                                isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'
                              } hover:opacity-80 transition-opacity`}
                            >
                              Modifier
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(sit.id); }}
                              className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                        {sit.statut === SITUATION_STATUS.VALIDEE && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleGenererFacture(sit.id); }}
                            className="text-xs px-2 py-1 rounded-lg text-white hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: couleur }}
                          >
                            Générer facture
                          </button>
                        )}
                        {(sit.statut === SITUATION_STATUS.FACTUREE || sit.statut === SITUATION_STATUS.PAYEE) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrintSituation(sit); }}
                            className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${
                              isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'
                            } hover:opacity-80 transition-opacity`}
                          >
                            <Printer size={12} />
                            PDF
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
          {/* Empty state */}
          {!editing && !selectedSituation && (
            <div className={`rounded-2xl border ${cardBg} p-12 text-center`}>
              <TrendingUp size={48} className={`mx-auto mb-4 ${textMuted}`} />
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
                Suivi d'avancement
              </h3>
              <p className={`text-sm ${textMuted} max-w-md mx-auto`}>
                Sélectionnez une situation dans l'historique ou créez-en une nouvelle.
              </p>
            </div>
          )}

          {/* ---- READ-ONLY DETAIL VIEW ---- */}
          {!editing && selectedSituation && (
            <SituationDetail
              situation={selectedSituation}
              retenuePct={retenuePct}
              isDark={isDark}
              couleur={couleur}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
              hoverBg={hoverBg}
              showMoney={showMoney}
              StatusBadge={StatusBadge}
              onPrint={() => handlePrintSituation(selectedSituation)}
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
                      {isDGD && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Décompte Général Définitif
                        </span>
                      )}
                    </h2>
                    <p className={`text-sm ${textMuted}`}>
                      {draft.lignes.length} poste{draft.lignes.length !== 1 ? 's' : ''} du marché
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className={`text-sm ${textSecondary}`}>Date :</label>
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
                        className={`text-sm rounded-lg border px-3 py-1.5 ${inputBg}`}
                      />
                    </div>
                    <button
                      onClick={handleSetAllTo100}
                      className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                        isDGD
                          ? 'bg-emerald-100 text-emerald-700'
                          : isDark ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle size={14} />
                      DGD (tout à 100%)
                    </button>
                  </div>
                </div>
              </div>

              {/* Line items — desktop table */}
              <div className={`rounded-2xl border ${cardBg} overflow-hidden mb-4 hidden md:block`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Saisie situation de travaux">
                    <thead>
                      <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                        <th className={`text-left px-4 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide`}>
                          Désignation
                        </th>
                        <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                          Mt marché
                        </th>
                        <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-24`}>
                          Précédent
                        </th>
                        <th className={`text-center px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-44`}>
                          Avancement (%)
                        </th>
                        <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                          Mt cumulé
                        </th>
                        <th className={`text-right px-4 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>
                          Mt situation
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                      {draft.lignes.map((l) => {
                        const marcheHT = (l.quantite || 0) * (l.prixUnitaire || 0);
                        const montantCumul = marcheHT * (l.cumulActuel || 0) / 100;
                        const montantPrec = marcheHT * (l.cumulPrecedent || 0) / 100;
                        const montantSituation = montantCumul - montantPrec;

                        return (
                          <tr key={l.ligneId} className={`${hoverBg} transition-colors`}>
                            <td className={`px-4 py-3 ${textPrimary}`}>
                              <div className="font-medium text-sm truncate max-w-xs" title={l.description}>
                                {l.description}
                              </div>
                              <span className={`text-xs ${textMuted}`}>
                                {l.quantite} {l.unite} × {showMoney(l.prixUnitaire)}
                              </span>
                            </td>
                            <td className={`text-right px-3 py-3 ${textSecondary} tabular-nums`}>
                              {showMoney(marcheHT)}
                            </td>
                            <td className={`text-right px-3 py-3 ${textMuted} tabular-nums`}>
                              {(l.cumulPrecedent || 0).toFixed(0)}%
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={l.cumulPrecedent || 0}
                                  max={100}
                                  step={1}
                                  value={l.cumulActuel || 0}
                                  onChange={(e) => handleCumulChange(l.ligneId, e.target.value)}
                                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                                  style={{
                                    accentColor: couleur,
                                    background: `linear-gradient(to right, ${couleur} 0%, ${couleur} ${
                                      ((l.cumulActuel - (l.cumulPrecedent || 0)) / (100 - (l.cumulPrecedent || 0) || 1)) * 100
                                    }%, ${isDark ? '#334155' : '#e2e8f0'} ${
                                      ((l.cumulActuel - (l.cumulPrecedent || 0)) / (100 - (l.cumulPrecedent || 0) || 1)) * 100
                                    }%, ${isDark ? '#334155' : '#e2e8f0'} 100%)`,
                                  }}
                                />
                                <input
                                  type="number"
                                  min={l.cumulPrecedent || 0}
                                  max={100}
                                  value={l.cumulActuel || 0}
                                  onChange={(e) => handleCumulChange(l.ligneId, e.target.value)}
                                  className={`w-16 text-center text-sm rounded-lg border px-1 py-1 ${inputBg} tabular-nums`}
                                />
                              </div>
                              <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ width: `${l.cumulActuel || 0}%`, backgroundColor: couleur }}
                                />
                              </div>
                            </td>
                            <td className={`text-right px-3 py-3 ${textSecondary} tabular-nums`}>
                              {showMoney(montantCumul)}
                            </td>
                            <td className={`text-right px-4 py-3 font-semibold tabular-nums ${
                              montantSituation > 0 ? textPrimary : textMuted
                            }`}>
                              {showMoney(montantSituation)}
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
                      Aucun poste trouvé dans le devis de référence.
                    </p>
                  </div>
                )}
              </div>

              {/* Line items — mobile cards */}
              <div className="md:hidden space-y-3 mb-4">
                {draft.lignes.map((l) => {
                  const marcheHT = (l.quantite || 0) * (l.prixUnitaire || 0);
                  const montantCumul = marcheHT * (l.cumulActuel || 0) / 100;
                  const montantPrec = marcheHT * (l.cumulPrecedent || 0) / 100;
                  const montantSituation = montantCumul - montantPrec;

                  return (
                    <div key={l.ligneId} className={`rounded-xl border ${cardBg} p-4`}>
                      <div className={`font-medium text-sm ${textPrimary} mb-1`}>{l.description}</div>
                      <p className={`text-xs ${textMuted} mb-2`}>
                        {l.quantite} {l.unite} × {showMoney(l.prixUnitaire)} = {showMoney(marcheHT)} HT
                      </p>

                      {/* Slider */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs ${textMuted} w-8`}>{(l.cumulPrecedent || 0).toFixed(0)}%</span>
                        <input
                          type="range"
                          min={l.cumulPrecedent || 0}
                          max={100}
                          step={1}
                          value={l.cumulActuel || 0}
                          onChange={(e) => handleCumulChange(l.ligneId, e.target.value)}
                          className="flex-1 h-3 rounded-full appearance-none cursor-pointer"
                          style={{ accentColor: couleur }}
                        />
                        <input
                          type="number"
                          min={l.cumulPrecedent || 0}
                          max={100}
                          value={l.cumulActuel || 0}
                          onChange={(e) => handleCumulChange(l.ligneId, e.target.value)}
                          className={`w-16 text-center text-sm rounded-lg border px-1 py-1.5 ${inputBg} tabular-nums`}
                        />
                      </div>

                      {/* Progress bar */}
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'} mb-2`}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${l.cumulActuel || 0}%`, backgroundColor: couleur }}
                        />
                      </div>

                      <div className="flex justify-between text-xs">
                        <span className={textMuted}>Situation : <strong className={textPrimary}>{showMoney(montantSituation)}</strong></span>
                        <span className={textMuted}>Cumulé : {showMoney(montantCumul)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ---- SUMMARY CARD ---- */}
              {draftTotals && (
                <div className={`rounded-2xl border ${cardBg} p-5 mb-4`}>
                  <h3 className={`text-sm font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                    <Euro size={16} />
                    Récapitulatif
                  </h3>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className={textSecondary}>Montant cumulé HT</span>
                      <span className={`${textPrimary} tabular-nums`}>{showMoney(draftTotals.montantCumuleHT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={textSecondary}>Montant précédent HT</span>
                      <span className={`${textMuted} tabular-nums`}>- {showMoney(draftTotals.montantPrecedentHT)}</span>
                    </div>

                    <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />

                    <div className="flex justify-between font-semibold">
                      <span className={textPrimary}>Montant situation HT</span>
                      <span style={{ color: couleur }} className="tabular-nums">{showMoney(draftTotals.montantSituationHT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={textSecondary}>TVA</span>
                      <span className={`${textSecondary} tabular-nums`}>{showMoney(draftTotals.totalTVA)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className={textPrimary}>Montant TTC</span>
                      <span className={`${textPrimary} tabular-nums`}>{showMoney(draftTotals.montantSituationTTC)}</span>
                    </div>

                    {/* Retenue de garantie */}
                    {!isDGD && (
                      <div className={`border-t pt-2.5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield size={14} className="text-amber-500" />
                            <span className={textSecondary}>Retenue de garantie ({retenuePctLocal}%)</span>
                          </div>
                          <span className="text-amber-500 tabular-nums">- {showMoney(draftTotals.retenueGarantie)}</span>
                        </div>
                      </div>
                    )}
                    {isDGD && (
                      <div className={`border-t pt-2.5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield size={14} className="text-emerald-500" />
                            <span className="text-emerald-600 text-sm font-medium">Retenue de garantie libérée (DGD)</span>
                          </div>
                          <span className="text-emerald-500 tabular-nums">0 €</span>
                        </div>
                      </div>
                    )}

                    <div className={`border-t-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />

                    {/* NET À PAYER */}
                    <div
                      className="flex justify-between items-center text-base font-bold py-1 px-3 -mx-3 rounded-xl"
                      style={{ backgroundColor: `${couleur}15`, color: couleur }}
                    >
                      <span>NET À PAYER</span>
                      <span className="tabular-nums">{showMoney(draftTotals.netAPayer)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- ACTION BUTTONS ---- */}
              <div className="flex flex-wrap gap-3 justify-end sticky bottom-4">
                <button
                  onClick={() => { setEditing(false); setDraft(null); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <X size={16} />
                  Annuler
                </button>

                <button
                  onClick={handleSaveBrouillon}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
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
  retenuePct,
  isDark,
  couleur,
  cardBg,
  textPrimary,
  textSecondary,
  textMuted,
  hoverBg,
  showMoney,
  StatusBadge,
  onPrint,
}) {
  const totals = useMemo(() => {
    return situation.totaux || calculateSituationTotals(
      situation.lignes,
      situation.isDGD ? 0 : (situation.retenuePct || retenuePct || 0),
      situation.isDGD
    );
  }, [situation, retenuePct]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-2xl border ${cardBg} p-5`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className={`text-lg font-bold ${textPrimary} flex items-center gap-2`}>
              Situation n°{situation.numero}
              {situation.isDGD && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">DGD</span>
              )}
              <StatusBadge statut={situation.statut} />
            </h2>
            <p className={`text-sm ${textMuted} mt-0.5`}>
              {formatDate(situation.date)}
              {situation.facture_numero && (
                <> · Facture : <strong>{situation.facture_numero}</strong></>
              )}
            </p>
          </div>
          {onPrint && (
            <button
              onClick={onPrint}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Printer size={16} />
              Imprimer
            </button>
          )}
        </div>
      </div>

      {/* Lines table */}
      <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
        {/* Desktop table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm" aria-label="Détail situation de travaux">
            <thead>
              <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                <th className={`text-left px-4 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide`}>Désignation</th>
                <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-24`}>Préc.</th>
                <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-24`}>Actuel</th>
                <th className={`text-right px-3 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>Mt cumulé</th>
                <th className={`text-right px-4 py-3 font-semibold ${textSecondary} text-xs uppercase tracking-wide w-28`}>Mt situation</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {(situation.lignes || []).map((l) => {
                const marcheHT = (l.quantite || 0) * (l.prixUnitaire || 0);
                const montantCumul = marcheHT * (l.cumulActuel || 0) / 100;
                const montantPrec = marcheHT * (l.cumulPrecedent || 0) / 100;
                const montantSituation = montantCumul - montantPrec;

                return (
                  <tr key={l.ligneId} className={`${hoverBg} transition-colors`}>
                    <td className={`px-4 py-3 ${textPrimary}`}>
                      <div className="font-medium text-sm">{l.description}</div>
                      <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${l.cumulActuel || 0}%`, backgroundColor: couleur }} />
                      </div>
                    </td>
                    <td className={`text-right px-3 py-3 ${textMuted} tabular-nums`}>{(l.cumulPrecedent || 0).toFixed(0)}%</td>
                    <td className="text-right px-3 py-3 tabular-nums font-medium" style={{ color: couleur }}>{(l.cumulActuel || 0).toFixed(0)}%</td>
                    <td className={`text-right px-3 py-3 ${textSecondary} tabular-nums`}>{showMoney(montantCumul)}</td>
                    <td className={`text-right px-4 py-3 font-semibold ${textPrimary} tabular-nums`}>{showMoney(montantSituation)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-2">
          {(situation.lignes || []).map((l) => {
            const marcheHT = (l.quantite || 0) * (l.prixUnitaire || 0);
            const montantCumul = marcheHT * (l.cumulActuel || 0) / 100;
            const montantPrec = marcheHT * (l.cumulPrecedent || 0) / 100;
            const montantSituation = montantCumul - montantPrec;

            return (
              <div key={l.ligneId} className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <div className={`font-medium text-sm ${textPrimary} mb-1`}>{l.description}</div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'} mb-1.5`}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${l.cumulActuel || 0}%`, backgroundColor: couleur }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className={textMuted}>{(l.cumulPrecedent || 0).toFixed(0)}% → <strong style={{ color: couleur }}>{(l.cumulActuel || 0).toFixed(0)}%</strong></span>
                  <span className={`font-semibold ${textPrimary}`}>{showMoney(montantSituation)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className={`rounded-2xl border ${cardBg} p-5`}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={textSecondary}>Montant situation HT</span>
            <span className={`font-semibold ${textPrimary} tabular-nums`}>{showMoney(totals.montantSituationHT)}</span>
          </div>
          <div className="flex justify-between">
            <span className={textSecondary}>TVA</span>
            <span className={`${textSecondary} tabular-nums`}>{showMoney(totals.totalTVA)}</span>
          </div>
          {totals.retenueGarantie > 0 && (
            <div className="flex justify-between">
              <span className="text-amber-500 flex items-center gap-1"><Shield size={12} /> Retenue de garantie</span>
              <span className="text-amber-500 tabular-nums">- {showMoney(totals.retenueGarantie)}</span>
            </div>
          )}
          <div className={`border-t pt-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div
              className="flex justify-between font-bold text-base py-1 px-3 -mx-3 rounded-xl"
              style={{ backgroundColor: `${couleur}15`, color: couleur }}
            >
              <span>{situation.isDGD ? 'SOLDE DGD' : 'NET À PAYER'}</span>
              <span className="tabular-nums">{showMoney(totals.netAPayer)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
