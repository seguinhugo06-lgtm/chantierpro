import * as React from 'react';

import {
  HardHat,
  MapPin,
  Camera,
  Navigation,
  Calendar,
  RefreshCw,
  Plus,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Thermometer,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useChantiers, useClients } from '../../context/DataContext';
import { CHANTIER_STATUS } from '../../lib/constants';
import { Button, IconButton } from '../ui/Button';
import Widget, {
  WidgetHeader,
  WidgetContent,
  WidgetFooter,
  WidgetEmptyState,
  WidgetMenuButton,
  WidgetLink,
} from './Widget';
import supabase, { isDemo } from '../../supabaseClient';

/**
 * @typedef {Object} ChantiersWidgetProps
 * @property {string} [userId] - User ID for filtering
 * @property {string} [className] - Additional CSS classes
 */

// Weather cache key prefix
const WEATHER_CACHE_PREFIX = 'chantierpro_weather_';
const WEATHER_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Status configurations
const statusConfig = {
  prospect: {
    color: 'bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'Prévu',
    icon: Clock,
  },
  en_cours: {
    color: 'bg-green-500',
    textColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    label: 'En cours',
    icon: HardHat,
  },
  termine: {
    color: 'bg-gray-400',
    textColor: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    label: 'Terminé',
    icon: CheckCircle2,
  },
  en_retard: {
    color: 'bg-red-500',
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    label: 'En retard',
    icon: AlertCircle,
  },
};

// Weather icon mapping
const weatherIcons = {
  clear: Sun,
  clouds: Cloud,
  rain: CloudRain,
  drizzle: CloudRain,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
  mist: Wind,
  fog: Wind,
  default: Sun,
};

/**
 * Get start and end of current week
 */
function getWeekBounds() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
}

/**
 * Format date in French
 */
function formatDateFr(dateString) {
  const date = new Date(dateString);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

/**
 * Check if chantier is late
 */
function isChantierLate(chantier) {
  if (chantier.statut === CHANTIER_STATUS.TERMINE) return false;
  if (!chantier.date_fin) return false;

  const endDate = new Date(chantier.date_fin);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return endDate < today;
}

/**
 * Get effective status (including late detection)
 */
function getEffectiveStatus(chantier) {
  if (isChantierLate(chantier)) return 'en_retard';
  return chantier.statut;
}

/**
 * Extract city from address
 */
function getCityFromAddress(address) {
  if (!address) return null;
  // Try to extract city from typical French address format
  const match = address.match(/\d{5}\s+(.+?)(?:,|$)/);
  if (match) return match[1].trim();
  // Fallback: last part after comma
  const parts = address.split(',');
  return parts[parts.length - 1]?.trim() || null;
}

/**
 * Fetch weather data with caching
 */
async function fetchWeather(city) {
  if (!city) return null;

  const cacheKey = `${WEATHER_CACHE_PREFIX}${city.toLowerCase()}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < WEATHER_CACHE_DURATION) {
      return data;
    }
  }

  // For demo mode, return mock weather
  if (isDemo) {
    const mockWeather = {
      temp: Math.round(8 + Math.random() * 15),
      condition: ['clear', 'clouds', 'rain'][Math.floor(Math.random() * 3)],
      description: ['Ensoleillé', 'Nuageux', 'Pluie légère'][Math.floor(Math.random() * 3)],
    };
    localStorage.setItem(cacheKey, JSON.stringify({ data: mockWeather, timestamp: Date.now() }));
    return mockWeather;
  }

  // Real API call (OpenWeatherMap)
  try {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},FR&units=metric&lang=fr&appid=${apiKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const weather = {
      temp: Math.round(data.main.temp),
      condition: data.weather[0]?.main?.toLowerCase() || 'clear',
      description: data.weather[0]?.description || 'Ensoleillé',
    };

    localStorage.setItem(cacheKey, JSON.stringify({ data: weather, timestamp: Date.now() }));
    return weather;
  } catch (error) {
    console.warn('Weather fetch failed:', error);
    return null;
  }
}

/**
 * WeatherDisplay - Weather info display
 */
function WeatherDisplay({ weather }) {
  if (!weather) return null;

  const WeatherIcon = weatherIcons[weather.condition] || weatherIcons.default;

  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
      <WeatherIcon className="w-4 h-4" />
      <span>{weather.temp}°C</span>
      <span className="text-gray-400 dark:text-gray-500">•</span>
      <span className="capitalize">{weather.description}</span>
    </div>
  );
}

/**
 * ChantierCard - Individual chantier card
 */
function ChantierCard({ chantier, client, weather, onGPS, onPhotos }) {
  const effectiveStatus = getEffectiveStatus(chantier);
  const config = statusConfig[effectiveStatus] || statusConfig.en_cours;
  const StatusIcon = config.icon;

  // Extract location display
  const city = getCityFromAddress(chantier.adresse);
  const locationDisplay = city || chantier.adresse?.split(',')[0] || 'Adresse non renseignée';

  return (
    <div
      className={cn(
        'p-3 rounded-lg transition-all duration-200',
        'bg-gray-50 dark:bg-slate-800/50',
        'hover:bg-gray-100 dark:hover:bg-slate-800',
        'border border-transparent hover:border-gray-200 dark:hover:border-slate-700'
      )}
    >
      {/* Header: Status dot + Name */}
      <div className="flex items-start gap-2 mb-1.5">
        <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {chantier.nom}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {client?.nom || 'Client inconnu'}
            <span className="mx-1">•</span>
            {locationDisplay}
          </p>
        </div>
      </div>

      {/* Weather */}
      {weather && (
        <div className="ml-4.5 mb-2">
          <WeatherDisplay weather={weather} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4.5">
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => onGPS(chantier)}
          title="Ouvrir dans Google Maps"
        >
          <Navigation className="w-4 h-4" />
        </IconButton>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => onPhotos(chantier)}
          title="Voir les photos"
        >
          <Camera className="w-4 h-4" />
        </IconButton>
      </div>
    </div>
  );
}

/**
 * DaySeparator - Day separator in timeline
 */
function DaySeparator({ date }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {formatDateFr(date)}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
    </div>
  );
}

/**
 * ChantierCardSkeleton - Loading skeleton
 */
function ChantierCardSkeleton() {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 animate-pulse">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-slate-700 mt-1.5" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-slate-800" />
        </div>
      </div>
      <div className="flex gap-2 ml-4.5">
        <div className="w-8 h-8 rounded bg-gray-100 dark:bg-slate-800" />
        <div className="w-8 h-8 rounded bg-gray-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}

/**
 * ChantiersWidget - Widget showing this week's chantiers
 *
 * @param {ChantiersWidgetProps} props
 */
export default function ChantiersWidget({ userId, className, setPage, setSelectedChantier }) {
  const { chantiers: allChantiers } = useChantiers();
  const { getClient } = useClients();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [weekChantiers, setWeekChantiers] = React.useState([]);
  const [weatherData, setWeatherData] = React.useState({});
  const [showAll, setShowAll] = React.useState(false);

  const MAX_VISIBLE = 4;

  // Fetch chantiers for this week
  const fetchWeekChantiers = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { startOfWeek, endOfWeek } = getWeekBounds();

      if (isDemo || !supabase) {
        // Demo mode: filter from context
        const filtered = allChantiers
          .filter((ch) => {
            const startDate = new Date(ch.date_debut);
            // Include if chantier starts this week OR is ongoing (started before, ends after)
            const endDate = ch.date_fin ? new Date(ch.date_fin) : null;

            // Chantier active during this week
            const startsThisWeek = startDate >= startOfWeek && startDate <= endOfWeek;
            const isOngoing = startDate <= endOfWeek && (!endDate || endDate >= startOfWeek);

            return startsThisWeek || (isOngoing && ch.statut === CHANTIER_STATUS.EN_COURS);
          })
          .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));

        setWeekChantiers(filtered);
      } else {
        // Real Supabase query
        const { data, error: queryError } = await supabase
          .from('chantiers')
          .select(`
            *,
            client:clients(id, nom)
          `)
          .or(`date_debut.gte.${startOfWeek.toISOString()},and(date_debut.lte.${endOfWeek.toISOString()},date_fin.gte.${startOfWeek.toISOString()})`)
          .order('date_debut', { ascending: true });

        if (queryError) throw queryError;
        setWeekChantiers(data || []);
      }
    } catch (err) {
      console.error('Error fetching week chantiers:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [allChantiers]);

  // Fetch weather for all chantiers
  const fetchAllWeather = React.useCallback(async () => {
    const newWeatherData = {};

    for (const chantier of weekChantiers) {
      const city = getCityFromAddress(chantier.adresse);
      if (city && !weatherData[city]) {
        const weather = await fetchWeather(city);
        if (weather) {
          newWeatherData[city] = weather;
        }
      }
    }

    if (Object.keys(newWeatherData).length > 0) {
      setWeatherData((prev) => ({ ...prev, ...newWeatherData }));
    }
  }, [weekChantiers, weatherData]);

  // Initial fetch
  React.useEffect(() => {
    fetchWeekChantiers();
  }, [fetchWeekChantiers]);

  // Fetch weather after chantiers loaded
  React.useEffect(() => {
    if (weekChantiers.length > 0) {
      fetchAllWeather();
    }
  }, [weekChantiers.length]); // Only re-run when chantiers count changes

  // Group chantiers by date
  const groupedByDate = React.useMemo(() => {
    const groups = {};

    weekChantiers.forEach((chantier) => {
      const dateKey = chantier.date_debut;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(chantier);
    });

    return Object.entries(groups).sort(([a], [b]) => new Date(a) - new Date(b));
  }, [weekChantiers]);

  // Handle GPS action
  const handleGPS = (chantier) => {
    if (!chantier.adresse) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chantier.adresse)}`;
    window.open(url, '_blank');
  };

  // Handle Photos action
  const handlePhotos = (chantier) => {
    setSelectedChantier?.(chantier);
    setPage?.('chantiers');
  };

  // Handle create new chantier
  const handleCreateChantier = () => {
    setPage?.('chantiers');
  };

  // Handle view planning
  const handleViewPlanning = () => {
    setPage?.('planning');
  };

  // Get client for a chantier
  const getClientForChantier = (chantier) => {
    if (chantier.client && typeof chantier.client === 'object') {
      return chantier.client;
    }
    return getClient(chantier.client_id);
  };

  // Get weather for a chantier
  const getWeatherForChantier = (chantier) => {
    const city = getCityFromAddress(chantier.adresse);
    return city ? weatherData[city] : null;
  };

  // Visible chantiers (limited or all)
  const visibleGroups = showAll ? groupedByDate : groupedByDate.slice(0, 2);
  const totalChantiers = weekChantiers.length;
  const hiddenCount = totalChantiers - visibleGroups.reduce((acc, [, items]) => acc + items.length, 0);

  // Empty state
  const isEmpty = !loading && weekChantiers.length === 0;

  return (
    <Widget
      loading={loading}
      empty={isEmpty}
      emptyState={
        <WidgetEmptyState
          icon={<Calendar />}
          title="Aucun chantier cette semaine"
          description="Planifiez vos prochains chantiers"
          ctaLabel="Planifier un chantier"
          onCtaClick={handleCreateChantier}
        />
      }
      className={className}
    >
      <WidgetHeader
        title="Chantiers cette semaine"
        icon={<HardHat />}
        actions={<WidgetMenuButton onClick={() => {}} />}
      />

      <WidgetContent>
        {error ? (
          <div className="text-center py-6">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchWeekChantiers}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Réessayer
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {visibleGroups.map(([date, chantiers]) => (
              <div key={date}>
                <DaySeparator date={date} />
                <div className="space-y-2 ml-0">
                  {chantiers.map((chantier) => (
                    <ChantierCard
                      key={chantier.id}
                      chantier={chantier}
                      client={getClientForChantier(chantier)}
                      weather={getWeatherForChantier(chantier)}
                      onGPS={handleGPS}
                      onPhotos={handlePhotos}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Show more button */}
            {!showAll && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                + {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} chantier{hiddenCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </WidgetContent>

      <WidgetFooter>
        <Button variant="ghost" size="sm" onClick={handleCreateChantier}>
          <Plus className="w-4 h-4 mr-1.5" />
          Planifier chantier
        </Button>
        <WidgetLink onClick={handleViewPlanning}>Voir planning</WidgetLink>
      </WidgetFooter>
    </Widget>
  );
}

/**
 * ChantiersWidgetSkeleton - Full skeleton for the widget
 */
export function ChantiersWidgetSkeleton() {
  return (
    <Widget loading>
      <WidgetHeader title="Chantiers cette semaine" icon={<HardHat />} />
      <WidgetContent>
        <div className="space-y-3">
          <DaySeparator date={new Date().toISOString()} />
          {[1, 2].map((i) => (
            <ChantierCardSkeleton key={i} />
          ))}
        </div>
      </WidgetContent>
    </Widget>
  );
}
