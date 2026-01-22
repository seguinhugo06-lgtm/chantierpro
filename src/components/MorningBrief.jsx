import { useState, useEffect } from 'react';
import {
  Sun, CloudRain, Cloud, Wind, Thermometer, Calendar, Clock, MapPin,
  AlertTriangle, CheckCircle, FileText, Users, Euro, TrendingUp,
  ChevronRight, ChevronDown, Building2, Receipt, Phone, Bell, RefreshCw
} from 'lucide-react';
import { getUserWeather, checkWorkConditions } from '../services/WeatherService';

/**
 * MorningBrief - Daily summary widget for field workers
 * Shows at top of Dashboard with:
 * - Today's weather (affects outdoor work)
 * - Scheduled chantiers
 * - Pending actions (devis, factures, relances)
 * - Team availability
 * - Quick metrics
 */
export default function MorningBrief({
  chantiers = [],
  devis = [],
  clients = [],
  equipe = [],
  events = [],
  pointages = [],
  isDark = false,
  couleur = '#f97316',
  onNavigate,
  modeDiscret = false
}) {
  const [weather, setWeather] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // Fetch real weather data
  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async () => {
      setWeatherLoading(true);
      setWeatherError(null);

      try {
        const data = await getUserWeather();
        if (isMounted) {
          setWeather(data);
          setWeatherLoading(false);
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
        if (isMounted) {
          setWeatherError('Impossible de charger la meteo');
          setWeatherLoading(false);
          // Set fallback data
          setWeather({
            temp: 15,
            condition: 'cloudy',
            description: 'Meteo indisponible',
            humidity: 50,
            wind: 10,
            forecast: 'Verifiez votre connexion',
            isDefault: true
          });
        }
      }
    };

    fetchWeather();

    // Refresh weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Weather work conditions check
  const workConditions = weather ? checkWorkConditions(weather) : { favorable: true, warning: null };

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const chipBg = isDark ? 'bg-slate-700' : 'bg-slate-100';

  // Today's date
  const today = new Date().toISOString().split('T')[0];
  const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(currentTime);
  const dateFormatted = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(currentTime);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon apres-midi';
    return 'Bonsoir';
  };

  // Today's chantiers (en_cours with events today or scheduled)
  const todayChantiers = chantiers.filter(c => {
    if (c.statut !== 'en_cours') return false;
    const hasEvent = events.some(e => e.chantier_id === c.id && e.date === today);
    return hasEvent || c.date_debut === today;
  });

  // Chantiers en cours (for fallback if no specific events)
  const activeChantiers = chantiers.filter(c => c.statut === 'en_cours').slice(0, 3);

  // Pending actions
  const devisEnAttente = devis.filter(d => d.type === 'devis' && d.statut === 'brouillon');
  const devisAEnvoyer = devis.filter(d => d.type === 'devis' && d.statut === 'brouillon').length;
  const facturesImpayees = devis.filter(d => d.type === 'facture' && !['payee', 'brouillon'].includes(d.statut));
  const relancesUrgentes = facturesImpayees.filter(f => {
    const daysSince = Math.floor((new Date() - new Date(f.date)) / (1000 * 60 * 60 * 24));
    return daysSince > 30;
  });

  // Team availability today
  const todayPointages = pointages.filter(p => p.date === today);
  const equipeDisponible = equipe.filter(e => e.actif !== false);

  // Quick metrics
  const caThisMonth = devis
    .filter(d => d.type === 'facture' && d.statut === 'payee' && d.date?.startsWith(today.substring(0, 7)))
    .reduce((sum, d) => sum + (d.total_ttc || 0), 0);

  // Weather icon
  const WeatherIcon = () => {
    switch (weather?.condition) {
      case 'sunny': return <Sun size={24} className="text-amber-400" />;
      case 'rainy': return <CloudRain size={24} className="text-blue-400" />;
      case 'windy': return <Wind size={24} className="text-slate-400" />;
      default: return <Cloud size={24} className="text-slate-400" />;
    }
  };

  // Weather affects work warning
  const weatherWarning = weather?.condition === 'rainy' || (weather?.wind > 40);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`w-full mb-4 p-3 rounded-xl border ${borderColor} ${cardBg} flex items-center justify-between hover:shadow-md transition-all`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}15` }}>
            <Sun size={20} style={{ color: couleur }} />
          </div>
          <div className="text-left">
            <p className={`font-medium ${textPrimary}`}>{getGreeting()}</p>
            <p className={`text-sm ${textMuted}`}>{dayName} {dateFormatted}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(devisAEnvoyer > 0 || relancesUrgentes.length > 0) && (
            <span className="px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
              {devisAEnvoyer + relancesUrgentes.length} action{devisAEnvoyer + relancesUrgentes.length > 1 ? 's' : ''}
            </span>
          )}
          <ChevronRight size={20} className={textMuted} />
        </div>
      </button>
    );
  }

  return (
    <div className={`mb-6 rounded-2xl border ${borderColor} ${cardBg} overflow-hidden`}>
      {/* Header with gradient */}
      <div
        className="p-4 sm:p-5"
        style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Weather */}
            {weather && (
              <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white/80'}`}>
                <WeatherIcon />
                <p className={`text-lg font-bold mt-1 ${textPrimary}`}>{weather.temp}°C</p>
              </div>
            )}
            <div>
              <h2 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>
                {getGreeting()} !
              </h2>
              <p className={`${textMuted} capitalize`}>
                {dayName} {dateFormatted}
              </p>
              {weather && (
                <p className={`text-sm mt-1 ${textMuted}`}>
                  {weather.description} - {weather.forecast}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            aria-label="Reduire le briefing"
            title="Reduire"
          >
            <ChevronDown size={18} className={textMuted} />
          </button>
        </div>

        {/* Weather warning */}
        {weatherWarning && (
          <div className={`mt-3 p-3 rounded-xl flex items-center gap-3 ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
            <AlertTriangle size={18} className="text-amber-500" />
            <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              Conditions meteo defavorables - Verifiez la faisabilite des travaux exterieurs
            </p>
          </div>
        )}
      </div>

      {/* Content grid */}
      <div className="p-4 sm:p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Today's Chantiers */}
        <div className={`p-4 rounded-xl border ${borderColor} ${isDark ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={16} style={{ color: couleur }} />
            <h3 className={`font-semibold ${textPrimary}`}>Chantiers du jour</h3>
          </div>
          {(todayChantiers.length > 0 ? todayChantiers : activeChantiers).length > 0 ? (
            <div className="space-y-2">
              {(todayChantiers.length > 0 ? todayChantiers : activeChantiers).slice(0, 3).map(c => (
                <button
                  key={c.id}
                  onClick={() => onNavigate?.('chantiers', c.id)}
                  className={`w-full p-2 rounded-lg text-left flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/20">
                    <MapPin size={14} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${textPrimary}`}>{c.nom}</p>
                    <p className={`text-xs truncate ${textMuted}`}>{c.adresse?.substring(0, 30)}</p>
                  </div>
                  <ChevronRight size={14} className={textMuted} />
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${textMuted}`}>Aucun chantier programme</p>
          )}
        </div>

        {/* Pending Actions */}
        <div className={`p-4 rounded-xl border ${borderColor} ${isDark ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} style={{ color: couleur }} />
            <h3 className={`font-semibold ${textPrimary}`}>Actions en attente</h3>
          </div>
          <div className="space-y-2">
            {devisEnAttente.length > 0 && (
              <button
                onClick={() => {
                  // If only one devis, navigate directly to it
                  if (devisEnAttente.length === 1) {
                    onNavigate?.('devis', devisEnAttente[0], 'devis');
                  } else {
                    onNavigate?.('devis');
                  }
                }}
                className={`w-full p-2 rounded-lg text-left flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/20">
                  <FileText size={14} className="text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${textPrimary}`}>{devisEnAttente.length} brouillon{devisEnAttente.length > 1 ? 's' : ''} a finaliser</p>
                </div>
                <ChevronRight size={14} className={textMuted} />
              </button>
            )}
            {relancesUrgentes.length > 0 && (
              <button
                onClick={() => {
                  // If only one facture, navigate directly to it
                  if (relancesUrgentes.length === 1) {
                    onNavigate?.('devis', relancesUrgentes[0], 'devis');
                  } else {
                    onNavigate?.('devis');
                  }
                }}
                className={`w-full p-2 rounded-lg text-left flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/20">
                  <Receipt size={14} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${textPrimary}`}>{relancesUrgentes.length} facture{relancesUrgentes.length > 1 ? 's' : ''} a relancer</p>
                  <p className={`text-xs ${textMuted}`}>+30 jours</p>
                </div>
                <ChevronRight size={14} className={textMuted} />
              </button>
            )}
            {facturesImpayees.length > 0 && facturesImpayees.length !== relancesUrgentes.length && (
              <button
                onClick={() => onNavigate?.('devis')}
                className={`w-full p-2 rounded-lg text-left flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/20">
                  <Euro size={14} className="text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${textPrimary}`}>
                    {modeDiscret ? '***' : `${facturesImpayees.reduce((s, f) => s + (f.total_ttc || 0), 0).toLocaleString('fr-FR')} EUR`} en attente
                  </p>
                  <p className={`text-xs ${textMuted}`}>{facturesImpayees.length} facture{facturesImpayees.length > 1 ? 's' : ''}</p>
                </div>
                <ChevronRight size={14} className={textMuted} />
              </button>
            )}
            {devisAEnvoyer === 0 && relancesUrgentes.length === 0 && facturesImpayees.length === 0 && (
              <div className="flex items-center gap-2 p-2">
                <CheckCircle size={18} className="text-emerald-500" />
                <p className={`text-sm ${textMuted}`}>Tout est a jour !</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`p-4 rounded-xl border ${borderColor} ${isDark ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} style={{ color: couleur }} />
            <h3 className={`font-semibold ${textPrimary}`}>Apercu du mois</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className={`text-xs ${textMuted}`}>CA encaisse</p>
              <p className={`text-xl font-bold ${textPrimary}`}>
                {modeDiscret ? '***' : `${caThisMonth.toLocaleString('fr-FR')} EUR`}
              </p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className={`text-xs ${textMuted}`}>Chantiers actifs</p>
                <p className={`text-lg font-semibold ${textPrimary}`}>
                  {chantiers.filter(c => c.statut === 'en_cours').length}
                </p>
              </div>
              <div>
                <p className={`text-xs ${textMuted}`}>Equipe</p>
                <p className={`text-lg font-semibold ${textPrimary}`}>
                  {equipeDisponible.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className={`px-4 sm:px-5 pb-4 sm:pb-5 flex flex-wrap gap-2`}>
        <button
          onClick={() => onNavigate?.('planning')}
          className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${chipBg} ${textPrimary} hover:opacity-80 transition-opacity`}
        >
          <Calendar size={14} />
          Voir le planning
        </button>
        <button
          onClick={() => onNavigate?.('chantiers')}
          className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${chipBg} ${textPrimary} hover:opacity-80 transition-opacity`}
        >
          <Building2 size={14} />
          Tous les chantiers
        </button>
        {facturesImpayees.length > 0 && (
          <button
            onClick={() => onNavigate?.('devis')}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            <Phone size={14} />
            Relancer clients
          </button>
        )}
      </div>
    </div>
  );
}
