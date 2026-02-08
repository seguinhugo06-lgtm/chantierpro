import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  TrendingUp, FileText, Target, Wallet,
  ArrowLeft, Users, HardHat, CreditCard
} from 'lucide-react';

const formatEUR = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

const formatCompact = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value || 0);

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

const DEVIS_STATUS_COLORS = {
  brouillon: '#94a3b8',
  envoye: '#3b82f6',
  vu: '#8b5cf6',
  accepte: '#22c55e',
  signe: '#16a34a',
  refuse: '#ef4444',
  expire: '#f97316',
  payee: '#0ea5e9',
};

const DEVIS_STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoye: 'Envoy\u00e9',
  vu: 'Vu',
  accepte: 'Accept\u00e9',
  signe: 'Sign\u00e9',
  refuse: 'Refus\u00e9',
  expire: 'Expir\u00e9',
  payee: 'Pay\u00e9e',
};

const CHANTIER_STATUS_COLORS = {
  en_cours: '#3b82f6',
  termine: '#22c55e',
  en_attente: '#f59e0b',
};

const CHANTIER_STATUS_LABELS = {
  en_cours: 'En cours',
  termine: 'Termin\u00e9',
  en_attente: 'En attente',
};

export default function AnalyticsPage({ devis = [], clients = [], chantiers = [], depenses = [], equipe = [], paiements = [], isDark, couleur, setPage }) {

  // ─── KPI Computations ───────────────────────────────────────────────
  const kpis = useMemo(() => {
    const acceptedStatuts = ['accepte', 'signe', 'payee'];
    const devisAcceptes = devis.filter(d => acceptedStatuts.includes(d.statut));
    const ca = devisAcceptes.reduce((sum, d) => sum + (Number(d.total_ttc) || 0), 0);

    const devisEnAttente = devis.filter(d => d.statut === 'envoye' || d.statut === 'vu').length;

    const totalDevis = devis.length;
    const signedCount = devis.filter(d => acceptedStatuts.includes(d.statut)).length;
    const tauxConversion = totalDevis > 0 ? ((signedCount / totalDevis) * 100) : 0;

    const totalDepenses = depenses.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
    const margeBrute = ca - totalDepenses;

    return { ca, devisEnAttente, tauxConversion, margeBrute, totalDepenses };
  }, [devis, depenses]);

  // ─── Monthly Revenue (current year) ─────────────────────────────────
  const monthlyRevenue = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => ({ mois: MONTHS[i], montant: 0 }));

    devis
      .filter(d => {
        const validStatut = d.statut === 'payee' || d.statut === 'accepte' || d.statut === 'signe';
        const validType = d.type === 'facture';
        return validStatut && validType;
      })
      .forEach(d => {
        if (!d.date) return;
        const date = new Date(d.date);
        if (date.getFullYear() === currentYear) {
          months[date.getMonth()].montant += Number(d.total_ttc) || 0;
        }
      });

    return months;
  }, [devis]);

  // ─── Top 5 Clients by CA ───────────────────────────────────────────
  const topClients = useMemo(() => {
    const acceptedStatuts = ['accepte', 'signe', 'payee'];
    const clientMap = {};

    devis
      .filter(d => acceptedStatuts.includes(d.statut))
      .forEach(d => {
        const cid = d.client_id;
        if (!cid) return;
        if (!clientMap[cid]) clientMap[cid] = 0;
        clientMap[cid] += Number(d.total_ttc) || 0;
      });

    return Object.entries(clientMap)
      .map(([clientId, montant]) => {
        const client = clients.find(c => String(c.id) === String(clientId));
        const nom = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : `Client #${clientId}`;
        return { nom, montant };
      })
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 5);
  }, [devis, clients]);

  const topClientMax = topClients.length > 0 ? topClients[0].montant : 1;

  // ─── Devis by Status ───────────────────────────────────────────────
  const devisParStatut = useMemo(() => {
    const counts = {};
    devis.forEach(d => {
      const s = d.statut || 'brouillon';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([statut, count]) => ({
      name: DEVIS_STATUS_LABELS[statut] || statut,
      value: count,
      color: DEVIS_STATUS_COLORS[statut] || '#94a3b8',
    }));
  }, [devis]);

  // ─── Chantiers by Status ───────────────────────────────────────────
  const chantiersParStatut = useMemo(() => {
    const counts = {};
    chantiers.forEach(c => {
      const s = c.statut || 'en_attente';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([statut, count]) => ({
      name: CHANTIER_STATUS_LABELS[statut] || statut,
      value: count,
      color: CHANTIER_STATUS_COLORS[statut] || '#94a3b8',
    }));
  }, [chantiers]);

  const totalChantiers = chantiers.length;

  // ─── Cash Flow ─────────────────────────────────────────────────────
  const cashFlow = useMemo(() => {
    const totalPaiements = paiements.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalDep = depenses.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
    return { totalPaiements, totalDep, solde: totalPaiements - totalDep };
  }, [paiements, depenses]);

  const cashFlowMax = Math.max(cashFlow.totalPaiements, cashFlow.totalDep, 1);

  // ─── Style helpers ─────────────────────────────────────────────────
  const cardClass = `rounded-xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPage = isDark ? 'bg-slate-900' : 'bg-slate-50';

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className={`rounded-lg border px-3 py-2 shadow-lg text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
        <p className="font-medium">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {formatEUR(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0];
    return (
      <div className={`rounded-lg border px-3 py-2 shadow-lg text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
        <p style={{ color: d.payload.color }} className="font-medium">{d.name}</p>
        <p>{d.value}</p>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bgPage} p-4 md:p-6 space-y-6`}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPage('accueil')}
          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Tableau de bord analytique</h1>
          <p className={`text-sm ${textSecondary}`}>Vue d'ensemble de la performance</p>
        </div>
      </div>

      {/* ────── KPI Cards ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${textSecondary}`}>Chiffre d'affaires</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${couleur}20` }}>
              <TrendingUp size={18} style={{ color: couleur }} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{formatEUR(kpis.ca)}</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>Devis accept{'\u00e9'}s / sign{'\u00e9'}s TTC</p>
        </div>

        {/* Devis en attente */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${textSecondary}`}>Devis en attente</span>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText size={18} className="text-blue-500" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{kpis.devisEnAttente}</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>Envoy{'\u00e9'}s ou vus</p>
        </div>

        {/* Taux de conversion */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${textSecondary}`}>Taux de conversion</span>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Target size={18} className="text-green-500" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{kpis.tauxConversion.toFixed(1)}%</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>Devis sign{'\u00e9'}s / total</p>
        </div>

        {/* Marge brute */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${textSecondary}`}>Marge brute</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: kpis.margeBrute >= 0 ? '#22c55e20' : '#ef444420' }}>
              <Wallet size={18} style={{ color: kpis.margeBrute >= 0 ? '#22c55e' : '#ef4444' }} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${kpis.margeBrute >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatEUR(kpis.margeBrute)}
          </p>
          <p className={`text-xs mt-1 ${textSecondary}`}>CA - D{'\u00e9'}penses</p>
        </div>
      </div>

      {/* ────── Monthly Revenue + Top Clients ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly Revenue Chart */}
        <div className={`${cardClass} lg:col-span-2`}>
          <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>Chiffre d'affaires mensuel</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis
                  dataKey="mois"
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="montant" name="CA" fill={couleur} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Clients */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} style={{ color: couleur }} />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Top 5 clients</h2>
          </div>
          {topClients.length === 0 ? (
            <p className={`text-sm ${textSecondary}`}>Aucune donn{'\u00e9'}e disponible</p>
          ) : (
            <div className="space-y-3">
              {topClients.map((client, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium truncate mr-2 ${textPrimary}`}>{client.nom}</span>
                    <span className={`text-sm font-semibold whitespace-nowrap ${textSecondary}`}>{formatEUR(client.montant)}</span>
                  </div>
                  <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(client.montant / topClientMax) * 100}%`,
                        backgroundColor: couleur,
                        opacity: 1 - idx * 0.15,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ────── Devis Status + Chantiers Status ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Devis by Status */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} style={{ color: couleur }} />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Devis par statut</h2>
          </div>
          {devisParStatut.length === 0 ? (
            <p className={`text-sm ${textSecondary}`}>Aucun devis</p>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={devisParStatut}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {devisParStatut.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {devisParStatut.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className={`text-sm ${textSecondary}`}>
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chantiers by Status */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <HardHat size={18} style={{ color: couleur }} />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Chantiers par statut</h2>
          </div>
          {chantiersParStatut.length === 0 ? (
            <p className={`text-sm ${textSecondary}`}>Aucun chantier</p>
          ) : (
            <div className="space-y-4">
              {chantiersParStatut.map((entry, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className={`text-sm font-medium ${textPrimary}`}>{entry.name}</span>
                    </div>
                    <span className={`text-sm font-semibold ${textSecondary}`}>
                      {entry.value} {entry.value > 1 ? 'chantiers' : 'chantier'}
                    </span>
                  </div>
                  <div className={`h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: totalChantiers > 0 ? `${(entry.value / totalChantiers) * 100}%` : '0%',
                        backgroundColor: entry.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className={`text-xs ${textSecondary} pt-1`}>
                Total : {totalChantiers} chantier{totalChantiers > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ────── Cash Flow ────── */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={18} style={{ color: couleur }} />
          <h2 className={`text-lg font-semibold ${textPrimary}`}>Flux de tr{'\u00e9'}sorerie</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Paiements received */}
          <div>
            <p className={`text-sm mb-2 ${textSecondary}`}>Paiements re{'\u00e7'}us</p>
            <p className={`text-xl font-bold text-green-500 mb-2`}>{formatEUR(cashFlow.totalPaiements)}</p>
            <div className={`h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className="h-3 rounded-full bg-green-500 transition-all"
                style={{ width: `${(cashFlow.totalPaiements / cashFlowMax) * 100}%` }}
              />
            </div>
          </div>

          {/* Depenses */}
          <div>
            <p className={`text-sm mb-2 ${textSecondary}`}>D{'\u00e9'}penses totales</p>
            <p className={`text-xl font-bold text-red-500 mb-2`}>{formatEUR(cashFlow.totalDep)}</p>
            <div className={`h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className="h-3 rounded-full bg-red-500 transition-all"
                style={{ width: `${(cashFlow.totalDep / cashFlowMax) * 100}%` }}
              />
            </div>
          </div>

          {/* Solde */}
          <div>
            <p className={`text-sm mb-2 ${textSecondary}`}>Solde net</p>
            <p className={`text-xl font-bold mb-2 ${cashFlow.solde >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatEUR(cashFlow.solde)}
            </p>
            <div className={`h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className={`h-3 rounded-full transition-all ${cashFlow.solde >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.abs(cashFlow.solde) / cashFlowMax * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
