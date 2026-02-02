import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Lightbulb,
  User,
  Droplets,
  CloudSun,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useChantiers, useClients, useEquipe } from '../../context/DataContext';
import { CHANTIER_STATUS } from '../../lib/constants';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
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
 * @property {number} [daysToShow] - Days to show (default: 7)
 * @property {string} [className] - Additional CSS classes
 * @property {(page: string) => void} [setPage] - Page navigation
 * @property {(chantier: object) => void} [setSelectedChantier] - Chantier selection
 */

// Weather cache key prefix
const WEATHER_CACHE_PREFIX = 'chantierpro_weather_';
const WEATHER_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Alert thresholds
const RAIN_ALERT_THRESHOLD = 70; // % probability
const WIND_ALERT_THRESHOLD = 40; // km/h
const WIND_DISPLAY_THRESHOLD = 30; // km/h

// Status configurations with border colors
const statusConfig = {
  prospect: {
    color: 'bg-blue-500',
    borderColor: 'border-l-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50/50 dark:bg-blue-900/10',
    label: 'Prévu',
    icon: Clock,
  },
  en_cours: {
    color: 'bg-green-500',
    borderColor: 'border-l-green-500',
    textColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50/50 dark:bg-green-900/10',
    label: 'En cours',
    icon: HardHat,
  },
  termine: {
    color: 'bg-gray-400',
    borderColor: 'border-l-gray-400',
    textColor: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50/50 dark:bg-gray-800/30',
    label: 'Terminé',
    icon: CheckCircle2,
  },
  en_retard: {
    color: 'bg-red-500',
    borderColor: 'border-l-red-500',
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50/50 dark:bg-red-900/10',
    label: 'En retard',
    icon: AlertCircle,
  },
};

// Weather icon mapping with emojis
const weatherIcons = {
  clear: { icon: Sun, emoji: '☀️' },
  clouds: { icon: Cloud, emoji: '☁️' },
  'few clouds': { icon: CloudSun, emoji: '⛅' },
  'scattered clouds': { icon: Cloud, emoji: '☁️' },
  rain: { icon: CloudRain, emoji: '🌧️' },
  drizzle: { icon: CloudRain, emoji: '🌧️' },
  snow: { icon: CloudSnow, emoji: '🌨️' },
  thunderstorm: { icon: CloudLightning, emoji: '🌩️' },
  mist: { icon: Wind, emoji: '🌫️' },
  fog: { icon: Wind, emoji: '🌫️' },
  default: { icon: Sun, emoji: '☀️' },
};

/**
 * Get next N days
 */
function getNextDays(count) {
  const days = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }

  return days;
}

/**
 * Format date in French
 */
function formatDateFr(date) {
  const d = date instanceof Date ? date : new Date(date);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

/**
 * Check if date is today
 */
function isToday(date) {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
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
  return chantier.statut || 'en_cours';
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
async function fetchWeatherForCity(city, date) {
  if (!city) return null;

  const dateKey = date instanceof Date ? date.toISOString().split('T')[0] : date;
  const cacheKey = `${WEATHER_CACHE_PREFIX}${city.toLowerCase()}_${dateKey}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < WEATHER_CACHE_DURATION) {
        return data;
      }
    } catch (e) {
      // Invalid cache, continue
    }
  }

  // For demo mode, return mock weather
  if (isDemo) {
    const conditions = ['clear', 'clouds', 'rain'];
    const descriptions = ['Ensoleillé', 'Nuageux', 'Pluie légère'];
    const idx = Math.floor(Math.random() * 3);

    const mockWeather = {
      temp: Math.round(8 + Math.random() * 15),
      condition: conditions[idx],
      description: descriptions[idx],
      wind: Math.round(5 + Math.random() * 40),
      humidity: Math.round(40 + Math.random() * 50),
      rainProbability: idx === 2 ? Math.round(60 + Math.random() * 40) : Math.round(Math.random() * 30),
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: mockWeather, timestamp: Date.now() }));
    } catch (e) {
      // localStorage full, ignore
    }
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
      wind: Math.round((data.wind?.speed || 0) * 3.6), // Convert m/s to km/h
      humidity: data.main?.humidity || 50,
      rainProbability: data.rain ? 80 : data.clouds?.all > 80 ? 60 : 20,
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: weather, timestamp: Date.now() }));
    } catch (e) {
      // localStorage full, ignore
    }
    return weather;
  } catch (error) {
    console.warn('Weather fetch failed:', error);
    return null;
  }
}

/**
 * Check if weather has alerts
 */
function hasWeatherAlert(weather) {
  if (!weather) return false;
  return weather.rainProbability >= RAIN_ALERT_THRESHOLD || weather.wind >= WIND_ALERT_THRESHOLD;
}

/**
 * Get weather alert message
 */
function getWeatherAlertMessage(weather) {
  if (!weather) return null;

  const alerts = [];
  if (weather.rainProbability >= RAIN_ALERT_THRESHOLD) {
    alerts.push('Pluie prévue, prévoir bâches');
  }
  if (weather.wind >= WIND_ALERT_THRESHOLD) {
    alerts.push('Vent fort, sécuriser le matériel');
  }

  return alerts.length > 0 ? alerts.join(' • ') : null;
}

/**
 * WeatherDisplay - Weather info display with alerts
 */
function WeatherDisplay({ weather, showAlert = true, isDark = false }) {
  if (!weather) return null;

  const weatherInfo = weatherIcons[weather.condition] || weatherIcons.default;
  const hasAlert = hasWeatherAlert(weather);
  const showWind = weather.wind >= WIND_DISPLAY_THRESHOLD;

  return (
    <div className="space-y-1">
      <div className={cn(
        'flex items-center gap-1.5 text-sm',
        hasAlert
          ? isDark ? 'text-orange-400' : 'text-orange-600'
          : isDark ? 'text-gray-400' : 'text-gray-600'
      )}>
        <span>{weatherInfo.emoji}</span>
        <span>{weather.temp}°C</span>
        <span className="capitalize">{weather.description}</span>
        {showWind && (
          <>
            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>•</span>
            <Wind className="w-3.5 h-3.5" />
            <span>{weather.wind} km/h</span>
          </>
        )}
        {hasAlert && (
          <Badge variant="warning" size="sm" className="ml-1">
            <AlertTriangle className="w-3 h-3" />
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * WeatherAlert - Weather alert message
 */
function WeatherAlert({ weather, isDark = false }) {
  const message = getWeatherAlertMessage(weather);
  if (!message) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
      isDark
        ? 'bg-orange-900/20 text-orange-300'
        : 'bg-orange-50 text-orange-700'
    )}>
      <Lightbulb className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/**
 * ChantierCard - Individual chantier card with weather and team
 */
function ChantierCard({ chantier, client, weather, equipe, onGPS, onPhotos, isDark = false }) {
  const effectiveStatus = getEffectiveStatus(chantier);
  const config = statusConfig[effectiveStatus] || statusConfig.en_cours;
  const hasAlert = hasWeatherAlert(weather);

  // Extract location display
  const city = getCityFromAddress(chantier.adresse);
  const locationDisplay = city || chantier.adresse?.split(',')[0] || 'Adresse non renseignée';

  // Get team member names
  const teamDisplay = useMemo(() => {
    if (!equipe || equipe.length === 0) return null;

    // Find assigned team members
    const assignedIds = chantier.equipe_ids || chantier.equipe || [];
    if (assignedIds.length === 0) return null;

    const assignedMembers = equipe.filter(m => assignedIds.includes(m.id));
    if (assignedMembers.length === 0) return null;

    // Find chef (if any)
    const chef = assignedMembers.find(m => m.role === 'chef' || m.role === 'chef_equipe');

    if (chef) {
      const initial = chef.prenom?.[0] || '';
      return `${chef.prenom || chef.nom} ${initial ? initial + '.' : ''} (Chef)`;
    }

    // Just show first member
    const first = assignedMembers[0];
    const initial = first.nom?.[0] || '';
    return `${first.prenom || first.nom} ${initial ? initial + '.' : ''}`;
  }, [chantier, equipe]);

  return (
    <div
      className={cn(
        'group relative p-3 rounded-lg overflow-hidden',
        'transition-all duration-200',
        'hover:shadow-md',
        hasAlert
          ? isDark
            ? 'bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/20'
            : 'bg-gradient-to-br from-orange-50 to-orange-50/30 border border-orange-200/80'
          : isDark
            ? 'bg-slate-800/50 border border-slate-700/50'
            : 'bg-white border border-gray-100'
      )}
    >
      {/* Left accent bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', config.color)} />

      {/* Main content row */}
      <div className="flex items-center gap-3 pl-2">
        {/* Status icon */}
        <div
          className={cn(
            'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
            isDark ? config.bgColor.replace('dark:', '').replace(/bg-\w+-50\/50/g, '') : config.bgColor.split(' ')[0],
            isDark && config.bgColor.includes('dark:') && config.bgColor.split('dark:')[1]?.split(' ')[0]
          )}
        >
          <config.icon className={cn('w-3.5 h-3.5', isDark ? config.textColor.split('dark:')[1] : config.textColor.split(' ')[0])} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium leading-tight',
            isDark ? 'text-white' : 'text-gray-900'
          )}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={chantier.nom}
          >
            {chantier.nom}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
              title={client?.nom || 'Client inconnu'}
            >
              {client?.nom || 'Client inconnu'}
            </span>
            <span className={cn('flex-shrink-0', isDark ? 'text-gray-600' : 'text-gray-300')}>•</span>
            <span
              className={cn('text-xs flex items-center gap-1 min-w-0', isDark ? 'text-gray-500' : 'text-gray-400')}
              title={locationDisplay}
            >
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{locationDisplay}</span>
            </span>
          </div>
        </div>

        {/* Weather badge (compact) */}
        {weather && (
          <div className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-md',
            hasAlert
              ? isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-100 text-orange-700'
              : isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-600'
          )}>
            <span>{weatherIcons[weather.condition]?.emoji || '🌤️'}</span>
            <span>{weather.temp}°</span>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-1">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => onGPS(chantier)}
            title="GPS"
            className="!p-1.5"
          >
            <Navigation className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => onPhotos(chantier)}
            title="Photos"
            className="!p-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      {/* Weather Alert - only show if there's an alert */}
      {hasAlert && (
        <div className="mt-2 pl-2">
          <WeatherAlert weather={weather} isDark={isDark} />
        </div>
      )}
    </div>
  );
}

/**
 * DaySeparator - Day separator in timeline
 */
function DaySeparator({ date, isDark = false }) {
  const today = isToday(date);

  return (
    <div className="flex items-center gap-2 py-2">
      <span className={cn(
        'text-xs font-semibold whitespace-nowrap',
        today
          ? isDark ? 'text-primary-400' : 'text-primary-600'
          : isDark ? 'text-gray-300' : 'text-gray-700'
      )}>
        {today ? "Aujourd'hui" : formatDateFr(date)}
      </span>
      <div className={cn(
        'flex-1 h-px',
        today
          ? isDark ? 'bg-primary-800' : 'bg-primary-200'
          : isDark ? 'bg-slate-700' : 'bg-gray-200'
      )} />
    </div>
  );
}

/**
 * ChantierCardSkeleton - Loading skeleton
 */
function ChantierCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border-l-4 border-l-gray-300 bg-gray-50 dark:bg-slate-800/50 animate-pulse">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-slate-700 mt-1.5" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-slate-800" />
        </div>
      </div>
      <div className="ml-4.5 space-y-2">
        <div className="h-4 w-40 rounded bg-gray-100 dark:bg-slate-800" />
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded bg-gray-100 dark:bg-slate-800" />
          <div className="w-8 h-8 rounded bg-gray-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

/**
 * ChantiersWidget - Widget showing upcoming chantiers with weather integration
 *
 * @param {ChantiersWidgetProps} props
 */
export default function ChantiersWidget({
  userId,
  daysToShow = 7,
  className,
  setPage,
  setSelectedChantier,
  isDark = false,
}) {
  const { chantiers: allChantiers } = useChantiers();
  const { getClient } = useClients();
  const { equipe } = useEquipe();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upcomingChantiers, setUpcomingChantiers] = useState([]);
  const [weatherData, setWeatherData] = useState({});
  const [showAll, setShowAll] = useState(false);

  const MAX_VISIBLE_DAYS = 3;
  const MAX_VISIBLE_CHANTIERS = 5;

  // Get date range
  const dateRange = useMemo(() => getNextDays(daysToShow), [daysToShow]);

  // Fetch chantiers for date range
  const fetchUpcomingChantiers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = dateRange[0];
      const endDate = dateRange[dateRange.length - 1];

      if (isDemo || !supabase) {
        // Demo mode: filter from context
        // Only show chantiers with status 'en_cours' that are active in the date range
        const filtered = allChantiers
          .filter((ch) => {
            // Only include chantiers with 'en_cours' status
            if (ch.statut !== CHANTIER_STATUS.EN_COURS) return false;

            const chStart = new Date(ch.date_debut);
            const chEnd = ch.date_fin ? new Date(ch.date_fin) : null;

            // Chantier active during date range
            const startsInRange = chStart >= startDate && chStart <= endDate;
            const isOngoing = chStart <= endDate && (!chEnd || chEnd >= startDate);

            return startsInRange || isOngoing;
          })
          .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));

        setUpcomingChantiers(filtered);
      } else {
        // Real Supabase query - only fetch chantiers with 'en_cours' status
        const { data, error: queryError } = await supabase
          .from('chantiers')
          .select(`
            *,
            client:clients(id, nom)
          `)
          .eq('statut', CHANTIER_STATUS.EN_COURS)
          .or(`date_debut.gte.${startDate.toISOString()},and(date_debut.lte.${endDate.toISOString()},date_fin.gte.${startDate.toISOString()})`)
          .order('date_debut', { ascending: true });

        if (queryError) throw queryError;
        setUpcomingChantiers(data || []);
      }
    } catch (err) {
      console.error('Error fetching chantiers:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [allChantiers, dateRange]);

  // Fetch weather for all chantiers
  const fetchAllWeather = useCallback(async () => {
    const newWeatherData = {};
    const citiesProcessed = new Set();

    for (const chantier of upcomingChantiers) {
      const city = getCityFromAddress(chantier.adresse);
      if (city && !citiesProcessed.has(city)) {
        citiesProcessed.add(city);
        const weather = await fetchWeatherForCity(city, new Date());
        if (weather) {
          newWeatherData[city] = weather;
        }
      }
    }

    if (Object.keys(newWeatherData).length > 0) {
      setWeatherData((prev) => ({ ...prev, ...newWeatherData }));
    }
  }, [upcomingChantiers]);

  // Initial fetch
  useEffect(() => {
    fetchUpcomingChantiers();
  }, [fetchUpcomingChantiers]);

  // Fetch weather after chantiers loaded
  useEffect(() => {
    if (upcomingChantiers.length > 0) {
      fetchAllWeather();
    }
  }, [upcomingChantiers.length]);

  // Group chantiers by date
  const groupedByDate = useMemo(() => {
    const groups = new Map();

    // Initialize with all days in range
    dateRange.forEach((date) => {
      const dateKey = date.toISOString().split('T')[0];
      groups.set(dateKey, { date, chantiers: [] });
    });

    // Add chantiers to their dates
    upcomingChantiers.forEach((chantier) => {
      const chStart = new Date(chantier.date_debut);
      const chEnd = chantier.date_fin ? new Date(chantier.date_fin) : null;

      dateRange.forEach((date) => {
        const dateKey = date.toISOString().split('T')[0];
        const isActive = chStart <= date && (!chEnd || chEnd >= date);

        if (isActive) {
          groups.get(dateKey)?.chantiers.push(chantier);
        }
      });
    });

    // Filter out empty days and convert to array
    return Array.from(groups.values())
      .filter((g) => g.chantiers.length > 0)
      .sort((a, b) => a.date - b.date);
  }, [upcomingChantiers, dateRange]);

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

  // Handle view all
  const handleViewAll = () => {
    setPage?.('chantiers');
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

  // Visible groups (limited or all)
  const visibleGroups = showAll ? groupedByDate : groupedByDate.slice(0, MAX_VISIBLE_DAYS);

  // Count total and visible chantiers
  const totalChantiers = upcomingChantiers.length;
  const visibleChantierCount = visibleGroups.reduce((acc, g) => acc + g.chantiers.length, 0);
  const hiddenCount = totalChantiers > MAX_VISIBLE_CHANTIERS && !showAll
    ? totalChantiers - MAX_VISIBLE_CHANTIERS
    : groupedByDate.length > MAX_VISIBLE_DAYS && !showAll
    ? groupedByDate.slice(MAX_VISIBLE_DAYS).reduce((acc, g) => acc + g.chantiers.length, 0)
    : 0;

  // Empty state
  const isEmpty = !loading && upcomingChantiers.length === 0;

  // Count alerts
  const alertCount = useMemo(() => {
    return upcomingChantiers.filter((ch) => {
      const weather = getWeatherForChantier(ch);
      return hasWeatherAlert(weather);
    }).length;
  }, [upcomingChantiers, weatherData]);

  return (
    <Widget
      loading={loading}
      empty={isEmpty}
      isDark={isDark}
      emptyState={
        <WidgetEmptyState
          icon={<Calendar />}
          title="Aucun chantier prévu"
          description="Planifiez vos prochains chantiers"
          ctaLabel="Planifier un chantier"
          onCtaClick={handleCreateChantier}
          isDark={isDark}
        />
      }
      className={className}
    >
      <WidgetHeader
        title="Chantiers à venir"
        icon={<HardHat />}
        isDark={isDark}
        actions={
          <div className="flex items-center gap-2">
            {alertCount > 0 && (
              <Tooltip content={`${alertCount} chantier${alertCount > 1 ? 's' : ''} avec alerte météo`} side="bottom">
                <Badge variant="warning" size="sm" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {alertCount}
                </Badge>
              </Tooltip>
            )}
            <WidgetMenuButton onClick={handleViewAll} isDark={isDark} />
          </div>
        }
      />

      <WidgetContent className="max-h-[320px] overflow-y-auto">
        {error ? (
          <div className="text-center py-6">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchUpcomingChantiers}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Réessayer
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {visibleGroups.map(({ date, chantiers }) => (
              <div key={date.toISOString()}>
                <DaySeparator date={date} isDark={isDark} />
                <div className="space-y-2">
                  {chantiers.slice(0, showAll ? undefined : 2).map((chantier) => (
                    <ChantierCard
                      key={`${chantier.id}-${date.toISOString()}`}
                      chantier={chantier}
                      client={getClientForChantier(chantier)}
                      weather={getWeatherForChantier(chantier)}
                      equipe={equipe}
                      onGPS={handleGPS}
                      onPhotos={handlePhotos}
                      isDark={isDark}
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
                className={cn(
                  'w-full py-2 text-sm font-medium transition-colors',
                  isDark
                    ? 'text-gray-400 hover:text-primary-400'
                    : 'text-gray-600 hover:text-primary-600'
                )}
              >
                + {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} chantier{hiddenCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </WidgetContent>

      <WidgetFooter isDark={isDark}>
        <WidgetLink onClick={handleCreateChantier} isDark={isDark}>Planifier un chantier</WidgetLink>
        <WidgetLink onClick={handleViewAll} isDark={isDark}>Voir tout</WidgetLink>
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
      <WidgetHeader title="Chantiers à venir" icon={<HardHat />} />
      <WidgetContent>
        <div className="space-y-3">
          <DaySeparator date={new Date()} />
          {[1, 2].map((i) => (
            <ChantierCardSkeleton key={i} />
          ))}
        </div>
      </WidgetContent>
    </Widget>
  );
}
