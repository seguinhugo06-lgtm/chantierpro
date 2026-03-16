import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, TrendingUp, Wallet, HardHat, Download, Eye, Send, Trash2,
  Calendar, Settings, Loader2, CheckCircle, AlertCircle, Clock, ChevronDown,
  BarChart3, RefreshCw
} from 'lucide-react';
import { computeActivityReport, computeFinancialReport, computeChantierReport, getPeriodPresets, getPeriodLabel } from '../../lib/reportDataService';
import { generateActivityPDF, generateFinancialPDF, generateChantierPDF, downloadReportPDF, previewReportPDF } from '../../lib/reportPdfBuilder';
import supabase, { isDemo } from '../../supabaseClient';
import RapportConfigModal from './RapportConfigModal';
import RapportPreview from './RapportPreview';

const TYPE_CONFIG = {
  activite: { label: "Rapport d'activité", icon: TrendingUp, color: '#3b82f6', desc: 'CA, devis, conversion, pipeline, top clients' },
  financier: { label: 'Rapport financier', icon: Wallet, color: '#8b5cf6', desc: 'Trésorerie, marges, TVA, dépenses, encaissements' },
  chantier: { label: 'Rapport chantier', icon: HardHat, color: '#f97316', desc: 'Détail d\'un chantier : budget, avancement, dépenses' },
};

const STATUS_ICONS = {
  genere: CheckCircle,
  en_cours: Loader2,
  erreur: AlertCircle,
  envoye: Send,
};

export default function RapportsTab({ devis = [], depenses = [], clients = [], chantiers = [], entreprise, equipe = [], paiements = [], pointages = [], isDark, couleur = '#f97316', modeDiscret, setPage }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('last_month');
  const [selectedChantier, setSelectedChantier] = useState('');
  const [config, setConfig] = useState(null);

  const presets = useMemo(() => getPeriodPresets(), []);
  const currentPreset = presets.find(p => p.key === selectedPeriod);

  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Fetch report history
  useEffect(() => {
    fetchHistory();
    fetchConfig();
  }, []);

  const fetchHistory = async () => {
    if (isDemo || !supabase) {
      setReports(getDemoReports());
      return;
    }
    try {
      const { data } = await supabase
        .from('rapports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setReports(data);
    } catch (e) {
      console.error('Error fetching reports:', e);
      setReports(getDemoReports());
    }
  };

  const fetchConfig = async () => {
    if (isDemo || !supabase) {
      try {
        const saved = localStorage.getItem('cp_rapport_config');
        if (saved) setConfig(JSON.parse(saved));
      } catch {}
      return;
    }
    try {
      const { data } = await supabase.rpc('get_or_create_rapport_config');
      if (data) setConfig(data);
    } catch (e) {
      console.error('Error fetching config:', e);
    }
  };

  // Generate report
  const handleGenerate = useCallback(async (type) => {
    if (!currentPreset) return;
    setGenerating(type);

    try {
      let data, result;
      const { debut, fin } = currentPreset;

      if (type === 'activite') {
        data = computeActivityReport(devis, clients, chantiers, depenses, paiements, debut, fin);
        result = await generateActivityPDF(data, entreprise, { couleur });
      } else if (type === 'financier') {
        data = computeFinancialReport(devis, clients, chantiers, depenses, paiements, debut, fin);
        result = await generateFinancialPDF(data, entreprise, { couleur });
      } else if (type === 'chantier') {
        if (!selectedChantier) {
          setGenerating(null);
          return;
        }
        data = computeChantierReport(selectedChantier, devis, clients, chantiers, depenses, pointages || []);
        if (!data) { setGenerating(null); return; }
        result = await generateChantierPDF(data, entreprise, { couleur });
      }

      if (result) {
        // Save to history
        const record = {
          type,
          titre: `${TYPE_CONFIG[type].label} — ${getPeriodLabel(currentPreset.debut, currentPreset.fin)}`,
          periode_debut: currentPreset.debut.toISOString().split('T')[0],
          periode_fin: currentPreset.fin.toISOString().split('T')[0],
          statut: 'genere',
          page_count: result.pageCount,
          donnees_snapshot: { kpis: data?.kpis || {} },
          chantier_id: type === 'chantier' ? selectedChantier : null,
        };

        if (!isDemo && supabase) {
          try {
            const { data: inserted } = await supabase.from('rapports').insert(record).select().single();
            if (inserted) setReports(prev => [inserted, ...prev]);
          } catch (e) {
            console.error('Error saving report:', e);
          }
        } else {
          setReports(prev => [{ id: `demo_${Date.now()}`, ...record, created_at: new Date().toISOString() }, ...prev]);
        }

        // Show preview
        setPreviewData({ blob: result.blob, filename: result.filename });
      }
    } catch (e) {
      console.error('Error generating report:', e);
    } finally {
      setGenerating(null);
    }
  }, [currentPreset, devis, clients, chantiers, depenses, paiements, pointages, entreprise, couleur, selectedChantier]);

  const handleDownloadHistory = useCallback(async (report) => {
    // Re-generate the PDF from stored data
    const { debut, fin } = { debut: new Date(report.periode_debut), fin: new Date(report.periode_fin) };
    let data, result;

    if (report.type === 'activite') {
      data = computeActivityReport(devis, clients, chantiers, depenses, paiements, debut, fin);
      result = await generateActivityPDF(data, entreprise, { couleur });
    } else if (report.type === 'financier') {
      data = computeFinancialReport(devis, clients, chantiers, depenses, paiements, debut, fin);
      result = await generateFinancialPDF(data, entreprise, { couleur });
    } else if (report.type === 'chantier' && report.chantier_id) {
      data = computeChantierReport(report.chantier_id, devis, clients, chantiers, depenses, pointages || []);
      if (data) result = await generateChantierPDF(data, entreprise, { couleur });
    }

    if (result) downloadReportPDF(result.blob, result.filename);
  }, [devis, clients, chantiers, depenses, paiements, pointages, entreprise, couleur]);

  // Active chantiers for dropdown
  const activeChantiers = useMemo(() =>
    chantiers.filter(c => c.statut === 'en_cours' || c.statut === 'termine' || c.statut === 'prospect')
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || '')),
    [chantiers]
  );

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Calendar size={16} className={textMuted} />
        <span className={`text-sm font-medium ${textSecondary}`}>Période :</span>
        <div className="flex flex-wrap gap-1.5">
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => setSelectedPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                selectedPeriod === p.key
                  ? 'text-white shadow-sm'
                  : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={selectedPeriod === p.key ? { backgroundColor: couleur } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const Icon = cfg.icon;
          const isGenerating = generating === type;

          return (
            <div key={type} className={`${cardBg} rounded-2xl border ${borderColor} p-5 flex flex-col`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cfg.color}20` }}>
                  <Icon size={20} style={{ color: cfg.color }} />
                </div>
                <div>
                  <h3 className={`font-semibold text-sm ${textPrimary}`}>{cfg.label}</h3>
                </div>
              </div>
              <p className={`text-xs ${textMuted} mb-4 flex-1`}>{cfg.desc}</p>

              {type === 'chantier' && (
                <select
                  value={selectedChantier}
                  onChange={e => setSelectedChantier(e.target.value)}
                  className={`w-full px-3 py-2 mb-3 rounded-lg text-sm border ${borderColor} ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900'}`}
                >
                  <option value="">Choisir un chantier...</option>
                  {activeChantiers.map(c => (
                    <option key={c.id} value={c.id}>{c.nom || c.titre || 'Chantier'}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => handleGenerate(type)}
                disabled={isGenerating || (type === 'chantier' && !selectedChantier)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: isGenerating ? '#94a3b8' : cfg.color }}
              >
                {isGenerating ? (
                  <><Loader2 size={16} className="animate-spin" /> Génération...</>
                ) : (
                  <><BarChart3 size={16} /> Générer</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Auto-reports config banner */}
      <div className={`${cardBg} rounded-2xl border ${borderColor} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw size={16} className={textMuted} />
            <div>
              <h3 className={`text-sm font-semibold ${textPrimary}`}>Rapports automatiques</h3>
              <p className={`text-xs ${textMuted} mt-0.5`}>
                {config?.activite_actif || config?.financier_actif
                  ? `${config.activite_actif ? `Activité ${config.activite_periodicite}` : ''}${config.activite_actif && config.financier_actif ? ' · ' : ''}${config.financier_actif ? `Financier ${config.financier_periodicite}` : ''}`
                  : 'Aucun rapport automatique configuré'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfig(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Settings size={14} className="inline mr-1" />
            Configurer
          </button>
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>Historique des rapports</h3>
        {reports.length === 0 ? (
          <div className={`${cardBg} rounded-2xl border ${borderColor} p-8 text-center`}>
            <FileText size={32} className={`mx-auto mb-3 ${textMuted}`} />
            <p className={`text-sm ${textMuted}`}>Aucun rapport généré</p>
            <p className={`text-xs ${textMuted} mt-1`}>Générez votre premier rapport PDF ci-dessus</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map(r => {
              const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.activite;
              const Icon = cfg.icon;
              const StatusIcon = STATUS_ICONS[r.statut] || CheckCircle;
              return (
                <div key={r.id} className={`${cardBg} rounded-xl border ${borderColor} px-4 py-3 flex items-center gap-3`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cfg.color}15` }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${textPrimary} truncate`}>{r.titre}</p>
                    <p className={`text-xs ${textMuted}`}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—'}
                      {r.page_count ? ` · ${r.page_count} pages` : ''}
                      {r.auto_genere ? ' · Auto' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownloadHistory(r)}
                      className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                      title="Télécharger"
                    >
                      <Download size={16} className={textMuted} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Config modal */}
      {showConfig && (
        <RapportConfigModal
          isOpen={showConfig}
          onClose={() => { setShowConfig(false); fetchConfig(); }}
          isDark={isDark}
          couleur={couleur}
          entreprise={entreprise}
        />
      )}

      {/* Preview modal */}
      {previewData && (
        <RapportPreview
          blob={previewData.blob}
          filename={previewData.filename}
          onClose={() => setPreviewData(null)}
          onDownload={() => downloadReportPDF(previewData.blob, previewData.filename)}
          isDark={isDark}
        />
      )}
    </div>
  );
}

// Demo data for report history
function getDemoReports() {
  const now = new Date();
  return [
    {
      id: 'demo_1',
      type: 'activite',
      titre: `Rapport d'activité — ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
      periode_debut: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      periode_fin: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      statut: 'genere',
      page_count: 4,
      auto_genere: false,
      created_at: now.toISOString(),
    },
    {
      id: 'demo_2',
      type: 'financier',
      titre: `Rapport financier — T${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
      periode_debut: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString(),
      periode_fin: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0).toISOString(),
      statut: 'genere',
      page_count: 6,
      auto_genere: true,
      created_at: new Date(now.getTime() - 86400000 * 5).toISOString(),
    },
  ];
}
