import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard, Landmark, Building2, TrendingUp, ArrowDownRight, ArrowUpRight,
  CheckCircle, XCircle, Clock, Loader2, RefreshCw, Filter, Search,
  AlertTriangle, Eye, EyeOff, RotateCcw, ExternalLink, BarChart3
} from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';
import { formatMoney } from '../../lib/formatters';
import {
  PAYMENT_STATUS, PAYMENT_PROVIDERS,
  centimesToEuros, formatCentimes,
  getPaymentMethodLabel, getProviderLabel,
} from '../../lib/paymentUtils';

/**
 * PaiementsTab — Finances > Paiements
 *
 * Tracks online payment transactions (Stripe, GoCardless)
 * Shows KPIs + filterable transaction list
 */

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'succeeded', label: 'Réussis' },
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En cours' },
  { value: 'failed', label: 'Échoués' },
  { value: 'refunded', label: 'Remboursés' },
];

const PROVIDER_FILTERS = [
  { value: 'all', label: 'Tous', icon: null },
  { value: 'stripe', label: 'Stripe', icon: CreditCard },
  { value: 'gocardless', label: 'GoCardless', icon: Landmark },
  { value: 'offline', label: 'Hors ligne', icon: Building2 },
];

export default function PaiementsTab({ devis = [], clients = [], isDark, couleur = '#F97316', setPage, modeDiscret }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';

  // Load transactions from Supabase
  const loadTransactions = useCallback(async () => {
    if (isDemo || !supabase) {
      setTransactions(getDemoTransactions());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Find client name from document
  const getDocInfo = useCallback((tx) => {
    const doc = devis.find(d => d.id === tx.document_id);
    const clientObj = doc ? clients.find(c => c.id === doc.client_id) : null;
    return {
      numero: doc?.numero || tx.document_numero || '—',
      clientName: clientObj?.nom || clientObj?.name || '—',
    };
  }, [devis, clients]);

  // Compute KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthTx = transactions.filter(t => new Date(t.created_at) >= startOfMonth);
    const succeeded = monthTx.filter(t => t.statut === 'succeeded');
    const pending = transactions.filter(t => ['pending', 'processing'].includes(t.statut));

    const totalEncaisse = succeeded.reduce((s, t) => s + (t.montant_net || centimesToEuros(t.montant_centimes || 0)), 0);
    const totalEnAttente = pending.reduce((s, t) => s + centimesToEuros(t.montant_centimes || 0), 0);
    const totalFrais = succeeded.reduce((s, t) => s + centimesToEuros(t.frais_centimes || 0), 0);

    // Conversion rate: all links created vs paid
    const totalLinks = transactions.length;
    const paidLinks = transactions.filter(t => t.statut === 'succeeded').length;
    const conversionRate = totalLinks > 0 ? Math.round((paidLinks / totalLinks) * 100) : 0;

    return { totalEncaisse, totalEnAttente, totalFrais, conversionRate, successCount: paidLinks };
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (statusFilter !== 'all' && tx.statut !== statusFilter) return false;
      if (providerFilter !== 'all' && tx.provider !== providerFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const info = getDocInfo(tx);
        const matches = (
          (info.numero || '').toLowerCase().includes(q) ||
          (info.clientName || '').toLowerCase().includes(q) ||
          (tx.provider_transaction_id || '').toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, providerFilter, searchQuery, getDocInfo]);

  const statusBadge = (statut) => {
    const cfg = PAYMENT_STATUS[statut] || PAYMENT_STATUS.pending;
    const colors = {
      amber: isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-700',
      blue: isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-700',
      green: isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
      red: isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-700',
      purple: isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[cfg.color] || colors.amber}`}>
        {cfg.label}
      </span>
    );
  };

  const providerBadge = (provider) => {
    const icons = { stripe: CreditCard, gocardless: Landmark, offline: Building2 };
    const Icon = icons[provider] || CreditCard;
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${textMuted}`}>
        <Icon size={12} />
        {getProviderLabel(provider)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: couleur }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<ArrowDownRight size={18} />}
          label="Encaissé (mois)"
          value={modeDiscret ? '•••' : formatMoney(kpis.totalEncaisse)}
          color="#10b981"
          isDark={isDark}
        />
        <KPICard
          icon={<Clock size={18} />}
          label="En attente"
          value={modeDiscret ? '•••' : formatMoney(kpis.totalEnAttente)}
          color="#f59e0b"
          isDark={isDark}
        />
        <KPICard
          icon={<BarChart3 size={18} />}
          label="Taux conversion"
          value={`${kpis.conversionRate}%`}
          subtitle={`${kpis.successCount} paiements`}
          color={couleur}
          isDark={isDark}
        />
        <KPICard
          icon={<ArrowUpRight size={18} />}
          label="Frais (mois)"
          value={modeDiscret ? '•••' : formatMoney(kpis.totalFrais)}
          color="#ef4444"
          isDark={isDark}
        />
      </div>

      {/* Filters */}
      <div className={`${cardBg} rounded-2xl border p-4`}>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par facture, client..."
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm ${inputBg}`}
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'text-white'
                    : isDark ? 'bg-slate-700 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
                style={statusFilter === opt.value ? { background: couleur } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={loadTransactions}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            title="Actualiser"
          >
            <RefreshCw size={16} className={textMuted} />
          </button>
        </div>

        {/* Provider filter */}
        <div className="flex gap-2 mt-3">
          {PROVIDER_FILTERS.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setProviderFilter(opt.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  providerFilter === opt.value
                    ? (isDark ? 'bg-slate-600 text-white' : 'bg-slate-800 text-white')
                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
                }`}
              >
                {Icon && <Icon size={12} />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction list */}
      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard size={40} className={`mx-auto mb-3 ${textMuted}`} />
            <p className={`font-medium ${textPrimary}`}>Aucune transaction</p>
            <p className={`text-sm mt-1 ${textMuted}`}>
              {transactions.length === 0
                ? 'Les paiements en ligne apparaîtront ici une fois configurés.'
                : 'Aucun résultat pour ces filtres.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            {/* Header row (desktop only) */}
            <div className={`hidden sm:grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs font-medium ${textMuted}`}>
              <span>Date / Facture</span>
              <span>Client</span>
              <span className="text-right">Montant</span>
              <span className="text-right">Frais</span>
              <span className="text-center">Provider</span>
              <span className="text-center">Statut</span>
            </div>

            {filteredTransactions.map(tx => {
              const info = getDocInfo(tx);
              const date = new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
              const montant = tx.montant_brut || centimesToEuros(tx.montant_centimes || 0);
              const frais = centimesToEuros(tx.frais_centimes || 0);
              const net = tx.montant_net || (montant - frais);

              return (
                <div
                  key={tx.id}
                  className={`px-5 py-3.5 transition-colors ${isDark ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}
                >
                  {/* Mobile layout */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${textPrimary}`}>{info.numero}</p>
                        <p className={`text-xs ${textMuted}`}>{date} — {info.clientName}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${textPrimary}`}>
                          {modeDiscret ? '•••' : formatMoney(montant)}
                        </p>
                        {statusBadge(tx.statut)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {providerBadge(tx.provider)}
                      {tx.payment_method && (
                        <span className={`text-xs ${textMuted}`}>
                          {getPaymentMethodLabel(tx.payment_method, tx.card_brand, tx.card_last4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 items-center">
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{info.numero}</p>
                      <p className={`text-xs ${textMuted}`}>{date}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${textPrimary}`}>{info.clientName}</p>
                      {tx.payment_method && (
                        <p className={`text-xs ${textMuted}`}>
                          {getPaymentMethodLabel(tx.payment_method, tx.card_brand, tx.card_last4)}
                        </p>
                      )}
                    </div>
                    <div className="text-right w-24">
                      <p className={`text-sm font-semibold ${textPrimary}`}>
                        {modeDiscret ? '•••' : formatMoney(montant)}
                      </p>
                      {modeDiscret ? null : (
                        <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Net: {formatMoney(net)}
                        </p>
                      )}
                    </div>
                    <div className="text-right w-16">
                      <p className={`text-xs ${textMuted}`}>
                        {modeDiscret ? '•••' : frais > 0 ? `-${formatMoney(frais)}` : '—'}
                      </p>
                    </div>
                    <div className="text-center w-24">
                      {providerBadge(tx.provider)}
                    </div>
                    <div className="text-center w-24">
                      {statusBadge(tx.statut)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** KPI Card Component */
function KPICard({ icon, label, value, subtitle, color, isDark }) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <p className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
      {subtitle && <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>}
    </div>
  );
}

/** Demo transactions for demo mode */
function getDemoTransactions() {
  return [
    {
      id: 'demo-1',
      provider: 'stripe',
      statut: 'succeeded',
      montant_centimes: 250000,
      frais_centimes: 400,
      montant_brut: 2500,
      montant_net: 2496,
      payment_method: 'card',
      card_brand: 'visa',
      card_last4: '4242',
      document_numero: 'FA-2025-001',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'demo-2',
      provider: 'gocardless',
      statut: 'processing',
      montant_centimes: 850000,
      frais_centimes: 220,
      montant_brut: 8500,
      montant_net: 8497.80,
      payment_method: 'sepa_debit',
      document_numero: 'FA-2025-002',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'demo-3',
      provider: 'stripe',
      statut: 'failed',
      montant_centimes: 120000,
      frais_centimes: 0,
      montant_brut: 1200,
      montant_net: 0,
      payment_method: 'card',
      card_brand: 'mastercard',
      card_last4: '5555',
      error_message: 'Carte refusée',
      document_numero: 'FA-2025-003',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ];
}
