/**
 * WeatherAlertsWidget Component
 * Dashboard widget displaying weather alerts and rescheduling suggestions
 *
 * @module WeatherAlertsWidget
 */

import { useState, useEffect, useCallback } from 'react';
import {
  checkWeatherImpact,
  rescheduleChantier,
  notifyWeatherAlert,
} from '../../lib/weatherAlerts';

/**
 * @typedef {Object} WeatherAlert
 * @property {Object} chantier - Affected chantier
 * @property {Object} weather - Weather conditions
 * @property {Object} impact - Impact assessment
 * @property {Object} suggestion - Rescheduling suggestion
 */

/**
 * Get impact level style classes
 * @param {'critical' | 'high' | 'medium' | 'low'} level - Impact level
 * @returns {Object} Style classes
 */
function getImpactStyles(level) {
  const styles = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-800',
      icon: '🔴',
      label: 'CRITIQUE',
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-800',
      icon: '🟠',
      label: 'ÉLEVÉ',
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: '🟡',
      label: 'MOYEN',
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800',
      icon: '🔵',
      label: 'FAIBLE',
    },
  };
  return styles[level] || styles.medium;
}

/**
 * Get weather icon based on conditions
 * @param {Object} weather - Weather data
 * @returns {string} Weather emoji
 */
function getWeatherIcon(weather) {
  if (!weather) return '🌤️';

  const main = weather.main?.toLowerCase() || '';
  const description = weather.description?.toLowerCase() || '';

  if (main.includes('thunder') || description.includes('orage')) return '⛈️';
  if (main.includes('rain') || description.includes('pluie')) return '🌧️';
  if (main.includes('snow') || description.includes('neige')) return '🌨️';
  if (main.includes('cloud') || description.includes('nuage')) return '☁️';
  if (main.includes('wind') || description.includes('vent')) return '💨';
  if (main.includes('fog') || description.includes('brouillard')) return '🌫️';
  if (main.includes('clear') || description.includes('dégagé')) return '☀️';

  return '🌤️';
}

/**
 * Format date in French
 * @param {string | Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  const d = new Date(date);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const day = days[d.getDay()];
  const dayNum = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day} ${dayNum}/${month}`;
}

/**
 * AlertCard Component
 * @param {Object} props
 * @param {WeatherAlert} props.alert - Weather alert data
 * @param {Function} props.onReschedule - Reschedule handler
 * @param {Function} props.onIgnore - Ignore handler
 * @param {Function} props.onContinue - Continue with precautions handler
 * @param {boolean} props.loading - Loading state
 */
function AlertCard({ alert, onReschedule, onIgnore, onContinue, loading }) {
  const { chantier, weather, impact, suggestion } = alert;
  const styles = getImpactStyles(impact?.level || 'medium');
  const weatherIcon = getWeatherIcon(weather);

  const weatherDetails = [];
  if (weather?.pop) {
    weatherDetails.push(`Pluie ${Math.round(weather.pop * 100)}%`);
  }
  if (weather?.wind_speed) {
    weatherDetails.push(`Vent ${Math.round(weather.wind_speed * 3.6)}km/h`);
  }
  if (weather?.temp) {
    weatherDetails.push(`${Math.round(weather.temp)}°C`);
  }

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 mb-3`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{styles.icon}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${styles.badge}`}>
            {styles.label}
          </span>
          <span className="text-sm text-gray-600">
            {formatDate(chantier.date_debut)}
          </span>
        </div>
      </div>

      {/* Chantier info */}
      <div className="mb-2">
        <p className="font-medium text-gray-900">{chantier.nom}</p>
        {chantier.client_nom && (
          <p className="text-sm text-gray-500">
            Client: {chantier.client_prenom} {chantier.client_nom}
          </p>
        )}
      </div>

      {/* Weather info */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-700">
        <span className="text-lg">{weatherIcon}</span>
        <span>{weather?.description || 'Conditions défavorables'}</span>
        {weatherDetails.length > 0 && (
          <span className="text-gray-500">({weatherDetails.join(' • ')})</span>
        )}
      </div>

      {/* Suggestion */}
      {suggestion && suggestion.alternativeDates?.length > 0 && (
        <div className="mb-3 p-2 bg-white bg-opacity-50 rounded">
          <p className="text-sm font-medium text-gray-700 mb-1">
            💡 Actions suggérées :
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            {suggestion.alternativeDates.slice(0, 2).map((alt, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span>•</span>
                <span>
                  Reporter au {formatDate(alt.date)} ({getWeatherIcon(alt.weather)}{' '}
                  {alt.weather?.temp ? `${Math.round(alt.weather.temp)}°` : ''})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {suggestion?.alternativeDates?.[0] && (
          <button
            onClick={() => onReschedule(alert, suggestion.alternativeDates[0].date)}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'En cours...' : 'Reporter automatiquement'}
          </button>
        )}
        <button
          onClick={() => onContinue(alert)}
          disabled={loading}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 disabled:opacity-50"
        >
          Continuer avec précautions
        </button>
        <button
          onClick={() => onIgnore(alert)}
          disabled={loading}
          className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700 disabled:opacity-50"
        >
          Ignorer
        </button>
      </div>
    </div>
  );
}

/**
 * WeatherAlertsWidget Component
 * @param {Object} props
 * @param {string} props.userId - Current user ID
 * @param {number} [props.daysAhead=7] - Days to look ahead
 * @param {Function} [props.onRefreshCalendar] - Callback to refresh calendar
 */
export default function WeatherAlertsWidget({ userId, daysAhead = 7, onRefreshCalendar }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  // Fetch weather alerts
  const fetchAlerts = useCallback(async () => {
    if (!userId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await checkWeatherImpact(userId, daysAhead);
      // Filter out low impact and dismissed alerts
      const filteredAlerts = result.filter(
        (alert) =>
          alert.impact?.level !== 'low' && !dismissedAlerts.has(alert.chantier?.id)
      );
      setAlerts(filteredAlerts);
    } catch (err) {
      console.error('WeatherAlertsWidget: Error fetching alerts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, daysAhead, dismissedAlerts]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchAlerts();
    // Refresh every 30 minutes
    const interval = setInterval(fetchAlerts, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Handle reschedule
  const handleReschedule = async (alert, newDate) => {
    setActionLoading(true);
    try {
      await rescheduleChantier(alert.chantier.id, newDate, userId);

      // Notify about the reschedule
      await notifyWeatherAlert(
        { ...alert, rescheduledTo: newDate },
        userId,
        { sendEmail: true }
      );

      // Remove from list
      setAlerts((prev) => prev.filter((a) => a.chantier.id !== alert.chantier.id));

      // Refresh calendar if callback provided
      if (onRefreshCalendar) {
        onRefreshCalendar();
      }
    } catch (err) {
      console.error('WeatherAlertsWidget: Error rescheduling:', err);
      setError(`Erreur lors du report: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle ignore
  const handleIgnore = (alert) => {
    setDismissedAlerts((prev) => new Set([...prev, alert.chantier.id]));
    setAlerts((prev) => prev.filter((a) => a.chantier.id !== alert.chantier.id));
  };

  // Handle continue with precautions
  const handleContinue = async (alert) => {
    setActionLoading(true);
    try {
      // Just notify about the decision
      await notifyWeatherAlert(
        { ...alert, decision: 'continue_with_precautions' },
        userId,
        { sendEmail: true }
      );

      // Remove from list
      setAlerts((prev) => prev.filter((a) => a.chantier.id !== alert.chantier.id));
    } catch (err) {
      console.error('WeatherAlertsWidget: Error notifying:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Sort alerts by impact level
  const sortedAlerts = [...alerts].sort((a, b) => {
    const levels = { critical: 0, high: 1, medium: 2, low: 3 };
    return (levels[a.impact?.level] || 3) - (levels[b.impact?.level] || 3);
  });

  // Count by level
  const criticalCount = alerts.filter((a) => a.impact?.level === 'critical').length;
  const highCount = alerts.filter((a) => a.impact?.level === 'high').length;

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-32 bg-gray-100 rounded"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">⛈️</span>
          <h3 className="text-lg font-semibold text-gray-900">Alertes Météo</h3>
          {alerts.length > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Actualiser"
        >
          <svg
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Summary badges */}
      {alerts.length > 0 && (criticalCount > 0 || highCount > 0) && (
        <div className="flex gap-2 mb-4">
          {criticalCount > 0 && (
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
              🔴 {criticalCount} critique{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          {highCount > 0 && (
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
              🟠 {highCount} élevé{highCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Alerts list */}
      {sortedAlerts.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedAlerts.map((alert) => (
            <AlertCard
              key={alert.chantier.id}
              alert={alert}
              onReschedule={handleReschedule}
              onIgnore={handleIgnore}
              onContinue={handleContinue}
              loading={actionLoading}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">☀️</span>
          <p className="text-gray-500">Aucune alerte météo</p>
          <p className="text-sm text-gray-400">
            Tous vos chantiers ont des conditions météo favorables pour les {daysAhead}{' '}
            prochains jours.
          </p>
        </div>
      )}

      {/* Footer info */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
        Données Météo-France • Mise à jour toutes les 30 min • Prévisions sur {daysAhead} jours
      </div>
    </div>
  );
}

/**
 * Compact weather alerts for sidebar/header
 * @param {Object} props
 * @param {string} props.userId - Current user ID
 * @param {Function} [props.onClick] - Click handler
 */
export function WeatherAlertsBadge({ userId, onClick }) {
  const [count, setCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchCount = async () => {
      try {
        const alerts = await checkWeatherImpact(userId, 7);
        const significant = alerts.filter(
          (a) => a.impact?.level === 'critical' || a.impact?.level === 'high'
        );
        setCount(significant.length);
        setCriticalCount(alerts.filter((a) => a.impact?.level === 'critical').length);
      } catch (err) {
        console.error('WeatherAlertsBadge: Error:', err);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg ${
        criticalCount > 0
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
      }`}
      title={`${count} alerte${count > 1 ? 's' : ''} météo`}
    >
      <span className="text-lg">⛈️</span>
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
        {count}
      </span>
    </button>
  );
}
