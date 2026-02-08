/**
 * OverviewWidget - Single unified widget showing key metrics from all pages
 *
 * Features:
 * - Visual cards with mini charts and progress indicators
 * - Click to navigate to each section
 * - Attractive design with gradients and animations
 *
 * @module OverviewWidget
 */

import * as React from 'react';
import {
  HardHat,
  Users,
  FileText,
  Package,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Euro,
  Percent,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';
import { useChantiers, useClients, useDevis, useEquipe, useData } from '../../context/DataContext';
import Widget, { WidgetHeader, WidgetContent } from './Widget';

/**
 * Format currency compact
 */
function formatMoney(amount) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M €`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k €`;
  return `${Math.round(amount)} €`;
}

/**
 * Mini progress bar
 */
function MiniProgress({ value, max, color, isDark }) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={cn(
      'h-1.5 rounded-full overflow-hidden',
      isDark ? 'bg-slate-600' : 'bg-gray-200'
    )}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}

/**
 * Mini donut chart
 */
function MiniDonut({ data, size = 48, thickness = 6 }) {
  if (!data || data.every(d => d.value === 0)) return null;

  const innerRadius = (size / 2) - thickness;
  const outerRadius = size / 2;

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Stat card with visual element
 */
function StatCard({
  icon: Icon,
  title,
  mainValue,
  mainLabel,
  secondaryValue,
  secondaryLabel,
  color,
  gradient,
  onClick,
  isDark,
  chart,
  progress,
  badge,
  trend,
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
        'border h-full flex flex-col',
        isDark
          ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
          : 'bg-white border-gray-200 hover:border-gray-300'
      )}
    >
      {/* Gradient accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: gradient || color }}
      />

      {/* Header - Fixed height */}
      <div className="flex items-start justify-between mb-3 min-h-[44px]">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={20} style={{ color }} className="flex-shrink-0" />
        </div>
        {badge && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: `${badge.color}15`,
              color: badge.color,
            }}
          >
            {badge.text}
          </span>
        )}
        {chart && (
          <div className="flex-shrink-0">
            {chart}
          </div>
        )}
      </div>

      {/* Title */}
      <p className={cn(
        'text-xs font-medium mb-1',
        isDark ? 'text-gray-400' : 'text-gray-500'
      )}>
        {title}
      </p>

      {/* Main value - flex-1 to push content down */}
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className={cn(
            'text-2xl font-bold',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {mainValue}
          </span>
          {mainLabel && (
            <span className={cn(
              'text-sm',
              isDark ? 'text-gray-500' : 'text-gray-500'
            )}>
              {mainLabel}
            </span>
          )}
          {trend !== undefined && trend !== null && (
            <span className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend >= 0 ? 'text-green-500' : 'text-red-500'
            )}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>

        {/* Secondary info */}
        {secondaryValue !== undefined && (
          <p className={cn(
            'text-sm',
            isDark ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="font-semibold" style={{ color }}>{secondaryValue}</span>
            {secondaryLabel && <span className="ml-1">{secondaryLabel}</span>}
          </p>
        )}
      </div>

      {/* Progress bar - always at bottom */}
      {progress && (
        <div className="mt-3 pt-2">
          <MiniProgress
            value={progress.value}
            max={progress.max}
            color={color}
            isDark={isDark}
          />
          {progress.label && (
            <p className={cn(
              'text-[10px] mt-1',
              isDark ? 'text-gray-500' : 'text-gray-500'
            )}>
              {progress.label}
            </p>
          )}
        </div>
      )}

      {/* Click indicator */}
      <div className={cn(
        'absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity',
        isDark ? 'text-gray-600' : 'text-gray-300'
      )}>
        <ChevronRight size={16} />
      </div>
    </button>
  );
}

/**
 * OverviewWidget Component
 */
export default function OverviewWidget({ setPage, isDark = false, className }) {
  const { chantiers = [] } = useChantiers();
  const { clients = [] } = useClients();
  const { devis = [] } = useDevis();
  const { equipe = [] } = useEquipe();
  const { events = [], catalogue = [], pointages = [] } = useData();

  // Calculate all stats
  const stats = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Chantiers
    const chantiersEnCours = chantiers.filter(c => c.statut === 'en_cours');
    const chantiersProspect = chantiers.filter(c => c.statut === 'prospect').length;
    const chantiersTermines = chantiers.filter(c => c.statut === 'termine').length;
    const totalChantiers = chantiers.length;

    // Budget total des chantiers en cours
    const budgetEnCours = chantiersEnCours.reduce((sum, c) => sum + (c.budget_estime || 0), 0);

    // Estimate remaining work days based on average chantier duration
    const avgDurationDays = 21; // Default 3 weeks
    const joursRestantsEstimes = chantiersEnCours.reduce((sum, c) => {
      if (c.date_fin_prevue) {
        const finPrevue = new Date(c.date_fin_prevue);
        const joursRestants = Math.max(0, Math.ceil((finPrevue - now) / (1000 * 60 * 60 * 24)));
        return sum + joursRestants;
      }
      // Si pas de date, estimer basé sur avancement
      const avancement = c.avancement || 0;
      const joursRestants = Math.round(avgDurationDays * (1 - avancement / 100));
      return sum + Math.max(0, joursRestants);
    }, 0);

    const chantierDonutData = [
      { value: chantiersEnCours.length, color: '#3b82f6', label: 'En cours' },
      { value: chantiersProspect, color: '#f59e0b', label: 'Prospect' },
      { value: chantiersTermines, color: '#10b981', label: 'Terminés' },
    ].filter(d => d.value > 0);

    // Clients
    const activeChantierClientIds = new Set(
      chantiersEnCours.map(c => c.client_id)
    );
    const clientsActifs = clients.filter(c => activeChantierClientIds.has(c.id)).length;

    // CA par client (top client)
    const clientRevenue = {};
    devis.forEach(d => {
      if (d.statut === 'accepte' || d.type === 'facture') {
        clientRevenue[d.client_id] = (clientRevenue[d.client_id] || 0) + (d.total_ht || 0);
      }
    });
    const topClientRevenue = Math.max(...Object.values(clientRevenue), 0);

    // Devis
    const devisOnly = devis.filter(d => d.type === 'devis');
    const factures = devis.filter(d => d.type === 'facture');

    const devisEnAttente = devisOnly.filter(d => ['envoye', 'vu'].includes(d.statut)).length;
    const montantEnAttente = devisOnly
      .filter(d => ['envoye', 'vu'].includes(d.statut))
      .reduce((sum, d) => sum + (d.total_ht || 0), 0);

    const devisBrouillon = devisOnly.filter(d => d.statut === 'brouillon').length;

    // Conversion rate
    const devisSent = devisOnly.filter(d => ['envoye', 'vu', 'accepte', 'refuse'].includes(d.statut)).length;
    const devisAcceptes = devisOnly.filter(d => d.statut === 'accepte').length;
    const tauxConversion = devisSent > 0 ? Math.round((devisAcceptes / devisSent) * 100) : 0;

    // Factures
    const facturesImpayees = factures.filter(f => f.statut !== 'payee');
    const montantImpaye = facturesImpayees.reduce((sum, f) => sum + (f.total_ttc || 0), 0);

    // Equipe - hours this week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const heuresThisWeek = pointages
      .filter(p => new Date(p.date) >= weekStart)
      .reduce((sum, p) => sum + (p.heures || 0), 0);

    const membresActifs = new Set(
      pointages
        .filter(p => new Date(p.date) >= weekStart)
        .map(p => p.employeId)
    ).size;

    // Équipe affectée aujourd'hui (basé sur pointages d'aujourd'hui ou planning)
    const membresAujourdHui = new Set(
      pointages
        .filter(p => {
          const pDate = new Date(p.date);
          return pDate.getFullYear() === today.getFullYear() &&
                 pDate.getMonth() === today.getMonth() &&
                 pDate.getDate() === today.getDate();
        })
        .map(p => p.employeId)
    ).size;

    // Planning - upcoming events this week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const upcomingEvents = events.filter(e => {
      const d = new Date(e.date);
      return d >= now && d <= weekEnd;
    }).length;

    // Catalogue - stock & margin
    const stockAlerts = catalogue.filter(
      item => item.stock !== undefined && item.seuilAlerte && item.stock < item.seuilAlerte
    ).length;

    const itemsWithMargin = catalogue.filter(p => p.prix && p.prixAchat);
    const avgMargin = itemsWithMargin.length > 0
      ? itemsWithMargin.reduce((sum, p) => sum + ((p.prix - p.prixAchat) / p.prix) * 100, 0) / itemsWithMargin.length
      : 0;

    // Determine margin health color
    const marginColor = avgMargin >= 40 ? '#10b981' // green - excellent
      : avgMargin >= 30 ? '#3b82f6' // blue - good
      : avgMargin >= 20 ? '#f59e0b' // amber - attention
      : '#ef4444'; // red - critical

    return {
      // Chantiers
      chantiersEnCours: chantiersEnCours.length,
      chantiersProspect,
      totalChantiers,
      budgetEnCours,
      joursRestantsEstimes,
      chantierDonutData,
      // Clients
      totalClients: clients.length,
      clientsActifs,
      topClientRevenue,
      // Devis
      devisEnAttente,
      devisBrouillon,
      montantEnAttente,
      tauxConversion,
      // Factures
      facturesImpayees: facturesImpayees.length,
      montantImpaye,
      // Equipe
      totalEquipe: equipe.length,
      heuresThisWeek,
      membresActifs,
      membresAujourdHui,
      membresDisponibles: equipe.length - membresAujourdHui,
      // Planning
      upcomingEvents,
      // Catalogue
      totalCatalogue: catalogue.length,
      stockAlerts,
      avgMargin: Math.round(avgMargin),
      marginColor,
    };
  }, [chantiers, clients, devis, equipe, events, catalogue, pointages]);

  return (
    <Widget isDark={isDark} className={cn('col-span-full', className)}>
      <WidgetHeader
        title="Vue d'ensemble"
        icon={<TrendingUp />}
        isDark={isDark}
      />

      <WidgetContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Chantiers */}
          <StatCard
            icon={HardHat}
            title="Chantiers"
            mainValue={stats.chantiersEnCours}
            mainLabel="en cours"
            secondaryValue={stats.budgetEnCours > 0
              ? `${formatMoney(stats.budgetEnCours)}`
              : stats.chantiersProspect
            }
            secondaryLabel={stats.budgetEnCours > 0
              ? 'de travaux en cours'
              : 'prospects'
            }
            color="#3b82f6"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            onClick={() => setPage?.('chantiers')}
            isDark={isDark}
            chart={stats.chantierDonutData.length > 0 && (
              <MiniDonut data={stats.chantierDonutData} size={44} thickness={5} />
            )}
            progress={stats.joursRestantsEstimes > 0 ? {
              value: stats.chantiersEnCours,
              max: stats.totalChantiers || 1,
              label: `~${stats.joursRestantsEstimes}j de travail restants`,
            } : undefined}
          />

          {/* Clients */}
          <StatCard
            icon={Users}
            title="Clients"
            mainValue={stats.totalClients}
            mainLabel="total"
            secondaryValue={stats.clientsActifs}
            secondaryLabel="actifs"
            color="#8b5cf6"
            gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
            onClick={() => setPage?.('clients')}
            isDark={isDark}
            badge={stats.clientsActifs > 0 ? {
              text: `${stats.clientsActifs} actifs`,
              color: '#10b981',
            } : undefined}
          />

          {/* Devis en attente */}
          <StatCard
            icon={FileText}
            title="Devis"
            mainValue={stats.devisEnAttente}
            mainLabel="en attente"
            secondaryValue={stats.montantEnAttente > 0 ? formatMoney(stats.montantEnAttente) : undefined}
            secondaryLabel="potentiel"
            color="#f59e0b"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            onClick={() => setPage?.('devis')}
            isDark={isDark}
            badge={stats.devisBrouillon > 0 ? {
              text: `${stats.devisBrouillon} brouillon${stats.devisBrouillon > 1 ? 's' : ''}`,
              color: '#6b7280',
            } : undefined}
          />

          {/* Taux de conversion */}
          <StatCard
            icon={Percent}
            title="Conversion"
            mainValue={`${stats.tauxConversion}%`}
            color={stats.tauxConversion >= 50 ? '#10b981' : stats.tauxConversion >= 30 ? '#f59e0b' : '#ef4444'}
            gradient={stats.tauxConversion >= 50
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : stats.tauxConversion >= 30
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            }
            onClick={() => setPage?.('devis')}
            isDark={isDark}
            progress={{
              value: stats.tauxConversion,
              max: 100,
              label: stats.tauxConversion >= 50 ? 'Excellent' : stats.tauxConversion >= 30 ? 'Bon' : 'À améliorer',
            }}
          />

          {/* Équipe */}
          <StatCard
            icon={UserCheck}
            title="Équipe"
            mainValue={stats.totalEquipe}
            mainLabel={stats.totalEquipe > 1 ? 'membres' : 'membre'}
            secondaryValue={stats.membresAujourdHui > 0
              ? `${stats.membresAujourdHui}`
              : stats.heuresThisWeek > 0 ? `${stats.heuresThisWeek}h` : undefined
            }
            secondaryLabel={stats.membresAujourdHui > 0
              ? `affecté${stats.membresAujourdHui > 1 ? 's' : ''} aujourd'hui`
              : 'cette semaine'
            }
            color="#06b6d4"
            gradient="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
            onClick={() => setPage?.('equipe')}
            isDark={isDark}
            badge={stats.membresDisponibles > 0 ? {
              text: `${stats.membresDisponibles} disponible${stats.membresDisponibles > 1 ? 's' : ''}`,
              color: '#10b981',
            } : stats.membresActifs > 0 ? {
              text: `${stats.membresActifs} actif${stats.membresActifs > 1 ? 's' : ''}`,
              color: '#10b981',
            } : undefined}
          />

          {/* Catalogue / Stock */}
          <StatCard
            icon={stats.stockAlerts > 0 ? AlertTriangle : Package}
            title={stats.stockAlerts > 0 ? 'Alerte Stock' : 'Catalogue'}
            mainValue={stats.stockAlerts > 0 ? stats.stockAlerts : stats.totalCatalogue}
            mainLabel={stats.stockAlerts > 0 ? 'articles' : 'articles'}
            secondaryValue={stats.avgMargin > 0 ? `${stats.avgMargin}%` : undefined}
            secondaryLabel="marge moyenne"
            color={stats.stockAlerts > 0 ? '#ef4444' : stats.marginColor}
            gradient={stats.stockAlerts > 0
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : stats.avgMargin >= 40 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : stats.avgMargin >= 30 ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
              : stats.avgMargin >= 20 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            }
            onClick={() => setPage?.('catalogue')}
            isDark={isDark}
            badge={stats.stockAlerts > 0 ? {
              text: 'Stock bas',
              color: '#ef4444',
            } : stats.avgMargin > 0 ? {
              text: stats.avgMargin >= 40 ? 'Excellent' : stats.avgMargin >= 30 ? 'Bon' : stats.avgMargin >= 20 ? 'Attention' : 'Critique',
              color: stats.marginColor,
            } : undefined}
          />
        </div>
      </WidgetContent>
    </Widget>
  );
}

/**
 * Skeleton
 */
export function OverviewWidgetSkeleton({ isDark = false }) {
  return (
    <Widget loading isDark={isDark} className="col-span-full">
      <WidgetHeader title="Vue d'ensemble" icon={<TrendingUp />} isDark={isDark} />
      <WidgetContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-32 rounded-2xl animate-pulse',
                isDark ? 'bg-slate-700' : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      </WidgetContent>
    </Widget>
  );
}
