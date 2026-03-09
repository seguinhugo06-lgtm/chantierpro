/**
 * ProfilePage — Company identity, stats & usage
 *
 * 2 sections:
 * 1. Hero — company identity, completeness, insurance alerts
 * 2. Stats — KPIs, recent activity, plan usage
 *
 * Plan management is in PlanPage.jsx
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2, FileText, Users, Package, Shield,
  AlertTriangle, ChevronRight, Euro, TrendingUp,
  Sparkles, MapPin, Phone, Mail, Hash, Award,
  Settings, Zap, Hammer,
} from 'lucide-react';
import { useSubscriptionStore, PLANS } from '../../stores/subscriptionStore';
import { formatMoney, formatMoneyCompact } from '../../lib/formatters';

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgba(hex, alpha) {
  const n = parseInt((hex || '#f97316').replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function computeCompleteness(e) {
  const fields = [
    { k: 'nom', w: 1 }, { k: 'adresse', w: 1 }, { k: 'tel', w: 1 },
    { k: 'email', w: 1 }, { k: 'siret', w: 1 }, { k: 'formeJuridique', w: 0.5 },
    { k: 'codeApe', w: 0.5 }, { k: 'tvaIntra', w: 0.5 }, { k: 'logo', w: 0.5 },
    { k: 'rcProAssureur', w: 0.7 }, { k: 'rcProNumero', w: 0.7 },
    { k: 'decennaleAssureur', w: 0.7 }, { k: 'decennaleNumero', w: 0.7 },
    { k: 'iban', w: 0.3 },
  ];
  const total = fields.reduce((s, f) => s + f.w, 0);
  const filled = fields.reduce((s, f) => s + (e?.[f.k] && String(e[f.k]).trim() ? f.w : 0), 0);
  return Math.round((filled / total) * 100);
}

/** Animated counter hook */
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const startTime = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/** Stat card with animated value */
function StatCard({ icon: Icon, label, value, suffix, color, isDark, delay = 0, modeDiscret }) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md animate-fade-slide-up ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: hexToRgba(color, 0.12) }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {modeDiscret ? '•••' : value}{!modeDiscret && suffix ? <span className="text-sm font-medium ml-0.5">{suffix}</span> : null}
      </p>
    </div>
  );
}

/** Usage bar row */
function UsageRow({ icon: Icon, label, count, limit, couleur, isDark }) {
  const isUnlimited = limit === -1;
  const ratio = isUnlimited ? 0 : (limit > 0 ? Math.min(count / limit, 1) : 0);
  const pct = Math.round(ratio * 100);
  const isDanger = !isUnlimited && ratio >= 0.8;
  const barColor = isDanger ? '#ef4444' : couleur;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: isDanger ? '#ef4444' : couleur }} />
          <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
        </div>
        {isUnlimited ? (
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {count} <span className="text-green-500">∞</span>
          </span>
        ) : (
          <span className={`text-xs font-semibold tabular-nums ${isDanger ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {count}/{limit}
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  );
}

const PLAN_ICONS = { gratuit: Zap, artisan: Hammer, equipe: Users };

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ProfilePage({
  user, entreprise = {}, devis = [], clients = [], chantiers = [],
  catalogue = [],
  isDark, couleur = '#f97316', setPage, modeDiscret,
}) {
  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Subscription store (read-only for usage display)
  const planId = useSubscriptionStore(s => s.planId);
  const plan = PLANS[planId] || PLANS.gratuit;

  // ─── Computed data ────────────────────────────────────────────────────────

  const completeness = useMemo(() => computeCompleteness(entreprise), [entreprise]);

  const stats = useMemo(() => {
    const revenueStatuses = ['accepte', 'signe', 'facture', 'payee', 'acompte_facture'];
    const caTotal = devis
      .filter(d => revenueStatuses.includes(d.statut))
      .reduce((sum, d) => sum + (d.total_ttc || 0), 0);

    const devisEnCours = devis.filter(d =>
      d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)
    ).length;

    const decided = devis.filter(d =>
      d.type === 'devis' && ['envoye', 'vu', 'accepte', 'signe', 'refuse'].includes(d.statut)
    );
    const won = devis.filter(d =>
      d.type === 'devis' && ['accepte', 'signe', 'facture', 'payee', 'acompte_facture'].includes(d.statut)
    ).length;
    const tauxConversion = decided.length > 0 ? Math.round((won / decided.length) * 100) : 0;

    const clientsActifs = clients.filter(c => c.status !== 'inactif').length;
    const chantiersEnCours = chantiers.filter(c => c.statut === 'en_cours').length;

    const allDevisWithAmount = devis.filter(d => d.type === 'devis' && d.total_ttc > 0);
    const montantMoyen = allDevisWithAmount.length > 0
      ? allDevisWithAmount.reduce((s, d) => s + d.total_ttc, 0) / allDevisWithAmount.length
      : 0;

    return { caTotal, devisEnCours, tauxConversion, clientsActifs, chantiersEnCours, montantMoyen };
  }, [devis, clients, chantiers]);

  // Animated values
  const animCA = useCountUp(stats.caTotal, 1000);
  const animConv = useCountUp(stats.tauxConversion, 800);
  const animDevis = useCountUp(stats.devisEnCours, 600);
  const animClients = useCountUp(stats.clientsActifs, 700);
  const animChantiers = useCountUp(stats.chantiersEnCours, 700);
  const animMoyen = useCountUp(stats.montantMoyen, 900);

  const recentActivity = useMemo(() => {
    const statusLabels = {
      brouillon: 'Brouillon', envoye: 'Envoyé', vu: 'Consulté',
      accepte: 'Accepté', signe: 'Signé', refuse: 'Refusé',
      facture: 'Facturé', payee: 'Payé', acompte_facture: 'Acompte',
    };
    const statusColors = {
      accepte: '#22c55e', signe: '#22c55e', payee: '#22c55e',
      refuse: '#ef4444', envoye: '#3b82f6', vu: '#8b5cf6',
      brouillon: '#6b7280', facture: '#f97316', acompte_facture: '#f97316',
    };

    return devis
      .filter(d => d.date)
      .sort((a, b) => new Date(b.updatedAt || b.date) - new Date(a.updatedAt || a.date))
      .slice(0, 5)
      .map(d => {
        const client = clients.find(c => c.id === d.client_id);
        return {
          id: d.id,
          label: statusLabels[d.statut] || d.statut,
          detail: client ? `${client.prenom || ''} ${client.nom}`.trim() : d.numero || '',
          date: d.updatedAt || d.date,
          color: statusColors[d.statut] || '#6b7280',
          amount: d.total_ttc,
          type: d.type,
        };
      });
  }, [devis, clients]);

  const iaCount = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('cp_ia_analyses') || '[]').length; } catch { return 0; }
  }, []);

  const usageItems = useMemo(() => [
    { icon: FileText, label: 'Devis', count: devis.filter(d => d.type === 'devis').length, limit: plan.limits.devis },
    { icon: Users, label: 'Clients', count: clients.length, limit: plan.limits.clients },
    { icon: Building2, label: 'Chantiers', count: chantiers.length, limit: plan.limits.chantiers },
    { icon: Sparkles, label: 'IA', count: iaCount, limit: plan.limits.ia_analyses },
    { icon: Package, label: 'Catalogue', count: catalogue.length, limit: plan.limits.catalogue },
  ], [devis, clients, chantiers, iaCount, catalogue, plan]);

  // Insurance alerts
  const insuranceAlerts = useMemo(() => {
    const alerts = [];
    const now = new Date();
    const soonMs = 30 * 86400000;

    if (entreprise.rcProValidite) {
      const d = new Date(entreprise.rcProValidite);
      if (d < now) alerts.push({ type: 'expired', label: 'RC Pro expirée', date: d });
      else if (d - now < soonMs) alerts.push({ type: 'soon', label: 'RC Pro expire bientôt', date: d });
    }
    if (entreprise.decennaleValidite) {
      const d = new Date(entreprise.decennaleValidite);
      if (d < now) alerts.push({ type: 'expired', label: 'Décennale expirée', date: d });
      else if (d - now < soonMs) alerts.push({ type: 'soon', label: 'Décennale expire bientôt', date: d });
    }
    return alerts;
  }, [entreprise]);

  // Derived
  const initials = (entreprise.nom || 'BG').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return 'Il y a quelques minutes';
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>

      {/* ═══════════════════ SECTION 1: HERO ═══════════════════ */}
      <section className="relative overflow-hidden px-4 sm:px-6 pt-6 pb-8 sm:pt-10 sm:pb-10">
        {/* Gradient background */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hexToRgba(couleur, 0.06)}, transparent 70%)` }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl" style={{ background: hexToRgba(couleur, 0.08) }} />

        <div className="relative max-w-4xl mx-auto">
          {/* Profile header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6 animate-fade-slide-up">
            {/* Avatar */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl flex-shrink-0 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)` }}
            >
              {entreprise.logo
                ? <img src={entreprise.logo} alt="" className="w-full h-full object-cover" />
                : initials
              }
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1 min-w-0">
              <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${textPrimary}`}>
                {entreprise.nom || 'Mon Entreprise'}
              </h1>
              <p className={`text-sm mb-3 ${textMuted}`}>{user?.email || ''}</p>

              {/* Plan badge + completeness */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  onClick={() => setPage('plan')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: plan.color }}
                >
                  {React.createElement(PLAN_ICONS[planId] || Zap, { size: 12 })}
                  {plan.name}
                </button>

                {/* Completeness */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  completeness >= 80
                    ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                    : completeness >= 50
                      ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-700'
                      : isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-700'
                }`}>
                  {completeness >= 80 ? '✅' : completeness >= 50 ? '⚠️' : '❌'} Profil {completeness}%
                </span>
              </div>
            </div>
          </div>

          {/* Company info tags */}
          <div className={`rounded-xl border p-4 sm:p-5 animate-fade-slide-up ${cardBg}`} style={{ animationDelay: '100ms' }}>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {entreprise.siret && (
                <span className={`flex items-center gap-1.5 ${textMuted}`}>
                  <Hash size={13} /> {entreprise.siret}
                </span>
              )}
              {entreprise.tel && (
                <span className={`flex items-center gap-1.5 ${textMuted}`}>
                  <Phone size={13} /> {entreprise.tel}
                </span>
              )}
              {entreprise.email && (
                <span className={`flex items-center gap-1.5 ${textMuted}`}>
                  <Mail size={13} /> {entreprise.email}
                </span>
              )}
              {entreprise.adresse && (
                <span className={`flex items-center gap-1.5 ${textMuted}`}>
                  <MapPin size={13} /> {entreprise.adresse.split('\n')[0]}
                </span>
              )}
            </div>

            {/* Assurances summary */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
              {entreprise.decennaleAssureur ? (
                <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Shield size={12} /> Décennale ✓
                </span>
              ) : (
                <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                  <Shield size={12} /> Décennale manquante
                </span>
              )}
              {entreprise.rcProAssureur ? (
                <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Shield size={12} /> RC Pro ✓
                </span>
              ) : (
                <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                  <Shield size={12} /> RC Pro manquante
                </span>
              )}
              {Array.isArray(entreprise.labels) && entreprise.labels.filter(l => l.actif).map((l, i) => (
                <span key={i} className={`flex items-center gap-1 text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  <Award size={12} /> {l.nom} ✓
                </span>
              ))}
            </div>

            {/* Edit link */}
            <button
              onClick={() => setPage('settings')}
              className={`mt-3 text-xs font-medium flex items-center gap-1 transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Settings size={12} /> Modifier dans Paramètres <ChevronRight size={12} />
            </button>
          </div>

          {/* Insurance alerts */}
          {insuranceAlerts.length > 0 && (
            <div className="mt-4 space-y-2 animate-fade-slide-up" style={{ animationDelay: '200ms' }}>
              {insuranceAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    alert.type === 'expired'
                      ? isDark ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'
                      : isDark ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <AlertTriangle size={16} />
                  <span>{alert.label} — {alert.date.toLocaleDateString('fr-FR')}</span>
                  <button
                    onClick={() => setPage('settings')}
                    className="ml-auto text-xs underline opacity-70 hover:opacity-100"
                  >
                    Mettre à jour
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════ SECTION 2: STATS ═══════════════════ */}
      <section className="px-4 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto">
        <h2 className={`text-lg font-bold mb-5 ${textPrimary}`}>Mes statistiques</h2>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
          <StatCard icon={Euro} label="CA Total" value={modeDiscret ? null : formatMoneyCompact(animCA)} color="#22c55e" isDark={isDark} delay={0} modeDiscret={modeDiscret} />
          <StatCard icon={FileText} label="Devis en cours" value={String(animDevis)} color="#3b82f6" isDark={isDark} delay={80} modeDiscret={false} />
          <StatCard icon={TrendingUp} label="Taux conversion" value={String(animConv)} suffix="%" color="#8b5cf6" isDark={isDark} delay={160} modeDiscret={false} />
          <StatCard icon={Users} label="Clients actifs" value={String(animClients)} color="#f97316" isDark={isDark} delay={240} modeDiscret={false} />
          <StatCard icon={Building2} label="Chantiers actifs" value={String(animChantiers)} color="#06b6d4" isDark={isDark} delay={320} modeDiscret={false} />
          <StatCard icon={Euro} label="Devis moyen" value={modeDiscret ? null : formatMoneyCompact(animMoyen)} color="#eab308" isDark={isDark} delay={400} modeDiscret={modeDiscret} />
        </div>

        {/* Activity + Usage side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* Recent activity */}
          <div className={`rounded-xl border p-4 sm:p-5 animate-fade-slide-up ${cardBg}`} style={{ animationDelay: '300ms' }}>
            <h3 className={`text-sm font-semibold mb-4 ${textPrimary}`}>Activité récente</h3>
            {recentActivity.length === 0 ? (
              <p className={`text-sm ${textMuted}`}>Aucune activité pour le moment</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item, i) => (
                  <div key={item.id || i} className="flex items-start gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: item.color }} />
                      {i < recentActivity.length - 1 && (
                        <div className={`w-px flex-1 mt-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} style={{ minHeight: '20px' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium truncate ${textPrimary}`}>
                          {item.label}
                        </span>
                        <span className={`text-[11px] flex-shrink-0 ${textMuted}`}>{fmtDate(item.date)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${textMuted}`}>{item.detail}</span>
                        {item.amount > 0 && !modeDiscret && (
                          <span className={`text-xs font-medium flex-shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {formatMoney(item.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage gauges */}
          <div className={`rounded-xl border p-4 sm:p-5 animate-fade-slide-up ${cardBg}`} style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${textPrimary}`}>Utilisation du plan</h3>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: plan.color }}
              >
                {plan.name}
              </span>
            </div>
            <div className="space-y-4">
              {usageItems.map((item, i) => (
                <UsageRow key={i} {...item} couleur={couleur} isDark={isDark} />
              ))}
            </div>

            {/* Link to plan page */}
            <button
              onClick={() => setPage('plan')}
              className="mt-4 w-full text-xs font-medium flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors"
              style={{ color: couleur }}
            >
              Voir mon plan <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════ ANIMATIONS ═══════════════════ */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-slide-up {
          animation: fadeSlideUp 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
