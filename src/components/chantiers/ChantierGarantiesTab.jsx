/**
 * ChantierGarantiesTab.jsx — Garanties tab for chantier detail page
 *
 * Shows reception info, the 3 statutory warranty cards with progress bars,
 * and a history of SAV interventions.
 */

import React, { memo, useMemo } from 'react';
import {
  Shield,
  Calendar,
  FileText,
  AlertTriangle,
  Plus,
  Wrench,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { GARANTIE_TYPES } from '../../services/garantieService';
import GarantieProgressBar from './GarantieProgressBar';
import ReservesList from './ReservesList';

// ── Intervention status badges ────────────────────────────────────────────────

const STATUT_INTERVENTION = {
  signale: { label: 'Signale', color: 'bg-red-100 text-red-700', darkColor: 'bg-red-900/50 text-red-300', icon: AlertTriangle },
  planifie: { label: 'Planifie', color: 'bg-blue-100 text-blue-700', darkColor: 'bg-blue-900/50 text-blue-300', icon: Calendar },
  en_cours: { label: 'En cours', color: 'bg-orange-100 text-orange-700', darkColor: 'bg-orange-900/50 text-orange-300', icon: Clock },
  cloture: { label: 'Cloture', color: 'bg-green-100 text-green-700', darkColor: 'bg-green-900/50 text-green-300', icon: CheckCircle },
  refuse: { label: 'Refuse', color: 'bg-slate-100 text-slate-600', darkColor: 'bg-slate-700 text-slate-400', icon: XCircle },
};

const PRISE_EN_CHARGE = {
  garantie: { label: 'Sous garantie', color: 'bg-green-100 text-green-700', darkColor: 'bg-green-900/50 text-green-300' },
  hors_garantie: { label: 'Hors garantie', color: 'bg-red-100 text-red-700', darkColor: 'bg-red-900/50 text-red-300' },
  en_attente: { label: 'En attente', color: 'bg-slate-100 text-slate-600', darkColor: 'bg-slate-700 text-slate-400' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getGarantieStatut(garantie) {
  if (!garantie) return 'active';
  const now = new Date();
  const fin = new Date(garantie.dateFin);
  const diffDays = Math.ceil((fin - now) / 86400000);
  if (diffDays <= 0) return 'expiree';
  if (diffDays <= 90) return 'expire_bientot';
  return 'active';
}

const STATUT_BADGE = {
  active: { label: 'Active', emoji: '\ud83d\udfe2', color: 'bg-green-100 text-green-700', darkColor: 'bg-green-900/50 text-green-300' },
  expire_bientot: { label: 'Expire bientot', emoji: '\ud83d\udfe0', color: 'bg-orange-100 text-orange-700', darkColor: 'bg-orange-900/50 text-orange-300' },
  expiree: { label: 'Expiree', emoji: '\ud83d\udd34', color: 'bg-red-100 text-red-700', darkColor: 'bg-red-900/50 text-red-300' },
};

// ── Reception type display ────────────────────────────────────────────────────

const RECEPTION_TYPE_CONFIG = {
  sans_reserve: { label: 'Sans reserve', icon: '\u2705', color: 'text-green-600' },
  avec_reserves: { label: 'Avec reserves', icon: '\u26a0\ufe0f', color: 'text-orange-500' },
  refusee: { label: 'Refusee', icon: '\u274c', color: 'text-red-500' },
};

// ── Main component ────────────────────────────────────────────────────────────

const ChantierGarantiesTab = memo(function ChantierGarantiesTab({
  chantier,
  reception,
  garanties = [],
  interventions = [],
  onReceptionner,
  onSignalerDesordre,
  onUpdateReserve,
  onLeverToutesReserves,
  isDark = false,
  couleur = '#f97316',
  modeDiscret = false,
}) {
  const textPrimary = isDark ? 'text-slate-200' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const subBg = isDark ? 'bg-slate-700' : 'bg-slate-50';

  // Sort interventions by date DESC
  const sortedInterventions = useMemo(() => {
    return [...interventions].sort((a, b) => {
      const dateA = a.dateSignalement || a.createdAt || '';
      const dateB = b.dateSignalement || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [interventions]);

  // Count interventions per garantie
  const interventionsByGarantie = useMemo(() => {
    const map = {};
    interventions.forEach((interv) => {
      if (interv.garantieId) {
        map[interv.garantieId] = (map[interv.garantieId] || 0) + 1;
      }
    });
    return map;
  }, [interventions]);

  // Reserves from reception
  const reserves = reception?.reserves || [];

  return (
    <div className="space-y-6">
      {/* ── Section 1: Reception Info ──────────────────────────────────────── */}
      {reception ? (
        <ReceptionSection
          reception={reception}
          reserves={reserves}
          onUpdateReserve={onUpdateReserve}
          onLeverToutesReserves={onLeverToutesReserves}
          isDark={isDark}
          couleur={couleur}
          textPrimary={textPrimary}
          textMuted={textMuted}
          cardBg={cardBg}
          subBg={subBg}
        />
      ) : (
        <EmptyReceptionState
          onReceptionner={onReceptionner}
          isDark={isDark}
          couleur={couleur}
          textPrimary={textPrimary}
          textMuted={textMuted}
          cardBg={cardBg}
        />
      )}

      {/* ── Section 2: Warranty Cards ─────────────────────────────────────── */}
      {reception && garanties.length > 0 && (
        <div className="space-y-4">
          <h3 className={`text-base font-semibold flex items-center gap-2 ${textPrimary}`}>
            <Shield size={18} style={{ color: couleur }} />
            Garanties legales
          </h3>
          <div className="space-y-3">
            {['parfait_achevement', 'biennale', 'decennale'].map((typeKey) => {
              const garantie = garanties.find((g) => g.typeGarantie === typeKey);
              if (!garantie) return null;
              return (
                <GarantieCard
                  key={typeKey}
                  garantie={garantie}
                  typeKey={typeKey}
                  interventionCount={interventionsByGarantie[garantie.id] || 0}
                  onSignalerDesordre={onSignalerDesordre}
                  isDark={isDark}
                  couleur={couleur}
                  modeDiscret={modeDiscret}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                  cardBg={cardBg}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 3: Intervention History ───────────────────────────────── */}
      {reception && sortedInterventions.length > 0 && (
        <div className="space-y-3">
          <h3 className={`text-base font-semibold flex items-center gap-2 ${textPrimary}`}>
            <Wrench size={18} style={{ color: couleur }} />
            Historique des interventions
            <span className={`text-xs font-normal ${textMuted}`}>
              ({sortedInterventions.length})
            </span>
          </h3>
          <div className="space-y-2">
            {sortedInterventions.map((interv) => (
              <InterventionRow
                key={interv.id}
                intervention={interv}
                isDark={isDark}
                modeDiscret={modeDiscret}
                textPrimary={textPrimary}
                textMuted={textMuted}
                cardBg={cardBg}
              />
            ))}
          </div>
        </div>
      )}

      {reception && sortedInterventions.length === 0 && (
        <div className={`p-6 text-center rounded-xl border ${cardBg}`}>
          <Wrench size={24} className={`mx-auto mb-2 ${textMuted}`} />
          <p className={`text-sm ${textMuted}`}>Aucune intervention SAV</p>
        </div>
      )}
    </div>
  );
});

// ── Reception Section ─────────────────────────────────────────────────────────

function ReceptionSection({
  reception,
  reserves,
  onUpdateReserve,
  onLeverToutesReserves,
  isDark,
  couleur,
  textPrimary,
  textMuted,
  cardBg,
  subBg,
}) {
  const typeConfig = RECEPTION_TYPE_CONFIG[reception.typeReception] || RECEPTION_TYPE_CONFIG.sans_reserve;
  const leveesCount = reserves.filter((r) => r.statut === 'levee').length;

  return (
    <div className={`p-4 rounded-xl border ${cardBg}`}>
      <div className="flex items-center gap-2 mb-3">
        <FileText size={18} style={{ color: couleur }} />
        <h3 className={`text-base font-semibold ${textPrimary}`}>Reception</h3>
      </div>

      <div className={`p-3 rounded-lg ${subBg} space-y-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={14} className={textMuted} />
            <span className={`text-sm ${textPrimary}`}>
              {formatDate(reception.dateReception)}
            </span>
          </div>
          <span className={`text-sm font-medium ${typeConfig.color}`}>
            {typeConfig.icon} {typeConfig.label}
          </span>
        </div>

        {/* PV status */}
        <div className="flex items-center justify-between">
          <span className={`text-xs ${textMuted}`}>
            PV {reception.pvSigne ? 'signe' : 'non signe'}
          </span>
          {reception.pvSigneUrl && (
            <a
              href={reception.pvSigneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium flex items-center gap-1 hover:underline"
              style={{ color: couleur }}
            >
              Voir le PV <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Reserves (if avec_reserves) */}
      {reception.typeReception === 'avec_reserves' && reserves.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-orange-500" />
            <span className={`text-sm font-medium ${textPrimary}`}>
              Reserves ({leveesCount}/{reserves.length} levees)
            </span>
          </div>
          <ReservesList
            reserves={reserves}
            onUpdateReserve={onUpdateReserve}
            onLeverToutes={onLeverToutesReserves}
            isDark={isDark}
            couleur={couleur}
          />
        </div>
      )}
    </div>
  );
}

// ── Empty Reception State ─────────────────────────────────────────────────────

function EmptyReceptionState({ onReceptionner, isDark, couleur, textPrimary, textMuted, cardBg }) {
  return (
    <div className={`p-8 text-center rounded-xl border ${cardBg}`}>
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: `${couleur}15` }}
      >
        <FileText size={28} style={{ color: couleur }} />
      </div>
      <h3 className={`text-base font-semibold mb-1 ${textPrimary}`}>
        Chantier non receptionne
      </h3>
      <p className={`text-sm mb-4 ${textMuted}`}>
        Les garanties legales demarrent a la reception des travaux.
      </p>
      {onReceptionner && (
        <button
          onClick={onReceptionner}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: couleur }}
        >
          <FileText size={16} />
          Receptionner ce chantier
        </button>
      )}
    </div>
  );
}

// ── Warranty Card ─────────────────────────────────────────────────────────────

function GarantieCard({
  garantie,
  typeKey,
  interventionCount,
  onSignalerDesordre,
  isDark,
  couleur,
  modeDiscret,
  textPrimary,
  textMuted,
  cardBg,
}) {
  const typeMeta = GARANTIE_TYPES[typeKey];
  if (!typeMeta) return null;

  const statut = getGarantieStatut(garantie);
  const badge = STATUT_BADGE[statut];

  return (
    <div
      className={`rounded-xl border overflow-hidden ${cardBg}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: typeMeta.color }}
    >
      <div className="p-4">
        {/* Header: title + status badge */}
        <div className="flex items-center justify-between mb-3">
          <h4 className={`text-sm font-semibold ${textPrimary}`}>
            {typeMeta.label} ({typeMeta.duration})
          </h4>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isDark ? badge.darkColor : badge.color}`}
          >
            {badge.emoji} {badge.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <GarantieProgressBar
            dateDebut={garantie.dateDebut}
            dateFin={garantie.dateFin}
            statut={statut === 'expiree' ? 'expiree' : 'active'}
            size="full"
            isDark={isDark}
          />
        </div>

        {/* Description */}
        {!modeDiscret && (
          <p className={`text-xs mb-3 ${textMuted}`}>
            {typeMeta.description}
          </p>
        )}

        {/* Decennale extras: assureur + police */}
        {typeKey === 'decennale' && (garantie.assureur || garantie.numeroPolice) && (
          <div
            className={`text-xs p-2 rounded-lg mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}
          >
            {garantie.assureur && (
              <p className={textPrimary}>
                <span className={textMuted}>Assureur :</span> {garantie.assureur}
              </p>
            )}
            {garantie.numeroPolice && (
              <p className={`${textPrimary} mt-0.5`}>
                <span className={textMuted}>N° police :</span> {garantie.numeroPolice}
              </p>
            )}
          </div>
        )}

        {/* Footer: intervention count + signal button */}
        <div className="flex items-center justify-between">
          <span className={`text-xs ${textMuted} flex items-center gap-1`}>
            <Wrench size={12} />
            {interventionCount} intervention{interventionCount !== 1 ? 's' : ''}
          </span>
          {statut !== 'expiree' && onSignalerDesordre && (
            <button
              onClick={() => onSignalerDesordre(garantie)}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              style={{ background: typeMeta.color }}
            >
              <Plus size={12} />
              Signaler un desordre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Intervention Row ──────────────────────────────────────────────────────────

function InterventionRow({
  intervention,
  isDark,
  modeDiscret,
  textPrimary,
  textMuted,
  cardBg,
}) {
  const statutConfig = STATUT_INTERVENTION[intervention.statut] || STATUT_INTERVENTION.signale;
  const StatutIcon = statutConfig.icon;

  const priseConfig = intervention.priseEnCharge
    ? PRISE_EN_CHARGE[intervention.priseEnCharge] || PRISE_EN_CHARGE.en_attente
    : null;

  return (
    <div className={`p-3 rounded-xl border ${cardBg}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <StatutIcon size={16} className={statutConfig.color.split(' ').pop()} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-sm font-medium ${textPrimary}`}>
              {modeDiscret
                ? (intervention.typeDesordre || 'Intervention')
                : (intervention.titre || intervention.typeDesordre || 'Intervention')}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? statutConfig.darkColor : statutConfig.color}`}
            >
              {statutConfig.label}
            </span>
            {priseConfig && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? priseConfig.darkColor : priseConfig.color}`}
              >
                {priseConfig.label}
              </span>
            )}
          </div>

          <div className={`flex items-center gap-3 text-xs ${textMuted}`}>
            {intervention.dateSignalement && (
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                {formatDate(intervention.dateSignalement)}
              </span>
            )}
            {intervention.typeDesordre && !modeDiscret && intervention.titre && (
              <span>{intervention.typeDesordre}</span>
            )}
          </div>

          {!modeDiscret && intervention.description && (
            <p className={`text-xs mt-1 ${textMuted} line-clamp-2`}>
              {intervention.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChantierGarantiesTab;
