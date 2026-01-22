import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle, CheckCircle, Loader2, ChevronRight } from 'lucide-react';
import useGeofencing, { formatDistance } from '../hooks/useGeofencing';

/**
 * LocationIndicator - Shows current location status relative to chantiers
 *
 * Features:
 * - Permission request button
 * - Current location display
 * - Nearby chantier detection
 * - Check-in suggestion when at a chantier
 */
export default function LocationIndicator({
  chantiers = [],
  onCheckIn,
  onSelectChantier,
  isDark = false,
  couleur = '#f97316',
  compact = false
}) {
  const [showDetails, setShowDetails] = useState(false);

  const {
    currentLocation,
    permissionStatus,
    error,
    nearbyChantiers,
    currentChantier,
    isAtChantier,
    requestPermission,
    lastUpdate
  } = useGeofencing(chantiers, {
    radius: 100,
    enabled: true,
    onEnterChantier: (chantier) => {
      console.log('Entered chantier:', chantier.nom);
    },
    onExitChantier: (chantier) => {
      console.log('Exited chantier:', chantier.nom);
    }
  });

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Permission not granted
  if (permissionStatus === 'denied' || permissionStatus === 'prompt' || permissionStatus === 'unknown') {
    if (compact) {
      return (
        <button
          onClick={requestPermission}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <MapPin size={14} />
          Activer la localisation
        </button>
      );
    }

    return (
      <div className={`p-4 rounded-xl border ${borderColor} ${cardBg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <MapPin size={20} className={textMuted} />
          </div>
          <div className="flex-1">
            <p className={`font-medium ${textPrimary}`}>Localisation desactivee</p>
            <p className={`text-sm ${textMuted}`}>
              {permissionStatus === 'denied'
                ? 'Permission refusee. Activez-la dans les parametres.'
                : 'Activez pour detecter automatiquement vos chantiers'
              }
            </p>
          </div>
          {permissionStatus !== 'denied' && (
            <button
              onClick={requestPermission}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: couleur }}
            >
              Activer
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading/waiting for location
  if (!currentLocation) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-sm">
          <Loader2 size={14} className="animate-spin" style={{ color: couleur }} />
          <span className={textMuted}>Localisation...</span>
        </div>
      );
    }

    return (
      <div className={`p-4 rounded-xl border ${borderColor} ${cardBg}`}>
        <div className="flex items-center gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: couleur }} />
          <span className={textMuted}>Recherche de votre position...</span>
        </div>
      </div>
    );
  }

  // At a chantier - show check-in suggestion
  if (isAtChantier && currentChantier) {
    if (compact) {
      return (
        <button
          onClick={() => onCheckIn?.(currentChantier)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#10b981' }}
        >
          <CheckCircle size={14} />
          <span className="truncate max-w-[150px]">{currentChantier.nom}</span>
        </button>
      );
    }

    return (
      <div className={`p-4 rounded-xl border-2 ${isDark ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20">
            <CheckCircle size={20} className="text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              Vous etes sur un chantier
            </p>
            <p className={`font-semibold truncate ${textPrimary}`}>{currentChantier.nom}</p>
            <p className={`text-sm ${textMuted}`}>{currentChantier.adresse?.substring(0, 40)}</p>
          </div>
          <button
            onClick={() => onCheckIn?.(currentChantier)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
            style={{ backgroundColor: couleur }}
          >
            Pointer
          </button>
        </div>
      </div>
    );
  }

  // Not at a chantier - show nearby chantiers
  const top3Nearby = nearbyChantiers.slice(0, 3);

  if (compact) {
    if (top3Nearby.length > 0) {
      return (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Navigation size={14} style={{ color: couleur }} />
          <span className="truncate max-w-[100px]">{top3Nearby[0].nom}</span>
          <span className={textMuted}>{formatDistance(top3Nearby[0].distance)}</span>
        </button>
      );
    }
    return null;
  }

  return (
    <div className={`rounded-xl border ${borderColor} ${cardBg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <Navigation size={20} style={{ color: couleur }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${textPrimary}`}>
            {top3Nearby.length > 0
              ? `${top3Nearby.length} chantier${top3Nearby.length > 1 ? 's' : ''} a proximite`
              : 'Aucun chantier a proximite'
            }
          </p>
          {top3Nearby.length > 0 && (
            <p className={`text-sm ${textMuted}`}>
              Le plus proche: {top3Nearby[0].nom} ({formatDistance(top3Nearby[0].distance)})
            </p>
          )}
        </div>
        <ChevronRight size={18} className={`${textMuted} transition-transform ${showDetails ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded list */}
      {showDetails && top3Nearby.length > 0 && (
        <div className={`border-t ${borderColor}`}>
          {top3Nearby.map((chantier, idx) => (
            <button
              key={chantier.id}
              onClick={() => onSelectChantier?.(chantier.id)}
              className={`w-full p-3 flex items-center gap-3 text-left transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} ${idx < top3Nearby.length - 1 ? `border-b ${borderColor}` : ''}`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${couleur}20` }}
              >
                <MapPin size={14} style={{ color: couleur }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${textPrimary}`}>{chantier.nom}</p>
                <p className={`text-xs truncate ${textMuted}`}>{chantier.adresse?.substring(0, 35)}</p>
              </div>
              <span className={`text-sm ${textMuted}`}>
                {formatDistance(chantier.distance)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Last update timestamp */}
      {lastUpdate && (
        <div className={`px-4 py-2 text-xs ${textMuted} border-t ${borderColor}`}>
          Mise a jour: {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}
