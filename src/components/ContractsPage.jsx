import { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, FileCheck,
  Calendar, RefreshCw, AlertTriangle, CheckCircle, Clock,
  TrendingUp, ChevronDown, MoreVertical
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'cp_contrats_maintenance';

const RECURRENCES = [
  { id: 'mensuel', label: 'Mensuel', mois: 1 },
  { id: 'trimestriel', label: 'Trimestriel', mois: 3 },
  { id: 'semestriel', label: 'Semestriel', mois: 6 },
  { id: 'annuel', label: 'Annuel', mois: 12 },
];

const TVA_OPTIONS = [
  { value: 20, label: '20%' },
  { value: 10, label: '10%' },
  { value: 5.5, label: '5,5%' },
];

const STATUTS = {
  actif: { label: 'Actif', color: '#22c55e', bg: '#22c55e20' },
  a_renouveler: { label: 'À renouveler', color: '#f59e0b', bg: '#f59e0b20' },
  expire: { label: 'Expiré', color: '#ef4444', bg: '#ef444420' },
};

const DEMO_CONTRACTS = [
  {
    id: 'demo-1',
    clientId: null,
    clientName: 'Jean Dupont',
    objet: 'Entretien chaudière annuel',
    montantHt: 250,
    tva: 20,
    recurrence: 'annuel',
    debut: '2025-11-01',
    fin: '2026-10-31',
    autoRenouvellement: true,
    conditions: 'Visite annuelle avec remplacement des pièces d\'usure.',
    chantierId: null,
    statut: 'actif',
  },
  {
    id: 'demo-2',
    clientId: null,
    clientName: 'Sophie Martin',
    objet: 'Maintenance climatisation',
    montantHt: 150,
    tva: 20,
    recurrence: 'semestriel',
    debut: '2026-01-01',
    fin: '2026-12-31',
    autoRenouvellement: true,
    conditions: 'Deux visites par an : mars et septembre.',
    chantierId: null,
    statut: 'actif',
  },
  {
    id: 'demo-3',
    clientId: null,
    clientName: 'Pierre Lefebvre',
    objet: 'Contrat entretien plomberie',
    montantHt: 90,
    tva: 10,
    recurrence: 'trimestriel',
    debut: '2025-06-01',
    fin: '2026-05-31',
    autoRenouvellement: false,
    conditions: 'Vérification trimestrielle des installations sanitaires.',
    chantierId: null,
    statut: 'a_renouveler',
  },
  {
    id: 'demo-4',
    clientId: null,
    clientName: 'Marie Garnier',
    objet: 'Maintenance ascenseur',
    montantHt: 320,
    tva: 20,
    recurrence: 'mensuel',
    debut: '2025-01-01',
    fin: '2025-12-31',
    autoRenouvellement: false,
    conditions: '',
    chantierId: null,
    statut: 'expire',
  },
];

const EMPTY_FORM = {
  clientId: '',
  clientName: '',
  objet: '',
  montantHt: '',
  tva: 20,
  recurrence: 'annuel',
  debut: '',
  fin: '',
  autoRenouvellement: false,
  conditions: '',
  chantierId: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeStatut(contrat) {
  const now = new Date();
  const fin = new Date(contrat.fin);
  const diffDays = (fin - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'expire';
  if (diffDays <= 30) return 'a_renouveler';
  return 'actif';
}

function mensualise(montantHt, recurrence) {
  const rec = RECURRENCES.find(r => r.id === recurrence);
  if (!rec) return montantHt;
  return montantHt / rec.mois;
}

function progressPct(debut, fin) {
  const d = new Date(debut).getTime();
  const f = new Date(fin).getTime();
  const now = Date.now();
  if (now >= f) return 100;
  if (now <= d) return 0;
  return Math.round(((now - d) / (f - d)) * 100);
}

function prochaineEcheance(debut, recurrence) {
  const rec = RECURRENCES.find(r => r.id === recurrence);
  if (!rec) return null;
  const d = new Date(debut);
  const now = new Date();
  let next = new Date(d);
  while (next <= now) {
    next.setMonth(next.getMonth() + rec.mois);
  }
  return next;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return '0 €';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function generateMrrChart(contrats) {
  const now = new Date();
  const months = [];
  for (let i = -5; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    let mrr = 0;
    contrats.forEach(c => {
      const deb = new Date(c.debut);
      const fin = new Date(c.fin);
      if (deb <= d && fin >= d) {
        mrr += mensualise(c.montantHt, c.recurrence);
      }
    });
    months.push({ label, mrr: Math.round(mrr) });
  }
  return months;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContractsPage({ isDark, couleur, showToast, user, clients = [], chantiers = [], setPage }) {
  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const pageBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  // State
  const [contrats, setContrats] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return DEMO_CONTRACTS;
  });
  const [search, setSearch] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [menuOpen, setMenuOpen] = useState(null);

  // Persist
  const persist = useCallback((data) => {
    setContrats(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, []);

  // Contrats with computed statut
  const contratsWithStatut = useMemo(() =>
    contrats.map(c => ({ ...c, statut: computeStatut(c) })),
    [contrats]
  );

  // Filter
  const filtered = useMemo(() => {
    let list = contratsWithStatut;
    if (filtre !== 'tous') list = list.filter(c => c.statut === filtre);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.clientName?.toLowerCase().includes(q) ||
        c.objet?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [contratsWithStatut, filtre, search]);

  // KPIs
  const kpis = useMemo(() => {
    const actifs = contratsWithStatut.filter(c => c.statut === 'actif');
    const aRenouveler = contratsWithStatut.filter(c => c.statut === 'a_renouveler');
    const expires = contratsWithStatut.filter(c => c.statut === 'expire');
    const mrr = actifs.reduce((sum, c) => sum + mensualise(c.montantHt, c.recurrence), 0);
    return { actifs: actifs.length, aRenouveler: aRenouveler.length, expires: expires.length, mrr };
  }, [contratsWithStatut]);

  // Chart data
  const chartData = useMemo(() => generateMrrChart(contrats), [contrats]);

  // Form handlers
  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (contrat) => {
    setForm({
      clientId: contrat.clientId || '',
      clientName: contrat.clientName || '',
      objet: contrat.objet || '',
      montantHt: contrat.montantHt ?? '',
      tva: contrat.tva ?? 20,
      recurrence: contrat.recurrence || 'annuel',
      debut: contrat.debut || '',
      fin: contrat.fin || '',
      autoRenouvellement: contrat.autoRenouvellement || false,
      conditions: contrat.conditions || '',
      chantierId: contrat.chantierId || '',
    });
    setEditingId(contrat.id);
    setShowForm(true);
    setMenuOpen(null);
  };

  const handleSave = () => {
    if (!form.objet.trim() || !form.montantHt || !form.debut || !form.fin) {
      showToast?.('Veuillez remplir les champs obligatoires', 'error');
      return;
    }
    // Resolve client name
    let clientName = form.clientName;
    if (form.clientId) {
      const cl = clients.find(c => c.id === form.clientId);
      if (cl) clientName = cl.nom || cl.name || `${cl.prenom || ''} ${cl.nom || ''}`.trim();
    }

    if (editingId) {
      const updated = contrats.map(c =>
        c.id === editingId ? { ...c, ...form, clientName, montantHt: Number(form.montantHt) } : c
      );
      persist(updated);
      showToast?.('Contrat modifié', 'success');
    } else {
      const newContrat = {
        ...form,
        id: `contrat-${Date.now()}`,
        clientName,
        montantHt: Number(form.montantHt),
      };
      persist([...contrats, newContrat]);
      showToast?.('Contrat créé', 'success');
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    persist(contrats.filter(c => c.id !== id));
    showToast?.('Contrat supprimé', 'success');
    setMenuOpen(null);
  };

  const updateField = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Auto-calc fin when debut + recurrence change
      if ((field === 'debut' || field === 'recurrence') && next.debut) {
        const rec = RECURRENCES.find(r => r.id === next.recurrence);
        if (rec) {
          const d = new Date(next.debut);
          d.setMonth(d.getMonth() + rec.mois);
          d.setDate(d.getDate() - 1);
          next.fin = d.toISOString().split('T')[0];
        }
      }
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={`min-h-full ${pageBg}`}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Contrats</h1>
            <p className={`text-sm ${textSecondary}`}>Gérez vos contrats de maintenance et la facturation récurrente</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-md hover:shadow-lg transition-all active:scale-95"
            style={{ background: couleur }}
          >
            <Plus size={16} />
            <span>Nouveau contrat</span>
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Actifs', value: kpis.actifs, icon: CheckCircle, color: '#22c55e' },
            { label: 'À renouveler', value: kpis.aRenouveler, icon: AlertTriangle, color: '#f59e0b' },
            { label: 'Expirés', value: kpis.expires, icon: Clock, color: '#ef4444' },
            { label: 'MRR', value: formatMoney(kpis.mrr), icon: TrendingUp, color: couleur, sub: `ARR ${formatMoney(kpis.mrr * 12)}` },
          ].map((kpi, i) => (
            <div key={i} className={`${cardBg} border rounded-xl p-3 sm:p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon size={16} style={{ color: kpi.color }} />
                <span className={`text-xs font-medium ${textMuted}`}>{kpi.label}</span>
              </div>
              <p className={`text-lg sm:text-xl font-bold ${textPrimary}`}>{kpi.value}</p>
              {kpi.sub && <p className={`text-xs ${textMuted} mt-0.5`}>{kpi.sub}</p>}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className={`${cardBg} border rounded-xl p-3 sm:p-5`}>
          <h2 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Revenus récurrents mensuels</h2>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={couleur} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={couleur} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} tickFormatter={v => `${v} €`} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? '#1e293b' : '#fff',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '0.5rem',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    fontSize: 12,
                  }}
                  formatter={(val) => [`${val} €/mois`, 'MRR']}
                />
                <Area type="monotone" dataKey="mrr" stroke={couleur} fill="url(#mrrGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un contrat..."
              className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
              style={{ '--tw-ring-color': couleur }}
            />
            {search && (
              <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:opacity-70`}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { id: 'tous', label: 'Tous' },
              { id: 'actif', label: 'Actifs' },
              { id: 'a_renouveler', label: 'À renouveler' },
              { id: 'expire', label: 'Expirés' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltre(f.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  filtre === f.id
                    ? 'text-white shadow-md'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
                style={filtre === f.id ? { background: couleur } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contracts list */}
        {filtered.length === 0 ? (
          <div className={`${cardBg} border rounded-xl p-8 text-center`}>
            <FileCheck size={40} className={`mx-auto mb-3 ${textMuted}`} />
            <p className={`font-medium ${textPrimary}`}>Aucun contrat</p>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {search || filtre !== 'tous' ? 'Modifiez vos filtres pour voir des résultats' : 'Créez votre premier contrat de maintenance'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(contrat => {
              const statutInfo = STATUTS[contrat.statut] || STATUTS.actif;
              const pct = progressPct(contrat.debut, contrat.fin);
              const nextDate = prochaineEcheance(contrat.debut, contrat.recurrence);
              const recLabel = RECURRENCES.find(r => r.id === contrat.recurrence)?.label || contrat.recurrence;
              const mensuel = mensualise(contrat.montantHt, contrat.recurrence);

              return (
                <div
                  key={contrat.id}
                  className={`${cardBg} border rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow relative group`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold truncate ${textPrimary}`}>{contrat.clientName}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: statutInfo.bg, color: statutInfo.color }}
                        >
                          {statutInfo.label}
                        </span>
                        {contrat.autoRenouvellement && (
                          <span className={`flex items-center gap-1 text-[10px] ${textMuted}`}>
                            <RefreshCw size={10} /> Auto
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${textSecondary}`}>{contrat.objet}</p>
                      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs ${textMuted}`}>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(contrat.debut)} → {formatDate(contrat.fin)}
                        </span>
                        {nextDate && contrat.statut !== 'expire' && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Prochaine : {formatDate(nextDate.toISOString())}
                          </span>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : couleur,
                            }}
                          />
                        </div>
                        <p className={`text-[10px] mt-0.5 ${textMuted}`}>{pct}% écoulé</p>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${textPrimary}`}>{formatMoney(contrat.montantHt)}</p>
                        <p className={`text-xs ${textMuted}`}>{recLabel} · {formatMoney(mensuel)}/mois</p>
                      </div>
                      {/* Actions */}
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === contrat.id ? null : contrat.id)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                        >
                          <MoreVertical size={16} className={textMuted} />
                        </button>
                        {menuOpen === contrat.id && (
                          <div className={`absolute right-0 top-full mt-1 z-20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl shadow-lg py-1 min-w-[140px]`}>
                            <button
                              onClick={() => openEdit(contrat)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                              <Edit2 size={14} /> Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(contrat.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl p-5 sm:p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-lg font-bold ${textPrimary}`}>
                {editingId ? 'Modifier le contrat' : 'Nouveau contrat'}
              </h2>
              <button onClick={() => setShowForm(false)} className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                <X size={18} className={textMuted} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Client */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Client *</label>
                {clients.length > 0 ? (
                  <select
                    value={form.clientId}
                    onChange={e => updateField('clientId', e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                    style={{ '--tw-ring-color': couleur }}
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nom || c.name || `${c.prenom || ''} ${c.nom || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={e => updateField('clientName', e.target.value)}
                    placeholder="Nom du client"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                    style={{ '--tw-ring-color': couleur }}
                  />
                )}
              </div>

              {/* Objet */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Objet du contrat *</label>
                <input
                  type="text"
                  value={form.objet}
                  onChange={e => updateField('objet', e.target.value)}
                  placeholder="Ex : Entretien chaudière annuel"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                  style={{ '--tw-ring-color': couleur }}
                />
              </div>

              {/* Montant + TVA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Montant HT *</label>
                  <input
                    type="number"
                    value={form.montantHt}
                    onChange={e => updateField('montantHt', e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                    style={{ '--tw-ring-color': couleur }}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>TVA</label>
                  <select
                    value={form.tva}
                    onChange={e => updateField('tva', Number(e.target.value))}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                    style={{ '--tw-ring-color': couleur }}
                  >
                    {TVA_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Récurrence</label>
                <div className="grid grid-cols-4 gap-2">
                  {RECURRENCES.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => updateField('recurrence', r.id)}
                      className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all ${
                        form.recurrence === r.id
                          ? 'text-white border-transparent shadow-md'
                          : `${isDark ? 'border-slate-600 text-slate-400 hover:border-slate-500' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`
                      }`}
                      style={form.recurrence === r.id ? { background: couleur } : {}}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Date de début *</label>
                  <input
                    type="date"
                    value={form.debut}
                    onChange={e => updateField('debut', e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                    style={{ '--tw-ring-color': couleur }}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Date de fin</label>
                  <input
                    type="date"
                    value={form.fin}
                    onChange={e => updateField('fin', e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                    style={{ '--tw-ring-color': couleur }}
                  />
                </div>
              </div>

              {/* Auto-renouvellement */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField('autoRenouvellement', !form.autoRenouvellement)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.autoRenouvellement ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
                  style={form.autoRenouvellement ? { background: couleur } : {}}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.autoRenouvellement ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className={`text-sm ${textSecondary}`}>Auto-renouvellement</span>
              </div>

              {/* Chantier lié */}
              {chantiers.length > 0 && (
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Chantier lié (optionnel)</label>
                  <select
                    value={form.chantierId}
                    onChange={e => updateField('chantierId', e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                    style={{ '--tw-ring-color': couleur }}
                  >
                    <option value="">Aucun</option>
                    {chantiers.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.nom || ch.name || ch.titre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditions */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Conditions</label>
                <textarea
                  value={form.conditions}
                  onChange={e => updateField('conditions', e.target.value)}
                  rows={3}
                  placeholder="Conditions du contrat, détails des interventions..."
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none ${inputBg} focus:outline-none focus:ring-2`}
                  style={{ '--tw-ring-color': couleur }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-md hover:shadow-lg transition-all active:scale-95"
                style={{ background: couleur }}
              >
                {editingId ? 'Enregistrer' : 'Créer le contrat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
}
