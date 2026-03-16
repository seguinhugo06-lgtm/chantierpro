import React from 'react';
import {
  Mic, Camera, Clock, CheckCircle, AlertCircle, FileText,
  Search, BarChart3, Euro, ShieldCheck, Plus, Sparkles,
} from 'lucide-react';
import IAUsageCounter from './IAUsageCounter';
import IAUpgradePrompt from './IAUpgradePrompt';

const fmtCurrency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const fmtShortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const STATUTS = {
  en_cours: { label: 'En cours', color: 'blue', icon: Clock },
  terminee: { label: 'Terminée', color: 'green', icon: CheckCircle },
  erreur: { label: 'Erreur', color: 'red', icon: AlertCircle },
  appliquee: { label: 'Appliquée', color: 'purple', icon: FileText },
};

function StatusBadge({ statut, isDark }) {
  const cfg = STATUTS[statut] || STATUTS.en_cours;
  const colors = {
    blue: isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700',
    green: isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
    red: isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-700',
    purple: isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-700',
  };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[cfg.color]}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, isDark, couleur }) {
  return (
    <div className={`rounded-xl border p-2.5 sm:p-3 min-w-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
        <Icon size={14} className="shrink-0" style={{ color: couleur }} />
        <span className={`text-[11px] sm:text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <p className={`text-base sm:text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function AnalysisCard({ analyse, isDark, couleur, onClick }) {
  const SourceIcon = analyse.source === 'photo' ? Camera : Mic;
  const statusColor = {
    terminee: couleur,
    appliquee: '#8b5cf6',
    erreur: '#ef4444',
    en_cours: '#3b82f6',
  }[analyse.statut] || couleur;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md ${
        isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
      style={{ borderLeftWidth: '3px', borderLeftColor: statusColor }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <SourceIcon size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
          <StatusBadge statut={analyse.statut} isDark={isDark} />
        </div>
        <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {fmtShortDate(analyse.created_at)}
        </span>
      </div>
      <p className={`text-sm font-medium truncate mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {analyse.description || 'Sans description'}
      </p>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {analyse.analyse_resultat?.lignes?.length || analyse.analyse_resultat?.travaux?.length || 0} postes
        </span>
        <span className="text-sm font-bold" style={{ color: couleur }}>
          {fmtCurrency.format(analyse.analyse_resultat?.totalHT || 0)}
        </span>
      </div>
    </button>
  );
}

/**
 * IAHistoryList — Analysis history with KPIs, search, filters, and cards
 */
export default function IAHistoryList({
  analyses,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
  filteredAnalyses,
  onSelectAnalyse,
  onNewAnalysis,
  availability,
  isLifetime,
  isDark = false,
  couleur = '#f97316',
}) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900';

  const totalHTAll = filteredAnalyses.reduce((s, a) => s + (a.analyse_resultat?.totalHT || 0), 0);
  const avgConfiance = filteredAnalyses.length > 0
    ? Math.round(filteredAnalyses.reduce((s, a) => s + (a.confiance || 0), 0) / filteredAnalyses.length)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Devis IA</h1>
          <p className={`text-sm ${textMuted}`}>Dictez vos travaux, l'IA génère le devis</p>
        </div>
        <IAUsageCounter
          used={availability.used}
          limit={availability.limit}
          isLifetime={isLifetime}
          isDark={isDark}
          couleur={couleur}
        />
      </div>

      {/* New analysis button or upgrade prompt */}
      {availability.allowed ? (
        <button
          onClick={onNewAnalysis}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] mb-6"
          style={{ backgroundColor: couleur }}
        >
          <Plus className="w-4 h-4" />
          Nouvelle analyse
        </button>
      ) : (
        <div className="mb-6">
          <IAUpgradePrompt isDark={isDark} couleur={couleur} />
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiCard icon={BarChart3} label="Analyses" value={filteredAnalyses.length} isDark={isDark} couleur={couleur} />
        <KpiCard icon={Euro} label="Total HT" value={fmtCurrency.format(totalHTAll)} isDark={isDark} couleur={couleur} />
        <KpiCard icon={ShieldCheck} label="Confiance" value={`${avgConfiance}%`} isDark={isDark} couleur={couleur} />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher..."
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputCls} focus:outline-none focus:ring-2`}
          style={{ '--tw-ring-color': couleur }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[{ key: null, label: 'Tous' }, { key: 'terminee', label: 'Terminées' }, { key: 'appliquee', label: 'Appliquées' }].map(f => (
          <button
            key={f.key || 'all'}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === f.key ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
            style={statusFilter === f.key ? { backgroundColor: couleur } : {}}
          >
            {f.label}
          </button>
        ))}
        <select
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
          className={`ml-auto text-xs px-2 py-1.5 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
        >
          <option value="recent">Récentes</option>
          <option value="oldest">Anciennes</option>
          <option value="montant_desc">Montant ↓</option>
          <option value="montant_asc">Montant ↑</option>
        </select>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filteredAnalyses.map(a => (
          <AnalysisCard key={a.id} analyse={a} isDark={isDark} couleur={couleur} onClick={() => onSelectAnalyse(a.id)} />
        ))}
        {filteredAnalyses.length === 0 && (
          <div className={`text-center py-8 ${textMuted}`}>
            <Search size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">{searchTerm || statusFilter ? 'Aucune analyse correspondant aux filtres' : 'Aucune analyse pour le moment'}</p>
            {!searchTerm && !statusFilter && <p className="text-xs mt-1 opacity-60">Lancez votre première analyse IA ci-dessus</p>}
          </div>
        )}
      </div>
    </div>
  );
}
