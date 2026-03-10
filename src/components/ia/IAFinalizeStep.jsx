import React, { useState, useMemo } from 'react';
import {
  User, Plus, ChevronDown, ChevronUp, Calendar, Percent, Info,
  FileText, Building2, StickyNote, CreditCard, Shield, Sparkles, ArrowLeft, ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtCurrency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function computeTotals(lines, tvaDefaut, remise = 0, retenueGarantie = false) {
  let totalHT = 0;
  const tvaParTaux = {};

  lines.forEach(l => {
    const montant = (l.quantite || 0) * (l.prixUnitaire || 0);
    const taux = l.tva !== undefined ? l.tva : tvaDefaut;
    totalHT += montant;
    if (!tvaParTaux[taux]) tvaParTaux[taux] = { base: 0, montant: 0 };
    tvaParTaux[taux].base += montant;
    tvaParTaux[taux].montant += montant * (taux / 100);
  });

  const remiseAmount = totalHT * (remise / 100);
  const htApresRemise = totalHT - remiseAmount;
  const ratio = totalHT > 0 ? htApresRemise / totalHT : 1;

  Object.values(tvaParTaux).forEach(t => {
    t.base *= ratio;
    t.montant *= ratio;
  });

  const totalTVA = Object.values(tvaParTaux).reduce((s, t) => s + t.montant, 0);
  const ttc = htApresRemise + totalTVA;
  const retenue = retenueGarantie ? ttc * 0.05 : 0;

  return {
    totalHT: Math.round(totalHT * 100) / 100,
    htApresRemise: Math.round(htApresRemise * 100) / 100,
    remiseAmount: Math.round(remiseAmount * 100) / 100,
    tvaParTaux,
    totalTVA: Math.round(totalTVA * 100) / 100,
    ttc: Math.round(ttc * 100) / 100,
    retenueGarantie: Math.round(retenue * 100) / 100,
    ttcNet: Math.round((ttc - retenue) * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function IAFinalizeStep({
  editableLines = [],
  analyseDescription = '',
  confidence = 0,
  clients = [],
  chantiers = [],
  entreprise = {},
  onBack,
  onCreateDevis,
  onAddClient,
  isSubmitting = false,
  isDark = false,
  couleur = '#f97316',
}) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900';
  const sectionBg = isDark ? 'bg-slate-800/50' : 'bg-slate-50';

  // Form state
  const [clientId, setClientId] = useState('');
  const [tvaDefaut, setTvaDefaut] = useState(entreprise?.tvaDefaut || 20);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validite, setValidite] = useState(entreprise?.validiteDevis || 30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chantierId, setChantierId] = useState('');
  const [remise, setRemise] = useState(0);
  const [retenueGarantie, setRetenueGarantie] = useState(false);
  const [notes, setNotes] = useState('');
  const [conditionsPaiement, setConditionsPaiement] = useState('');

  // Live totals
  const totals = useMemo(
    () => computeTotals(editableLines, tvaDefaut, remise, retenueGarantie),
    [editableLines, tvaDefaut, remise, retenueGarantie]
  );

  const handleSubmit = () => {
    if (!clientId) return;
    onCreateDevis({
      clientId,
      tvaDefaut,
      date,
      validite,
      chantierId: chantierId || undefined,
      remise,
      retenueGarantie,
      notes: notes.trim(),
      conditionsPaiement,
      totals,
    });
  };

  return (
    <div className="space-y-4">
      {/* Recap banner */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: couleur }} />
            <span className={`text-sm font-semibold ${textPrimary}`}>Récapitulatif IA</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            confidence >= 80 ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700' :
            confidence >= 60 ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700' :
            isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
          }`}>
            {confidence}% fiabilité
          </span>
        </div>
        <p className={`text-xs ${textMuted} truncate mb-2`}>{analyseDescription}</p>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${textMuted}`}>{editableLines.length} postes</span>
          <span className="text-sm font-bold" style={{ color: couleur }}>
            {fmtCurrency.format(totals.totalHT)} HT
          </span>
        </div>
      </div>

      {/* Client (required) */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${textPrimary}`}>
          <User size={16} />
          Client <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className={`flex-1 rounded-xl border p-2.5 text-sm min-h-[44px] ${inputCls} ${!clientId ? 'italic opacity-60' : ''}`}
          >
            <option value="">— Sélectionner un client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.prenom ? `${c.prenom} ${c.nom}` : c.nom} {c.entreprise ? `(${c.entreprise})` : ''}
              </option>
            ))}
          </select>
          {onAddClient && (
            <button
              onClick={onAddClient}
              className="px-3 rounded-xl min-h-[44px] flex items-center justify-center hover:shadow-md transition-all"
              style={{ background: `${couleur}20`, color: couleur }}
              title="Nouveau client"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
        {!clientId && (
          <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1">
            Sélectionnez un client pour créer le devis
          </p>
        )}
      </div>

      {/* TVA */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${textPrimary}`}>
          <Percent size={16} />
          TVA par défaut
          <span className="relative group ml-1">
            <Info size={14} className={`cursor-help ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <span className={`absolute bottom-full left-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-56 sm:w-64 p-3 rounded-xl text-xs leading-relaxed shadow-xl border z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>20%</strong> — Standard (constructions neuves)<br/>
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>10%</strong> — Rénovation (logement &gt; 2 ans)<br/>
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>5,5%</strong> — Amélioration énergétique<br/>
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>0%</strong> — Autoliquidation / Exonération
            </span>
          </span>
        </label>
        <div className="flex gap-2">
          {[20, 10, 5.5, 0].map(rate => (
            <button
              key={rate}
              onClick={() => setTvaDefaut(rate)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                tvaDefaut === rate ? 'text-white shadow-md' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={tvaDefaut === rate ? { backgroundColor: couleur } : {}}
            >
              {rate}%
            </button>
          ))}
        </div>
      </div>

      {/* Date & Validité */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${textPrimary}`}>
          <Calendar size={16} />
          Date & Validité
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs ${textMuted} mb-1 block`}>Date du devis</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={`w-full rounded-xl border p-2.5 text-sm min-h-[44px] ${inputCls}`}
            />
          </div>
          <div>
            <label className={`text-xs ${textMuted} mb-1 block`}>Validité (jours)</label>
            <input
              type="number"
              value={validite}
              onChange={e => setValidite(parseInt(e.target.value) || 30)}
              min={1}
              className={`w-full rounded-xl border p-2.5 text-sm min-h-[44px] ${inputCls}`}
            />
          </div>
        </div>
      </div>

      {/* Advanced options (collapsible) */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className={`w-full flex items-center justify-between rounded-xl border p-3 text-sm font-medium transition-all ${
          isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <span className="flex items-center gap-2">
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Options avancées
        </span>
        <span className={`text-xs ${textMuted}`}>
          {[chantierId && 'Chantier', remise > 0 && `Remise ${remise}%`, retenueGarantie && 'Retenue', notes && 'Notes'].filter(Boolean).join(' · ') || 'Optionnel'}
        </span>
      </button>

      {showAdvanced && (
        <div className={`rounded-xl border p-4 space-y-4 ${cardBg}`}>
          {/* Chantier */}
          <div>
            <label className={`flex items-center gap-2 text-xs font-medium mb-1 ${textMuted}`}>
              <Building2 size={14} />
              Chantier
            </label>
            <select
              value={chantierId}
              onChange={e => setChantierId(e.target.value)}
              className={`w-full rounded-xl border p-2.5 text-sm min-h-[44px] ${inputCls}`}
            >
              <option value="">Aucun</option>
              {chantiers.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Remise */}
          <div>
            <label className={`flex items-center gap-2 text-xs font-medium mb-1 ${textMuted}`}>
              <Percent size={14} />
              Remise globale
            </label>
            <div className="flex gap-1.5 sm:gap-2">
              {[0, 5, 10, 15, 20].map(r => (
                <button
                  key={r}
                  onClick={() => setRemise(r)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all min-h-[40px] ${
                    remise === r
                      ? 'text-white'
                      : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                  style={remise === r ? { backgroundColor: couleur } : {}}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          {/* Retenue de garantie */}
          <div className="flex items-center justify-between">
            <label className={`flex items-center gap-2 text-xs font-medium ${textMuted}`}>
              <Shield size={14} />
              Retenue de garantie (5%)
            </label>
            <button
              onClick={() => setRetenueGarantie(!retenueGarantie)}
              className={`w-11 h-6 rounded-full transition-all relative ${retenueGarantie ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
              style={retenueGarantie ? { backgroundColor: couleur } : {}}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${retenueGarantie ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className={`flex items-center gap-2 text-xs font-medium mb-1 ${textMuted}`}>
              <StickyNote size={14} />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Conditions particulières..."
              className={`w-full rounded-xl border p-2.5 text-sm resize-none ${inputCls}`}
            />
          </div>

          {/* Conditions de paiement */}
          <div>
            <label className={`flex items-center gap-2 text-xs font-medium mb-1 ${textMuted}`}>
              <CreditCard size={14} />
              Conditions de paiement
            </label>
            <select
              value={conditionsPaiement}
              onChange={e => setConditionsPaiement(e.target.value)}
              className={`w-full rounded-xl border p-2.5 text-sm min-h-[44px] ${inputCls}`}
            >
              <option value="">Par défaut</option>
              <option value="comptant">Comptant à réception</option>
              <option value="30j">30 jours</option>
              <option value="30j_fin_mois">30 jours fin de mois</option>
              <option value="45j">45 jours</option>
              <option value="60j">60 jours</option>
              <option value="acompte_30">Acompte 30% à la commande</option>
              <option value="acompte_50">Acompte 50% à la commande</option>
              <option value="echelon_3">3 échéances (30/60/90j)</option>
            </select>
          </div>
        </div>
      )}

      {/* Totals summary */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <div className="space-y-2">
          {remise > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${textMuted}`}>Sous-total HT</span>
                <span className={`text-sm ${textPrimary}`}>{fmtCurrency.format(totals.totalHT)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm text-red-400`}>Remise {remise}%</span>
                <span className={`text-sm text-red-400`}>-{fmtCurrency.format(totals.remiseAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium ${textPrimary}`}>Total HT</span>
            <span className={`text-sm font-semibold ${textPrimary}`}>{fmtCurrency.format(totals.htApresRemise)}</span>
          </div>
          {tvaDefaut > 0 && Object.entries(totals.tvaParTaux).map(([taux, data]) => (
            <div key={taux} className="flex justify-between items-center">
              <span className={`text-xs ${textMuted}`}>TVA {taux}%</span>
              <span className={`text-xs ${textMuted}`}>{fmtCurrency.format(data.montant)}</span>
            </div>
          ))}
          {retenueGarantie && (
            <div className="flex justify-between items-center">
              <span className={`text-xs ${textMuted}`}>Retenue garantie 5%</span>
              <span className={`text-xs ${textMuted}`}>-{fmtCurrency.format(totals.retenueGarantie)}</span>
            </div>
          )}
          <div className={`flex justify-between items-center pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <span className={`text-sm font-bold ${textPrimary}`}>Total TTC</span>
            <span className="text-xl font-bold" style={{ color: couleur }}>
              {fmtCurrency.format(retenueGarantie ? totals.ttcNet : totals.ttc)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 min-h-[44px] ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <ArrowLeft size={14} />
          Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={!clientId || isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold transition-all hover:shadow-lg disabled:opacity-40 min-h-[44px]"
          style={{ backgroundColor: couleur }}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Création...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Créer le devis
            </>
          )}
        </button>
      </div>
    </div>
  );
}
