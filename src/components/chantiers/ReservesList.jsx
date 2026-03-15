/**
 * ReservesList.jsx — List and manage reserves at reception
 *
 * Displays reserves with priority badges, status tracking,
 * and ability to mark them as resolved.
 */

import React, { memo, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, MapPin, Camera, X, ChevronDown, ChevronUp } from 'lucide-react';

const PRIORITE_CONFIG = {
  mineure: { label: 'Mineure', color: 'bg-blue-100 text-blue-700', darkColor: 'bg-blue-900/50 text-blue-300' },
  normale: { label: 'Normale', color: 'bg-orange-100 text-orange-700', darkColor: 'bg-orange-900/50 text-orange-300' },
  majeure: { label: 'Majeure', color: 'bg-red-100 text-red-700', darkColor: 'bg-red-900/50 text-red-300' },
};

const STATUT_CONFIG = {
  ouverte: { label: 'Ouverte', icon: AlertTriangle, color: 'text-red-500' },
  en_cours: { label: 'En cours', icon: Clock, color: 'text-orange-500' },
  levee: { label: 'Levée', icon: CheckCircle, color: 'text-green-500' },
};

const ReservesList = memo(function ReservesList({
  reserves = [],
  onUpdateReserve,
  onLeverToutes,
  readOnly = false,
  isDark = false,
  couleur = '#f97316',
}) {
  const [expanded, setExpanded] = useState({});

  const textPrimary = isDark ? 'text-slate-200' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200';

  const totalCount = reserves.length;
  const leveesCount = reserves.filter(r => r.statut === 'levee').length;
  const allLevees = totalCount > 0 && leveesCount === totalCount;

  const handleLever = (reserve) => {
    if (onUpdateReserve) {
      onUpdateReserve(reserve.id, {
        statut: 'levee',
        dateLevee: new Date().toISOString().split('T')[0],
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
      <div className={`p-4 text-center rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
        <CheckCircle size={24} className={`mx-auto mb-2 text-green-500`} />
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
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              ✅ Toutes levées
            </span>
          )}
        </div>
        {!readOnly && !allLevees && onLeverToutes && (
          <button
            onClick={onLeverToutes}
            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
            style={{ background: couleur }}
          >
            Lever toutes
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className={`w-full h-2 rounded-full mb-4 ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
        <div
          className="h-full rounded-full transition-all duration-500 bg-green-500"
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? prioriteConfig.darkColor : prioriteConfig.color}`}>
                      {prioriteConfig.label}
                    </span>
                  </div>
                  {reserve.localisation && (
                    <p className={`text-xs ${textMuted} flex items-center gap-1`}>
                      <MapPin size={10} /> {reserve.localisation}
                    </p>
                  )}
                  {reserve.dateLevee && (
                    <p className={`text-xs text-green-500 mt-1`}>
                      Levée le {new Date(reserve.dateLevee).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!readOnly && reserve.statut === 'ouverte' && (
                    <button
                      onClick={() => handleEnCours(reserve)}
                      className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                      title="En cours"
                    >
                      <Clock size={12} />
                    </button>
                  )}
                  {!readOnly && reserve.statut !== 'levee' && (
                    <button
                      onClick={() => handleLever(reserve)}
                      className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
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
