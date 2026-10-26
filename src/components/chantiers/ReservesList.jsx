/**
 * ReservesList.jsx — List and manage reserves at reception
 *
 * Displays reserves with priority badges, status tracking,
 * and ability to mark them as resolved.
 */

import React, { memo, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, MapPin, Camera, X, ChevronDown, ChevronUp } from 'lucide-react';
import { jourLocal, dateLue } from '../../lib/dates';

const PRIORITE_CONFIG = {
  mineure: { label: 'Mineure', color: 'bg-info-fond text-info-texte' },
  normale: { label: 'Normale', color: 'bg-alerte-fond text-alerte-texte' },
  majeure: { label: 'Majeure', color: 'bg-danger-fond text-danger-texte' },
};

const STATUT_CONFIG = {
  ouverte: { label: 'Ouverte', icon: AlertTriangle, color: 'text-danger-texte' },
  en_cours: { label: 'En cours', icon: Clock, color: 'text-alerte-texte' },
  levee: { label: 'Levée', icon: CheckCircle, color: 'text-succes-texte' },
};

const ReservesList = memo(function ReservesList({
  reserves = [],
  onUpdateReserve,
  onLeverToutes,
  readOnly = false,
  isDark: _isDark = false,
  couleur: _couleur,
}) {
  const [expanded, setExpanded] = useState({});

  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const cardBg = 'bg-fond border-bord';

  const totalCount = reserves.length;
  const leveesCount = reserves.filter(r => r.statut === 'levee').length;
  const allLevees = totalCount > 0 && leveesCount === totalCount;

  const handleLever = (reserve) => {
    if (onUpdateReserve) {
      onUpdateReserve(reserve.id, {
        statut: 'levee',
        dateLevee: jourLocal(),
      });
    }
  };

  const handleEnCours = (reserve) => {
    if (onUpdateReserve) {
      onUpdateReserve(reserve.id, { statut: 'en_cours' });
    }
  };

  if (reserves.length === 0) {
    return (
      <div className={`p-4 text-center rounded-xl bg-fond`}>
        <CheckCircle size={24} className="mx-auto mb-2 text-succes-texte" />
        <p className={`text-sm ${textMuted}`}>Aucune réserve</p>
      </div>
    );
  }

  return (
    <div>
      {/* Counter */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${textPrimary}`}>
            {leveesCount}/{totalCount} réserves levées
          </span>
          {allLevees && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-succes-fond text-succes-texte font-medium">
              ✅ Toutes levées
            </span>
          )}
        </div>
        {!readOnly && !allLevees && onLeverToutes && (
          <button
            onClick={onLeverToutes}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-accent text-sur-accent"
          >
            Lever toutes
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full mb-4 bg-bord">
        <div
          className="h-full rounded-full transition-all duration-500 bg-succes-point"
          style={{ width: `${(leveesCount / totalCount) * 100}%` }}
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {reserves.map((reserve, idx) => {
          const prioriteConfig = PRIORITE_CONFIG[reserve.priorite] || PRIORITE_CONFIG.normale;
          const statutConfig = STATUT_CONFIG[reserve.statut] || STATUT_CONFIG.ouverte;
          const StatutIcon = statutConfig.icon;
          const isExpanded = expanded[reserve.id];

          return (
            <div
              key={reserve.id || idx}
              className={`p-3 rounded-xl border ${cardBg} ${reserve.statut === 'levee' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <StatutIcon size={16} className={statutConfig.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-sm font-medium ${textPrimary} ${reserve.statut === 'levee' ? 'line-through' : ''}`}>
                      {idx + 1}. {reserve.description}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${prioriteConfig.color}`}>
                      {prioriteConfig.label}
                    </span>
                  </div>
                  {reserve.localisation && (
                    <p className={`text-xs ${textMuted} flex items-center gap-1`}>
                      <MapPin size={10} /> {reserve.localisation}
                    </p>
                  )}
                  {reserve.dateLevee && (
                    <p className="text-xs text-succes-texte mt-1">
                      Levée le {dateLue(reserve.dateLevee).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!readOnly && reserve.statut === 'ouverte' && (
                    <button
                      onClick={() => handleEnCours(reserve)}
                      className="text-xs px-2 py-1 rounded-lg bg-surface-2 text-encre-2 hover:bg-bord"
                      title="En cours"
                    >
                      <Clock size={12} />
                    </button>
                  )}
                  {!readOnly && reserve.statut !== 'levee' && (
                    <button
                      onClick={() => handleLever(reserve)}
                      className="text-xs px-2 py-1 rounded-lg bg-succes-fond text-succes-texte hover:brightness-95"
                      title="Lever la réserve"
                    >
                      <CheckCircle size={12} />
                    </button>
                  )}
                </div>
              </div>
              {reserve.notes && isExpanded && (
                <p className={`text-xs mt-2 pl-7 ${textMuted}`}>{reserve.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ReservesList;
