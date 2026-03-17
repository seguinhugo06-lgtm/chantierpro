/**
 * GarantiesDashboard.jsx — Full-page dashboard for all warranties across all chantiers
 *
 * Shows KPI cards, filters, and warranty list grouped by chantier.
 * Sorted by expiration date ascending (soonest first).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Calendar,
  Filter,
  Search,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle,
  Building2,
  Loader2,
  X,
  Wrench,
} from 'lucide-react';
import supabase, { isDemo, auth } from '../../supabaseClient';
import { GARANTIE_TYPES, getGarantieProgress, getDashboardStats, getAll } from '../../services/garantieService';
import GarantieProgressBar from './GarantieProgressBar';

// ── Status badge config ────────────────────────────────────────────────────────

const STATUS_BADGES = {
  active: { label: 'Active', icon: '🟢', color: 'text-green-700 bg-green-50 border-green-200' },
  expireSoon: { label: 'Expire bientot', icon: '🟠', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  expiree: { label: 'Expiree', icon: '🔴', color: 'text-red-700 bg-red-50 border-red-200' },
  litige: { label: 'En litige', icon: '⚖️', color: 'text-purple-700 bg-purple-50 border-purple-200' },
};

function getWarrantyStatus(garantie) {
  if (garantie.statut === 'litige') return 'litige';
  if (garantie.statut === 'expiree') return 'expiree';
  const progress = getGarantieProgress(garantie);
  if (progress.daysRemaining <= 0) return 'expiree';
  if (progress.daysRemaining <= 90) return 'expireSoon';
  return 'active';
}

// ── KPI Card ────────────────────────────────────────────────────────────────────

function KPICard({ label, value, dot, alert, isDark }) {
  const isAlert = alert && value > 0;

  return (
    <div
      className={`
        rounded-2xl border p-4 transition-all
        ${isDark
          ? `bg-slate-800 border-slate-700 ${isAlert ? 'border-orange-500/50 shadow-orange-500/10 shadow-lg' : ''}`
          : `bg-white border-slate-200 ${isAlert ? 'border-orange-400 shadow-orange-100 shadow-lg' : ''}`
        }
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        {dot && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dot }}
          />
        )}
        {alert && <AlertTriangle className={`w-4 h-4 ${isAlert ? 'text-orange-500' : isDark ? 'text-slate-500' : 'text-slate-400'}`} />}
        <span className={`text-xs font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold ${isAlert ? 'text-orange-500' : isDark ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

// ── Warranty Card ───────────────────────────────────────────────────────────────

function WarrantyCard({ garantie, isDark, couleur, onViewDetail }) {
  const status = getWarrantyStatus(garantie);
  const badge = STATUS_BADGES[status];
  const typeInfo = GARANTIE_TYPES[garantie.typeGarantie];
  const progress = getGarantieProgress(garantie);

  // Count interventions (if available)
  const interventionCount = garantie.interventions?.length || 0;

  return (
    <div
      className={`
        rounded-xl border p-3 transition-all hover:shadow-sm
        ${isDark ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}
      `}
    >
      {/* Header: Type + Status Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: typeInfo?.color || '#6b7280' }}
          />
          <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {typeInfo?.label || garantie.typeGarantie}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.color}`}>
          {badge.icon} {badge.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <GarantieProgressBar
          dateDebut={garantie.dateDebut}
          dateFin={garantie.dateFin}
          statut={garantie.statut}
          size="compact"
          isDark={isDark}
        />
      </div>

      {/* Footer: Interventions + Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {interventionCount > 0 && (
            <span className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Wrench className="w-3 h-3" />
              {interventionCount} intervention{interventionCount > 1 ? 's' : ''}
            </span>
          )}
          <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {typeInfo?.duration}
          </span>
        </div>
        {onViewDetail && (
          <button
            onClick={() => onViewDetail(garantie)}
            className="inline-flex items-center gap-0.5 text-xs font-medium transition-colors"
            style={{ color: couleur || '#3b82f6' }}
          >
            Voir detail
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Chantier Group ──────────────────────────────────────────────────────────────

function ChantierGroup({ chantierNom, receptionDate, garanties, isDark, couleur, onViewDetail }) {
  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      {/* Chantier Header */}
      <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <Building2 className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <h3 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {chantierNom || 'Chantier sans nom'}
          </h3>
        </div>
        {receptionDate && (
          <div className="flex items-center gap-1.5 mt-1 ml-6">
            <Calendar className={`w-3 h-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Reception : {new Date(receptionDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* Warranty Cards */}
      <div className="p-3 space-y-2">
        {garanties.map((g) => (
          <WarrantyCard
            key={g.id}
            garantie={g}
            isDark={isDark}
            couleur={couleur}
            onViewDetail={onViewDetail}
          />
        ))}
      </div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────────

function EmptyState({ isDark }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <Shield className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
      </div>
      <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Aucune garantie
      </h3>
      <p className={`text-sm max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Les garanties sont automatiquement creees lors de la reception d'un chantier.
        Pour commencer : terminez un chantier, puis effectuez la reception.
        Les 3 garanties legales (parfait achevement, biennale, decennale) seront generees automatiquement.
      </p>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────────

export default function GarantiesDashboard({ isDark = false, couleur, showToast, user: userProp, chantiers = [] }) {
  const [stats, setStats] = useState(null);
  const [garanties, setGaranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedUser, setResolvedUser] = useState(userProp || null);
  const [filters, setFilters] = useState({
    type: '',        // '' | 'parfait_achevement' | 'biennale' | 'decennale'
    statut: '',      // '' | 'active' | 'expiree' | 'litige'
    search: '',
  });

  // Auto-resolve user from auth if not provided as prop
  useEffect(() => {
    if (userProp) { setResolvedUser(userProp); return; }
    if (isDemo) return;
    auth.getCurrentUser().then(u => { if (u) setResolvedUser(u); }).catch(() => {});
  }, [userProp]);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const userId = resolvedUser?.id || 'demo-user-id';
      const orgId = resolvedUser?.user_metadata?.organization_id || resolvedUser?.organization_id || 'demo-org-id';

      // Build filters for getAll
      const queryFilters = {};
      if (filters.type) queryFilters.typeGarantie = filters.type;
      if (filters.statut === 'active') queryFilters.statut = 'active';
      if (filters.statut === 'expiree') queryFilters.statut = 'expiree';
      if (filters.search) queryFilters.search = filters.search;

      const [statsResult, garantiesResult] = await Promise.all([
        getDashboardStats(supabase, { userId, orgId }),
        getAll(supabase, { userId, orgId, filters: queryFilters }),
      ]);

      setStats(statsResult);

      // Additional client-side filtering for 'litige' status
      let filtered = garantiesResult;
      if (filters.statut === 'litige') {
        filtered = filtered.filter((g) => g.statut === 'litige');
      }

      // Sort by expiration date ascending (soonest first)
      filtered.sort((a, b) => new Date(a.dateFin) - new Date(b.dateFin));

      setGaranties(filtered);
    } catch (err) {
      console.error('Error loading garanties dashboard:', err);
      if (showToast) showToast('Erreur lors du chargement des garanties', 'error');
    } finally {
      setLoading(false);
    }
  }, [resolvedUser, filters, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Group warranties by chantier ────────────────────────────────────────────

  const groupedByChantier = useMemo(() => {
    const groups = new Map();

    for (const g of garanties) {
      const key = g.chantierId || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, {
          chantierId: g.chantierId,
          chantierNom: g.chantierNom,
          receptionDate: g.dateDebut,
          garanties: [],
          earliestExpiry: g.dateFin,
        });
      }
      const group = groups.get(key);
      group.garanties.push(g);
      // Track the earliest expiry for sorting
      if (g.dateFin < group.earliestExpiry) {
        group.earliestExpiry = g.dateFin;
      }
    }

    // Sort groups by earliest expiry
    return Array.from(groups.values()).sort(
      (a, b) => new Date(a.earliestExpiry) - new Date(b.earliestExpiry)
    );
  }, [garanties]);

  // ── Filter handlers ─────────────────────────────────────────────────────────

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ type: '', statut: '', search: '' });
  };

  const hasActiveFilters = filters.type || filters.statut || filters.search;

  // ── Render ──────────────────────────────────────────────────────────────────

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const bgInput = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700';
  const bgPage = isDark ? 'bg-slate-900' : 'bg-slate-50';

  return (
    <div className={`min-h-screen ${bgPage}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
            <Shield className="w-7 h-7" style={{ color: couleur || '#3b82f6' }} />
            Garanties
          </h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            Suivi des garanties legales de vos chantiers
          </p>
        </div>

        {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPICard
              label="Total actives"
              value={stats.activesTotal}
              isDark={isDark}
            />
            <KPICard
              label="Parfait achevement"
              value={stats.parfaitAchevementCount}
              dot={GARANTIE_TYPES.parfait_achevement.color}
              isDark={isDark}
            />
            <KPICard
              label="Biennale"
              value={stats.biennaleCount}
              dot={GARANTIE_TYPES.biennale.color}
              isDark={isDark}
            />
            <KPICard
              label="Decennale"
              value={stats.decennaleCount}
              dot={GARANTIE_TYPES.decennale.color}
              isDark={isDark}
            />
            <KPICard
              label="Expirent < 90j"
              value={stats.expiring90j?.length || 0}
              alert
              isDark={isDark}
            />
          </div>
        )}

        {/* ── Filters ─────────────────────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Filter className={`w-4 h-4 flex-shrink-0 ${textSecondary}`} />

            {/* Type filter */}
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${bgInput} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
            >
              <option value="">Toutes les types</option>
              <option value="parfait_achevement">Parfait achevement</option>
              <option value="biennale">Biennale</option>
              <option value="decennale">Decennale</option>
            </select>

            {/* Status filter */}
            <select
              value={filters.statut}
              onChange={(e) => handleFilterChange('statut', e.target.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${bgInput} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="expiree">Expirees</option>
              <option value="litige">En litige</option>
            </select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input
                type="text"
                placeholder="Rechercher un chantier..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={`w-full rounded-lg border pl-9 pr-3 py-1.5 text-sm ${bgInput} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <X className="w-3 h-3" />
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* ── Warranty List ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: couleur || '#3b82f6' }} />
          </div>
        ) : groupedByChantier.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          <div className="space-y-4">
            {groupedByChantier.map((group) => (
              <ChantierGroup
                key={group.chantierId}
                chantierNom={group.chantierNom}
                receptionDate={group.receptionDate}
                garanties={group.garanties}
                isDark={isDark}
                couleur={couleur}
                onViewDetail={(g) => {
                  // Can be extended with navigation to detail page
                  if (showToast) showToast(`Detail: ${GARANTIE_TYPES[g.typeGarantie]?.label || g.typeGarantie}`, 'info');
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
