/**
 * Weather Alerts System
 * Monitors weather conditions and suggests rescheduling for outdoor work
 *
 * @module weatherAlerts
 */

import { supabase } from '../supabaseClient';
import { templates } from './weatherNotificationTemplates';

// ============================================================================
// TYPES (JSDoc)
// ============================================================================

/**
 * @typedef {'critique' | 'modere' | 'faible'} WeatherImpact
 */

/**
 * @typedef {'reporter' | 'prevoir_baches' | 'continuer_prudence' | 'aucune'} SuggestedAction
 */

/**
 * @typedef {Object} WeatherData
 * @property {number} temp - Temperature in Celsius
 * @property {number} feels_like - Feels like temperature
 * @property {string} description - Weather description
 * @property {string} icon - Weather icon code
 * @property {number} rain_probability - Rain probability (0-100)
 * @property {number} rain_mm - Rain amount in mm
 * @property {number} wind_speed - Wind speed in km/h
 * @property {number} humidity - Humidity percentage
 * @property {boolean} is_snow - Whether it's snowing
 */

/**
 * @typedef {Object} WeatherSuggestion
 * @property {SuggestedAction} action - Suggested action
 * @property {string} reason - Reason for suggestion
 * @property {Date[]} [dates_alternatives] - Alternative dates if rescheduling
 */

/**
 * @typedef {Object} WeatherAlert
 * @property {string} id - Alert ID
 * @property {string} chantier_id - Chantier ID
 * @property {string} chantier_nom - Chantier name
 * @property {string} client_nom - Client name
 * @property {string} [client_telephone] - Client phone
 * @property {string} [client_email] - Client email
 * @property {Date} date_planifiee - Planned date
 * @property {string} [adresse] - Chantier address
 * @property {string} [type_travaux] - Type of work
 * @property {WeatherData} weather - Weather data
 * @property {WeatherImpact} impact - Impact level
 * @property {WeatherSuggestion} suggestion - Suggested action
 * @property {boolean} notified - Whether notification was sent
 * @property {Date} created_at - Alert creation time
 */

/**
 * @typedef {Object} RescheduleSuggestion
 * @property {Date} date - Suggested date
 * @property {WeatherData} weather - Weather for that date
 * @property {boolean} equipe_available - Whether team is available
 * @property {boolean} no_conflicts - Whether there are no conflicts
 * @property {number} score - Suitability score (0-100)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Types of outdoor work sensitive to weather */
const OUTDOOR_WORK_TYPES = [
  'couverture',
  'toiture',
  'facade',
  'ravalement',
  'terrassement',
  'maconnerie_exterieure',
  'peinture_exterieure',
  'jardinage',
  'cloture',
  'terrasse',
  'piscine',
  'exterieur',
];

/** Weather thresholds for different impact levels */
const WEATHER_THRESHOLDS = {
  critique: {
    rain_probability: 80,
    wind_speed: 50,
    temp_min: 0,
    temp_max: 40,
  },
  modere: {
    rain_probability: 50,
    wind_speed: 35,
    temp_min: 3,
  },
  faible: {
    rain_probability: 30,
    wind_speed: 25,
  },
};

/** Ideal weather conditions for rescheduling suggestions */
const IDEAL_WEATHER = {
  rain_probability_max: 20,
  wind_speed_max: 20,
  temp_min: 5,
  temp_max: 30,
};

// ============================================================================
// MÉTÉO-FRANCE API
// ============================================================================

/**
 * Get Météo-France API token
 * @returns {Promise<string | null>} Access token
 */
async function getMeteoFranceToken() {
  const applicationId = import.meta.env.VITE_METEOFRANCE_APP_ID;

  if (!applicationId) {
    console.warn('[WeatherAlerts] Météo-France API credentials not configured');
    return null;
  }

  // For public API, the application ID is used directly as bearer token
  return applicationId;
}

/**
 * Fetch weather forecast from Météo-France
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} [days=7] - Number of days to forecast
 * @returns {Promise<Map<string, WeatherData>>} Weather data by date
 */
export async function fetchWeatherForecast(lat, lng, days = 7) {
  const token = await getMeteoFranceToken();

  if (!token) {
    // Fallback to Open-Meteo (free, no API key required)
    return fetchWeatherForecastOpenMeteo(lat, lng, days);
  }

  try {
    // Météo-France API endpoint for forecasts
    const response = await fetch(
      `https://webservice.meteofrance.com/forecast?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'apikey': token,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn('[WeatherAlerts] Météo-France API error, falling back to Open-Meteo');
      return fetchWeatherForecastOpenMeteo(lat, lng, days);
    }

    const data = await response.json();
    return parseMeteoFranceData(data, days);
  } catch (error) {
    console.error('[WeatherAlerts] Error fetching Météo-France data:', error);
    return fetchWeatherForecastOpenMeteo(lat, lng, days);
  }
}

/**
 * Parse Météo-France API response
 * @param {Object} data - API response
 * @param {number} days - Number of days
 * @returns {Map<string, WeatherData>}
 */
function parseMeteoFranceData(data, days) {
  const weatherMap = new Map();
  const forecasts = data.forecast || data.properties?.forecast || [];

  for (const forecast of forecasts) {
    const date = new Date(forecast.time || forecast.dt);
    const dateKey = date.toISOString().split('T')[0];

    // Check if within requested days
    const today = new Date();
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    if (diffDays > days) continue;

    const existing = weatherMap.get(dateKey);
    const current = {
      temp: Math.round(forecast.T?.value || forecast.temperature || 15),
      feels_like: Math.round(forecast.T?.windchill || forecast.temperature || 15),
      description: translateWeatherCode(forecast.weather?.desc || forecast.weather_description),
      icon: forecast.weather?.icon || '01d',
      rain_probability: Math.round((forecast.rain?.probability || forecast.precipitation_probability || 0)),
      rain_mm: forecast.rain?.['1h'] || forecast.precipitation || 0,
      wind_speed: Math.round((forecast.wind?.speed || forecast.wind_speed || 0) * 3.6),
      wind_gust: Math.round((forecast.wind?.gust || forecast.wind_gust || 0) * 3.6),
      humidity: forecast.humidity || 50,
      is_snow: (forecast.weather?.desc || '').toLowerCase().includes('neige'),
    };

    // Keep worse conditions for each day
    if (
      !existing ||
      current.rain_probability > existing.rain_probability ||
      current.wind_speed > existing.wind_speed
    ) {
      weatherMap.set(dateKey, current);
    }
  }

  return weatherMap;
}

/**
 * Fallback: Fetch from Open-Meteo (free, no API key)
 * Uses data from Météo-France model (AROME/ARPEGE)
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} [days=7] - Number of days
 * @returns {Promise<Map<string, WeatherData>>}
 */
async function fetchWeatherForecastOpenMeteo(lat, lng, days = 7) {
  try {
    // Open-Meteo uses Météo-France AROME model for France
    const response = await fetch(
      `https://api.open-meteo.com/v1/meteofrance?` +
      `latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,weather_code` +
      `&timezone=Europe/Paris` +
      `&forecast_days=${Math.min(days, 14)}`
    );

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();
    const weatherMap = new Map();

    const daily = data.daily;
    if (!daily || !daily.time) return weatherMap;

    for (let i = 0; i < daily.time.length; i++) {
      const dateKey = daily.time[i];
      const weatherCode = daily.weather_code?.[i] || 0;

      weatherMap.set(dateKey, {
        temp: Math.round((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2),
        temp_max: Math.round(daily.temperature_2m_max[i]),
        temp_min: Math.round(daily.temperature_2m_min[i]),
        feels_like: Math.round(daily.temperature_2m_max[i]),
        description: getWeatherDescription(weatherCode),
        icon: getWeatherIcon(weatherCode),
        rain_probability: Math.round(daily.precipitation_probability_max[i] || 0),
        rain_mm: daily.precipitation_sum[i] || 0,
        wind_speed: Math.round(daily.wind_speed_10m_max[i] || 0),
        wind_gust: Math.round(daily.wind_gusts_10m_max[i] || 0),
        humidity: 50, // Not available in daily data
        is_snow: weatherCode >= 71 && weatherCode <= 77,
        weather_code: weatherCode,
      });
    }

    return weatherMap;
  } catch (error) {
    console.error('[WeatherAlerts] Error fetching Open-Meteo data:', error);
    return new Map();
  }
}

/**
 * Get weather description from WMO code
 * @param {number} code - WMO weather code
 * @returns {string} Description in French
 */
function getWeatherDescription(code) {
  const descriptions = {
    0: 'Ciel dégagé',
    1: 'Peu nuageux',
    2: 'Partiellement nuageux',
    3: 'Couvert',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    53: 'Bruine modérée',
    55: 'Bruine dense',
    56: 'Bruine verglaçante légère',
    57: 'Bruine verglaçante dense',
    61: 'Pluie légère',
    63: 'Pluie modérée',
    65: 'Pluie forte',
    66: 'Pluie verglaçante légère',
    67: 'Pluie verglaçante forte',
    71: 'Neige légère',
    73: 'Neige modérée',
    75: 'Neige forte',
    77: 'Grains de neige',
    80: 'Averses légères',
    81: 'Averses modérées',
    82: 'Averses violentes',
    85: 'Averses de neige légères',
    86: 'Averses de neige fortes',
    95: 'Orage',
    96: 'Orage avec grêle légère',
    99: 'Orage avec grêle forte',
  };
  return descriptions[code] || 'Conditions variables';
}

/**
 * Get weather icon from WMO code
 * @param {number} code - WMO weather code
 * @returns {string} Icon code
 */
function getWeatherIcon(code) {
  if (code === 0) return '01d';
  if (code <= 3) return '02d';
  if (code <= 48) return '50d';
  if (code <= 57) return '09d';
  if (code <= 67) return '10d';
  if (code <= 77) return '13d';
  if (code <= 82) return '09d';
  if (code <= 86) return '13d';
  if (code >= 95) return '11d';
  return '03d';
}

/**
 * Translate weather description to French
 * @param {string} desc - Description
 * @returns {string} French description
 */
function translateWeatherCode(desc) {
  if (!desc) return 'Conditions variables';
  // Already in French from Météo-France
  return desc;
}

/**
 * Geocode an address to coordinates using French government API
 *
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function geocodeAddress(address) {
  if (!address) return null;

  try {
    // Use French government geocoding API (free, no key required)
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;

    const [lng, lat] = data.features[0].geometry.coordinates;
    return { lat, lng };
  } catch (error) {
    console.error('[WeatherAlerts] Geocoding error:', error);
    return null;
  }
}

// ============================================================================
// IMPACT ASSESSMENT
// ============================================================================

/**
 * Assess weather impact on work
 *
 * @param {WeatherData} weather - Weather data
 * @param {string} [typeTraveaux] - Type of work
 * @returns {WeatherImpact | null} Impact level or null if no impact
 */
export function assessWeatherImpact(weather, typeTraveaux) {
  // Check if it's outdoor work
  const isOutdoor = typeTraveaux
    ? OUTDOOR_WORK_TYPES.some((t) => typeTraveaux.toLowerCase().includes(t))
    : true;

  if (!isOutdoor) {
    return null; // No weather impact for indoor work
  }

  // Critical: Impossible to work
  if (
    weather.rain_probability >= WEATHER_THRESHOLDS.critique.rain_probability ||
    weather.wind_speed >= WEATHER_THRESHOLDS.critique.wind_speed ||
    weather.temp <= WEATHER_THRESHOLDS.critique.temp_min ||
    weather.temp >= WEATHER_THRESHOLDS.critique.temp_max ||
    weather.is_snow
  ) {
    return 'critique';
  }

  // Moderate: Possible with precautions
  if (
    weather.rain_probability >= WEATHER_THRESHOLDS.modere.rain_probability ||
    weather.wind_speed >= WEATHER_THRESHOLDS.modere.wind_speed ||
    weather.temp <= WEATHER_THRESHOLDS.modere.temp_min
  ) {
    return 'modere';
  }

  // Low: Monitor situation
  if (
    weather.rain_probability >= WEATHER_THRESHOLDS.faible.rain_probability ||
    weather.wind_speed >= WEATHER_THRESHOLDS.faible.wind_speed
  ) {
    return 'faible';
  }

  return null;
}

/**
 * Generate impact reason description
 *
 * @param {WeatherData} weather - Weather data
 * @param {WeatherImpact} impact - Impact level
 * @returns {string} Reason description
 */
function generateImpactReason(weather, impact) {
  const reasons = [];

  if (weather.rain_probability >= 80) {
    reasons.push(`forte probabilité de pluie (${weather.rain_probability}%)`);
  } else if (weather.rain_probability >= 50) {
    reasons.push(`risque de pluie (${weather.rain_probability}%)`);
  }

  if (weather.wind_speed >= 50) {
    reasons.push(`vent violent (${weather.wind_speed} km/h)`);
  } else if (weather.wind_speed >= 35) {
    reasons.push(`vent fort (${weather.wind_speed} km/h)`);
  }

  if (weather.temp <= 0) {
    reasons.push(`gel (${weather.temp}°C)`);
  } else if (weather.temp >= 40) {
    reasons.push(`canicule (${weather.temp}°C)`);
  }

  if (weather.is_snow) {
    reasons.push('neige prévue');
  }

  if (reasons.length === 0) {
    return 'Conditions météo défavorables';
  }

  return `Travail extérieur déconseillé: ${reasons.join(', ')}`;
}

/**
 * Generate suggestion based on impact
 *
 * @param {WeatherImpact} impact - Impact level
 * @param {WeatherData} weather - Weather data
 * @param {Date[]} [alternativeDates] - Alternative dates
 * @returns {WeatherSuggestion}
 */
export function generateSuggestion(impact, weather, alternativeDates = []) {
  switch (impact) {
    case 'critique':
      return {
        action: 'reporter',
        reason: `Conditions meteo dangereuses (${weather.description}, vent ${weather.wind_speed}km/h, pluie ${weather.rain_probability}%)`,
        dates_alternatives: alternativeDates,
      };

    case 'modere':
      if (weather.rain_probability > 60) {
        return {
          action: 'prevoir_baches',
          reason: `Risque de pluie eleve (${weather.rain_probability}%). Prevoir protections.`,
          dates_alternatives: alternativeDates,
        };
      }
      return {
        action: 'continuer_prudence',
        reason: `Conditions difficiles (${weather.description}). Vigilance requise.`,
        dates_alternatives: alternativeDates,
      };

    case 'faible':
      return {
        action: 'continuer_prudence',
        reason: `Risque meteo faible (${weather.rain_probability}% pluie). Surveiller evolution.`,
      };

    default:
      return {
        action: 'aucune',
        reason: 'Conditions meteo favorables',
      };
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Check weather impact for upcoming chantiers
 *
 * @param {string} userId - User ID
 * @param {number} [daysAhead=7] - Days to look ahead
 * @returns {Promise<WeatherAlert[]>} Weather alerts
 */
export async function checkWeatherImpact(userId, daysAhead = 7) {
  if (!supabase) {
    console.warn('[WeatherAlerts] Supabase not available');
    return [];
  }

  try {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Fetch upcoming chantiers
    const { data: chantiers, error } = await supabase
      .from('chantiers')
      .select(`
        id,
        nom,
        adresse,
        ville,
        code_postal,
        date_debut,
        date_fin,
        type_travaux,
        statut,
        client:clients(nom, prenom, telephone, email)
      `)
      .eq('user_id', userId)
      .in('statut', ['planifie', 'en_cours'])
      .gte('date_debut', today.toISOString().split('T')[0])
      .lte('date_debut', futureDate.toISOString().split('T')[0])
      .order('date_debut');

    if (error) throw error;
    if (!chantiers || chantiers.length === 0) return [];

    const alerts = [];

    for (const chantier of chantiers) {
      // Build address for geocoding
      const address = [chantier.adresse, chantier.ville, chantier.code_postal]
        .filter(Boolean)
        .join(', ');

      // Get coordinates (default to Paris if geocoding fails)
      const coords = (await geocodeAddress(address)) || { lat: 48.8566, lng: 2.3522 };

      // Fetch weather
      const weatherMap = await fetchWeatherForecast(coords.lat, coords.lng, daysAhead);

      // Check weather for chantier date
      const chantierDate = new Date(chantier.date_debut);
      const dateKey = chantierDate.toISOString().split('T')[0];
      const weather = weatherMap.get(dateKey);

      if (!weather) continue;

      // Assess impact
      const impact = assessWeatherImpact(weather, chantier.type_travaux);

      if (impact) {
        // Find alternative dates
        const alternatives = await suggestRescheduling(
          chantier,
          userId,
          weatherMap,
          coords
        );

        // Map impact to widget format
        const impactLevelMap = {
          critique: 'critical',
          modere: 'high',
          faible: 'medium',
        };

        alerts.push({
          id: `weather-${chantier.id}-${dateKey}`,
          // Chantier object for widget compatibility
          chantier: {
            id: chantier.id,
            nom: chantier.nom,
            date_debut: chantierDate,
            adresse: address,
            type_travaux: chantier.type_travaux,
            client_nom: chantier.client?.nom,
            client_prenom: chantier.client?.prenom,
            client_telephone: chantier.client?.telephone,
            client_email: chantier.client?.email,
          },
          // Keep flat properties for backward compatibility
          chantier_id: chantier.id,
          chantier_nom: chantier.nom,
          client_nom: chantier.client
            ? `${chantier.client.prenom || ''} ${chantier.client.nom || ''}`.trim()
            : 'Client inconnu',
          client_telephone: chantier.client?.telephone,
          client_email: chantier.client?.email,
          date_planifiee: chantierDate,
          adresse: address,
          type_travaux: chantier.type_travaux,
          weather,
          // Impact object for widget compatibility
          impact: {
            level: impactLevelMap[impact] || 'medium',
            original: impact,
            reason: generateImpactReason(weather, impact),
          },
          suggestion: {
            ...generateSuggestion(impact, weather, alternatives.map((a) => a.date)),
            alternativeDates: alternatives,
          },
          notified: false,
          created_at: new Date(),
        });
      }
    }

    // Sort by urgency (closest date + highest impact first)
    alerts.sort((a, b) => {
      const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const impactDiff = (impactOrder[a.impact?.level] || 3) - (impactOrder[b.impact?.level] || 3);
      if (impactDiff !== 0) return impactDiff;
      return a.date_planifiee.getTime() - b.date_planifiee.getTime();
    });

    return alerts;
  } catch (error) {
    console.error('[WeatherAlerts] Error checking weather impact:', error);
    return [];
  }
}

/**
 * Suggest rescheduling dates for a chantier
 *
 * @param {Object} chantier - Chantier object
 * @param {string} userId - User ID
 * @param {Map<string, WeatherData>} [existingWeatherMap] - Existing weather data
 * @param {{lat: number, lng: number}} [coords] - Coordinates
 * @returns {Promise<RescheduleSuggestion[]>} Suggested dates
 */
export async function suggestRescheduling(chantier, userId, existingWeatherMap, coords) {
  try {
    // Get weather for next 14 days if not provided
    let weatherMap = existingWeatherMap;
    if (!weatherMap || weatherMap.size === 0) {
      const address = [chantier.adresse, chantier.ville, chantier.code_postal]
        .filter(Boolean)
        .join(', ');
      const location = coords || (await geocodeAddress(address)) || { lat: 48.8566, lng: 2.3522 };
      weatherMap = await fetchWeatherForecast(location.lat, location.lng, 14);
    }

    // Get team availability if equipe is assigned
    let equipeChantiers = [];
    if (chantier.equipe_id && supabase) {
      const { data } = await supabase
        .from('chantiers')
        .select('date_debut, date_fin')
        .eq('equipe_id', chantier.equipe_id)
        .neq('id', chantier.id)
        .in('statut', ['planifie', 'en_cours']);
      equipeChantiers = data || [];
    }

    const suggestions = [];
    const today = new Date();
    const originalDate = new Date(chantier.date_debut);

    // Check each day in the forecast
    for (const [dateKey, weather] of weatherMap) {
      const date = new Date(dateKey);

      // Skip past dates and the original date
      if (date <= today || date.toDateString() === originalDate.toDateString()) {
        continue;
      }

      // Check if weather is favorable
      if (
        weather.rain_probability > IDEAL_WEATHER.rain_probability_max ||
        weather.wind_speed > IDEAL_WEATHER.wind_speed_max ||
        weather.temp < IDEAL_WEATHER.temp_min ||
        weather.temp > IDEAL_WEATHER.temp_max
      ) {
        continue;
      }

      // Check team availability
      const equipeAvailable = !equipeChantiers.some((c) => {
        const start = new Date(c.date_debut);
        const end = c.date_fin ? new Date(c.date_fin) : start;
        return date >= start && date <= end;
      });

      // Calculate suitability score
      let score = 100;
      score -= weather.rain_probability * 0.5;
      score -= weather.wind_speed * 0.3;
      if (!equipeAvailable) score -= 30;

      suggestions.push({
        date,
        weather,
        equipe_available: equipeAvailable,
        no_conflicts: equipeAvailable,
        score: Math.max(0, Math.round(score)),
      });
    }

    // Sort by score (best first) and return top 3
    suggestions.sort((a, b) => b.score - a.score);
    return suggestions.slice(0, 3);
  } catch (error) {
    console.error('[WeatherAlerts] Error suggesting reschedule:', error);
    return [];
  }
}

/**
 * Reschedule a chantier to a new date
 *
 * @param {string} chantierId - Chantier ID
 * @param {Date} newDate - New date
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rescheduleChantier(chantierId, newDate, userId) {
  if (!supabase) {
    return { success: false, error: 'Database not available' };
  }

  try {
    // Get original chantier
    const { data: chantier, error: fetchError } = await supabase
      .from('chantiers')
      .select('date_debut, date_fin')
      .eq('id', chantierId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate duration
    const originalStart = new Date(chantier.date_debut);
    const originalEnd = chantier.date_fin ? new Date(chantier.date_fin) : originalStart;
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    // Calculate new end date
    const newEnd = new Date(newDate.getTime() + durationMs);

    // Update chantier
    const { error: updateError } = await supabase
      .from('chantiers')
      .update({
        date_debut: newDate.toISOString(),
        date_fin: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chantierId);

    if (updateError) throw updateError;

    // Log the reschedule
    try {
      await supabase.from('ai_suggestions').insert([
        {
          user_id: userId,
          type: 'weather_reschedule',
          title: 'Chantier replanifie (meteo)',
          description: `Chantier deplace du ${formatDateFR(originalStart)} au ${formatDateFR(newDate)} en raison des conditions meteo`,
          priority: 'medium',
          status: 'accepted',
          data: {
            chantier_id: chantierId,
            original_date: originalStart.toISOString(),
            new_date: newDate.toISOString(),
          },
        },
      ]);
    } catch (logError) {
      console.warn('[WeatherAlerts] Could not log reschedule:', logError);
    }

    return { success: true };
  } catch (error) {
    console.error('[WeatherAlerts] Error rescheduling:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Generate SMS message for weather alert
 *
 * @param {WeatherAlert} alert - Weather alert
 * @param {Object} [company] - Company info
 * @returns {string} SMS message
 */
export function generateSMSMessage(alert, company) {
  // Use template if available
  if (templates?.sms?.weatherAlert) {
    return templates.sms.weatherAlert({
      chantier: alert.chantier || { nom: alert.chantier_nom, date_debut: alert.date_planifiee },
      weather: alert.weather,
      impact: alert.impact,
      company,
    });
  }

  // Fallback to inline generation
  const dateStr = formatDateFR(alert.date_planifiee);
  const weatherDesc = alert.weather.description;
  const rainPct = alert.weather.rain_probability;
  const impactLevel = alert.impact?.original || alert.impact;

  if (impactLevel === 'critique' && alert.suggestion.dates_alternatives?.length > 0) {
    const altDate = formatDateFR(alert.suggestion.dates_alternatives[0]);
    return `⚠️ Meteo defavorable ${dateStr} pour votre chantier (${weatherDesc}, pluie ${rainPct}%). Nous proposons de reporter au ${altDate}. Confirmez-vous ? Repondre OUI ou NON`;
  }

  if (impactLevel === 'critique') {
    return `⚠️ Meteo defavorable ${dateStr} pour votre chantier "${alert.chantier_nom}" (${weatherDesc}, pluie ${rainPct}%). Nous vous recontactons pour reprogrammer.`;
  }

  return `📢 Info meteo : Conditions difficiles prevues ${dateStr} pour votre chantier (${weatherDesc}). Nous surveillons la situation.`;
}

/**
 * Generate email subject and body for weather alert
 *
 * @param {WeatherAlert} alert - Weather alert
 * @param {Object} [company] - Company info
 * @returns {{subject: string, html: string, body?: string}}
 */
export function generateEmailContent(alert, company) {
  // Use template if available
  if (templates?.email?.weatherAlert) {
    return templates.email.weatherAlert({
      chantier: alert.chantier || { nom: alert.chantier_nom, date_debut: alert.date_planifiee },
      weather: alert.weather,
      impact: alert.impact,
      suggestion: alert.suggestion,
      company,
    });
  }

  // Fallback to inline generation
  const dateStr = formatDateFR(alert.date_planifiee);
  const impactLevel = alert.impact?.original || alert.impact;

  const subject =
    impactLevel === 'critique'
      ? `⚠️ Report possible - Chantier ${alert.chantier_nom}`
      : `📢 Info meteo - Chantier ${alert.chantier_nom}`;

  let body = `Bonjour,\n\n`;
  body += `Nous vous informons que les conditions meteo prevues pour le ${dateStr} `;
  body += `sont defavorables pour votre chantier "${alert.chantier_nom}".\n\n`;
  body += `Meteo prevue :\n`;
  body += `- ${alert.weather.description}\n`;
  body += `- Probabilite de pluie : ${alert.weather.rain_probability}%\n`;
  body += `- Vent : ${alert.weather.wind_speed} km/h\n`;
  body += `- Temperature : ${alert.weather.temp}°C\n\n`;

  if (impactLevel === 'critique' && alert.suggestion.dates_alternatives?.length > 0) {
    body += `Nous vous proposons de reporter aux dates suivantes :\n`;
    alert.suggestion.dates_alternatives.forEach((date, i) => {
      body += `${i + 1}. ${formatDateFR(date)}\n`;
    });
    body += `\nMerci de nous confirmer votre preference.\n`;
  } else if (impactLevel === 'modere') {
    body += `Nous prendrons les precautions necessaires (baches, protections).\n`;
    body += `Le chantier devrait pouvoir se derouler normalement.\n`;
  }

  body += `\nCordialement,\nVotre artisan`;

  return { subject, body };
}

/**
 * Send weather alert notification
 *
 * @param {WeatherAlert} alert - Weather alert
 * @param {string} userId - User ID
 * @param {Object} [options] - Options
 * @param {boolean} [options.sendSMS=false] - Send SMS
 * @param {boolean} [options.sendEmail=false] - Send email
 * @returns {Promise<{success: boolean, channels: string[]}>}
 */
export async function notifyWeatherAlert(alert, userId, options = {}) {
  const { sendSMS = false, sendEmail = false } = options;
  const channels = [];

  try {
    // Create dashboard notification
    if (supabase) {
      await supabase.from('ai_suggestions').insert([
        {
          user_id: userId,
          type: 'weather_alert',
          title: `Alerte meteo: ${alert.chantier_nom}`,
          description: alert.suggestion.reason,
          priority: alert.impact === 'critique' ? 'high' : 'medium',
          data: {
            alert_id: alert.id,
            chantier_id: alert.chantier_id,
            weather: alert.weather,
            suggestion: alert.suggestion,
          },
        },
      ]);
      channels.push('dashboard');
    }

    // Check if notification should be sent (less than 48h)
    const hoursUntil =
      (alert.date_planifiee.getTime() - Date.now()) / (1000 * 60 * 60);
    const shouldNotifyClient = hoursUntil <= 48 && hoursUntil > 0;

    if (shouldNotifyClient && sendSMS && alert.client_telephone) {
      // In real implementation, integrate with SMS provider (Twilio, etc.)
      console.log('[WeatherAlerts] SMS would be sent to:', alert.client_telephone);
      console.log('[WeatherAlerts] SMS content:', generateSMSMessage(alert));
      channels.push('sms');
    }

    if (shouldNotifyClient && sendEmail && alert.client_email) {
      // In real implementation, integrate with email provider
      const emailContent = generateEmailContent(alert);
      console.log('[WeatherAlerts] Email would be sent to:', alert.client_email);
      console.log('[WeatherAlerts] Email subject:', emailContent.subject);
      channels.push('email');
    }

    return { success: true, channels };
  } catch (error) {
    console.error('[WeatherAlerts] Error sending notification:', error);
    return { success: false, channels };
  }
}

// ============================================================================
// CRON JOB FUNCTION
// ============================================================================

/**
 * Daily weather check - to be called by cron job at 6am
 *
 * @param {string} userId - User ID
 * @returns {Promise<{alerts: WeatherAlert[], notified: number}>}
 */
export async function dailyWeatherCheck(userId) {
  console.log(`[WeatherAlerts] Running daily check for user ${userId} at ${new Date().toISOString()}`);

  // Check weather impact
  const alerts = await checkWeatherImpact(userId, 7);

  console.log(`[WeatherAlerts] Found ${alerts.length} weather alerts`);

  // Send notifications for critical and moderate alerts
  let notifiedCount = 0;
  for (const alert of alerts) {
    if (alert.impact === 'critique' || alert.impact === 'modere') {
      const result = await notifyWeatherAlert(alert, userId, {
        sendSMS: alert.impact === 'critique',
        sendEmail: true,
      });

      if (result.success) {
        notifiedCount++;
      }
    }
  }

  return {
    alerts,
    notified: notifiedCount,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date in French
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDateFR(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(date));
}

/**
 * Get weather icon component name
 *
 * @param {string} iconCode - OpenWeather icon code
 * @returns {string} Icon name
 */
export function getWeatherIconName(iconCode) {
  const iconMap = {
    '01d': 'sun',
    '01n': 'moon',
    '02d': 'cloud-sun',
    '02n': 'cloud-moon',
    '03d': 'cloud',
    '03n': 'cloud',
    '04d': 'clouds',
    '04n': 'clouds',
    '09d': 'cloud-rain',
    '09n': 'cloud-rain',
    '10d': 'cloud-sun-rain',
    '10n': 'cloud-moon-rain',
    '11d': 'cloud-lightning',
    '11n': 'cloud-lightning',
    '13d': 'snowflake',
    '13n': 'snowflake',
    '50d': 'wind',
    '50n': 'wind',
  };
  return iconMap[iconCode] || 'cloud';
}

/**
 * Get impact color class
 *
 * @param {WeatherImpact} impact - Impact level
 * @returns {string} Tailwind color class
 */
export function getImpactColor(impact) {
  switch (impact) {
    case 'critique':
      return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    case 'modere':
      return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    case 'faible':
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
  }
}

/**
 * Get impact label
 *
 * @param {WeatherImpact} impact - Impact level
 * @returns {string} Label
 */
export function getImpactLabel(impact) {
  switch (impact) {
    case 'critique':
      return 'Critique';
    case 'modere':
      return 'Modere';
    case 'faible':
      return 'Faible';
    default:
      return 'Inconnu';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export templates for convenience
export { templates } from './weatherNotificationTemplates';

export default {
  checkWeatherImpact,
  suggestRescheduling,
  rescheduleChantier,
  notifyWeatherAlert,
  dailyWeatherCheck,
  assessWeatherImpact,
  generateSuggestion,
  generateSMSMessage,
  generateEmailContent,
  formatDateFR,
  getWeatherIconName,
  getImpactColor,
  getImpactLabel,
  templates,
};
