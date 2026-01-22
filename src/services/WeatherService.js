/**
 * WeatherService - Real weather data for Dashboard and Chantiers
 * Uses OpenWeatherMap API (free tier: 60 calls/minute)
 *
 * Features:
 * - User location weather for Dashboard
 * - Per-chantier weather based on coordinates
 * - Graceful fallback to cached/default data
 * - French language support
 */

// Cache weather data to avoid excessive API calls
const WEATHER_CACHE_KEY = 'chantierpro_weather_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// OpenWeatherMap condition mapping
const CONDITION_MAP = {
  // Clear
  800: 'sunny',
  // Clouds
  801: 'sunny', // few clouds
  802: 'cloudy',
  803: 'cloudy',
  804: 'cloudy',
  // Rain
  500: 'rainy',
  501: 'rainy',
  502: 'rainy',
  503: 'rainy',
  504: 'rainy',
  511: 'rainy',
  520: 'rainy',
  521: 'rainy',
  522: 'rainy',
  531: 'rainy',
  // Drizzle
  300: 'rainy',
  301: 'rainy',
  302: 'rainy',
  310: 'rainy',
  311: 'rainy',
  312: 'rainy',
  313: 'rainy',
  314: 'rainy',
  321: 'rainy',
  // Thunderstorm
  200: 'rainy',
  201: 'rainy',
  202: 'rainy',
  210: 'rainy',
  211: 'rainy',
  212: 'rainy',
  221: 'rainy',
  230: 'rainy',
  231: 'rainy',
  232: 'rainy',
  // Snow
  600: 'cloudy',
  601: 'cloudy',
  602: 'cloudy',
  611: 'cloudy',
  612: 'cloudy',
  613: 'cloudy',
  615: 'cloudy',
  616: 'cloudy',
  620: 'cloudy',
  621: 'cloudy',
  622: 'cloudy',
  // Atmosphere (fog, mist, etc.)
  701: 'cloudy',
  711: 'cloudy',
  721: 'cloudy',
  731: 'windy',
  741: 'cloudy',
  751: 'windy',
  761: 'windy',
  762: 'windy',
  771: 'windy',
  781: 'windy'
};

/**
 * Get weather condition from OpenWeatherMap code
 * @param {number} code - Weather condition code
 * @param {number} windSpeed - Wind speed in m/s
 * @returns {string} Condition: 'sunny' | 'cloudy' | 'rainy' | 'windy'
 */
function getCondition(code, windSpeed) {
  // High wind overrides other conditions
  if (windSpeed > 10) return 'windy'; // > 36 km/h
  return CONDITION_MAP[code] || 'cloudy';
}

/**
 * Get cached weather data
 * @param {string} key - Cache key (e.g., "user" or chantier ID)
 * @returns {Object|null}
 */
function getCachedWeather(key) {
  try {
    const cache = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || '{}');
    const entry = cache[key];
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Save weather data to cache
 * @param {string} key - Cache key
 * @param {Object} data - Weather data
 */
function setCachedWeather(key, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || '{}');
    cache[key] = { data, timestamp: Date.now() };
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Fetch weather from OpenWeatherMap API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>}
 */
async function fetchWeatherFromAPI(lat, lon) {
  const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.warn('OpenWeatherMap API key not configured (VITE_OPENWEATHERMAP_API_KEY)');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=fr`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      condition: getCondition(data.weather[0].id, data.wind.speed),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      wind: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      forecast: data.weather[0].description,
      location: data.name,
      icon: data.weather[0].icon,
      code: data.weather[0].id,
      feelsLike: Math.round(data.main.feels_like),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

/**
 * Get user's current position
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not available'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

/**
 * Get weather for user's current location
 * @returns {Promise<Object>}
 */
export async function getUserWeather() {
  // Check cache first
  const cached = getCachedWeather('user');
  if (cached) return cached;

  try {
    const position = await getCurrentPosition();
    const weather = await fetchWeatherFromAPI(position.latitude, position.longitude);

    if (weather) {
      setCachedWeather('user', weather);
      return weather;
    }
  } catch (error) {
    console.warn('Could not get user weather:', error);
  }

  // Return fallback data
  return getDefaultWeather();
}

/**
 * Get weather for a specific chantier
 * @param {Object} chantier - Chantier with latitude/longitude
 * @returns {Promise<Object>}
 */
export async function getChantierWeather(chantier) {
  if (!chantier?.latitude || !chantier?.longitude) {
    return getDefaultWeather();
  }

  // Check cache first
  const cacheKey = `chantier_${chantier.id}`;
  const cached = getCachedWeather(cacheKey);
  if (cached) return cached;

  const weather = await fetchWeatherFromAPI(chantier.latitude, chantier.longitude);

  if (weather) {
    setCachedWeather(cacheKey, weather);
    return weather;
  }

  return getDefaultWeather();
}

/**
 * Get weather for multiple chantiers
 * @param {Array} chantiers - Array of chantiers with coordinates
 * @returns {Promise<Map<string, Object>>}
 */
export async function getMultipleChantierWeather(chantiers) {
  const results = new Map();

  // Filter chantiers with coordinates
  const chantiersWithCoords = chantiers.filter(c => c.latitude && c.longitude);

  // Fetch weather for each (with rate limiting)
  for (const chantier of chantiersWithCoords) {
    const weather = await getChantierWeather(chantier);
    results.set(chantier.id, weather);

    // Small delay to avoid rate limiting (free tier: 60/min)
    if (chantiersWithCoords.indexOf(chantier) < chantiersWithCoords.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Get default/fallback weather data
 * @returns {Object}
 */
export function getDefaultWeather() {
  return {
    temp: 15,
    condition: 'cloudy',
    description: 'Donnees meteo indisponibles',
    humidity: 50,
    wind: 10,
    forecast: 'Verifiez votre connexion internet',
    location: null,
    isDefault: true,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Check if weather conditions are favorable for outdoor work
 * @param {Object} weather - Weather data
 * @returns {Object} { favorable: boolean, warning: string | null }
 */
export function checkWorkConditions(weather) {
  if (!weather) return { favorable: true, warning: null };

  const warnings = [];

  if (weather.condition === 'rainy') {
    warnings.push('Pluie prevue - Verifiez la faisabilite des travaux exterieurs');
  }

  if (weather.wind > 40) {
    warnings.push('Vent fort (> 40 km/h) - Attention aux travaux en hauteur');
  }

  if (weather.temp < 0) {
    warnings.push('Gel - Attention aux conditions de travail');
  }

  if (weather.temp > 35) {
    warnings.push('Forte chaleur - Prevoyez des pauses regulieres');
  }

  return {
    favorable: warnings.length === 0,
    warning: warnings.length > 0 ? warnings.join('. ') : null
  };
}

/**
 * Clear weather cache
 */
export function clearWeatherCache() {
  localStorage.removeItem(WEATHER_CACHE_KEY);
}

export default {
  getUserWeather,
  getChantierWeather,
  getMultipleChantierWeather,
  getDefaultWeather,
  checkWorkConditions,
  clearWeatherCache
};
