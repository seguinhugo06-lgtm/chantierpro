import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  AlertTriangle,
  Cloud,
  CloudRain,
  Sun,
  CloudSun,
  Snowflake,
  Wind,
  Loader2,
  Users,
  MapPin,
  Clock,
  X,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { supabase } from '../../supabaseClient';

/**
 * @typedef {'month' | 'week' | 'day'} CalendarView
 */

/**
 * @typedef {Object} WeatherData
 * @property {Date} date
 * @property {number} temp
 * @property {string} icon
 * @property {string} description
 * @property {number} rain
 */

/**
 * @typedef {Object} CalendarEvent
 * @property {string} id
 * @property {string} title
 * @property {Date} start
 * @property {Date} end
 * @property {string} backgroundColor
 * @property {string} borderColor
 * @property {boolean} allDay
 * @property {Object} extendedProps
 */

/**
 * @typedef {Object} ConflictInfo
 * @property {string} id
 * @property {string} nom
 * @property {string} client_nom
 * @property {Date} date_debut
 * @property {Date} date_fin
 */

/**
 * @typedef {Object} CalendarProps
 * @property {string} userId - User ID for data fetching
 * @property {CalendarView} [view='month'] - Initial view
 * @property {(chantier: Object) => void} [onEventClick] - Event click handler
 * @property {(start: Date, end: Date) => void} [onDateSelect] - Date selection handler
 * @property {string} [className] - Additional CSS classes
 */

// Status color mapping
const STATUS_COLORS = {
  planifie: { bg: '#3b82f6', border: '#2563eb' }, // Blue
  en_cours: { bg: '#22c55e', border: '#16a34a' }, // Green
  termine: { bg: '#9ca3af', border: '#6b7280' }, // Gray
  en_retard: { bg: '#ef4444', border: '#dc2626' }, // Red
  suspendu: { bg: '#f59e0b', border: '#d97706' }, // Amber
};

// Weather icon mapping
const WEATHER_ICONS = {
  '01d': Sun,
  '01n': Sun,
  '02d': CloudSun,
  '02n': CloudSun,
  '03d': Cloud,
  '03n': Cloud,
  '04d': Cloud,
  '04n': Cloud,
  '09d': CloudRain,
  '09n': CloudRain,
  '10d': CloudRain,
  '10n': CloudRain,
  '11d': CloudRain,
  '11n': CloudRain,
  '13d': Snowflake,
  '13n': Snowflake,
  '50d': Wind,
  '50n': Wind,
};

// View mapping for FullCalendar
const VIEW_MAP = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
};

/**
 * Weather badge component for day cells
 */
function WeatherBadge({ weather }) {
  if (!weather) return null;

  const IconComponent = WEATHER_ICONS[weather.icon] || Cloud;
  const isRainy = weather.rain > 0 || weather.icon?.includes('09') || weather.icon?.includes('10');

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
        isRainy ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'
      )}
    >
      <IconComponent className="w-3 h-3" />
      <span>{weather.temp}°</span>
    </div>
  );
}

/**
 * Custom event content renderer
 */
function EventContent({ event, weather, hasConflict, isOverloaded }) {
  const chantier = event.extendedProps?.chantier;
  const isRainy = weather?.rain > 0;

  return (
    <div className="w-full h-full p-1 overflow-hidden">
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-tight">
            {event.title}
          </p>
          {chantier?.client_nom && (
            <p className="text-[10px] opacity-80 truncate">
              {chantier.client_nom}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {hasConflict && (
            <AlertTriangle className="w-3 h-3 text-red-200" />
          )}
          {isOverloaded && (
            <Users className="w-3 h-3 text-amber-200" />
          )}
          {isRainy && (
            <CloudRain className="w-3 h-3 text-blue-200" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Reschedule confirmation modal
 */
function RescheduleModal({
  isOpen,
  onClose,
  onConfirm,
  chantier,
  newStart,
  newEnd,
  conflicts,
  isLoading,
}) {
  if (!chantier) return null;

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Confirmer le deplacement</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          {/* Chantier info */}
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white">
              {chantier.nom}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {chantier.client_nom}
            </p>
          </div>

          {/* New dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nouvelle date debut</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(newStart)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nouvelle date fin</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(newEnd)}
              </p>
            </div>
          </div>

          {/* Conflicts warning */}
          {conflicts && conflicts.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Conflit detecte !
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    {conflicts.length} chantier{conflicts.length > 1 ? 's' : ''} utilise{conflicts.length > 1 ? 'nt' : ''} la meme equipe sur cette periode :
                  </p>
                  <ul className="mt-2 space-y-1">
                    {conflicts.map((c) => (
                      <li key={c.id} className="text-xs text-red-600 dark:text-red-300">
                        • {c.nom} ({c.client_nom})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          variant={conflicts?.length > 0 ? 'danger' : 'primary'}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Enregistrement...
            </>
          ) : conflicts?.length > 0 ? (
            'Confirmer malgre le conflit'
          ) : (
            'Confirmer'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Calendar component with FullCalendar
 *
 * @param {CalendarProps} props
 */
export default function Calendar({
  userId,
  view = 'month',
  onEventClick,
  onDateSelect,
  className,
}) {
  const calendarRef = useRef(null);

  // State
  const [currentView, setCurrentView] = useState(view);
  const [loading, setLoading] = useState(true);
  const [chantiers, setChantiers] = useState([]);
  const [weather, setWeather] = useState({});
  const [conflicts, setConflicts] = useState(new Map());
  const [currentDate, setCurrentDate] = useState(new Date());

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    chantier: null,
    newStart: null,
    newEnd: null,
    conflicts: [],
    eventInfo: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch chantiers
  const fetchChantiers = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chantiers')
        .select(`
          *,
          client:clients(nom, prenom),
          equipe:equipes(id, nom)
        `)
        .eq('user_id', userId)
        .not('date_debut', 'is', null);

      if (error) throw error;

      setChantiers(data || []);
      detectConflicts(data || []);
    } catch (error) {
      console.error('Error fetching chantiers:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch weather forecast
  const fetchWeather = useCallback(async () => {
    // Get API key from environment or skip if not available
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.warn('OpenWeather API key not configured');
      return;
    }

    try {
      // Default to Paris coordinates, could be user's location
      const lat = 48.8566;
      const lng = 2.3522;

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=fr`
      );

      if (!response.ok) throw new Error('Weather fetch failed');

      const data = await response.json();

      // Transform to date-indexed map
      const weatherMap = {};
      data.list.forEach((item) => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toISOString().split('T')[0];

        // Keep midday forecast for each day
        if (!weatherMap[dateKey] || date.getHours() === 12) {
          weatherMap[dateKey] = {
            date,
            temp: Math.round(item.main.temp),
            icon: item.weather[0].icon,
            description: item.weather[0].description,
            rain: item.rain?.['3h'] || 0,
          };
        }
      });

      setWeather(weatherMap);
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  }, []);

  // Detect conflicts between chantiers
  const detectConflicts = useCallback((chantiersList) => {
    const conflictMap = new Map();

    for (let i = 0; i < chantiersList.length; i++) {
      const c1 = chantiersList[i];
      if (!c1.equipe_id || !c1.date_debut || !c1.date_fin) continue;

      const start1 = new Date(c1.date_debut);
      const end1 = new Date(c1.date_fin);

      for (let j = i + 1; j < chantiersList.length; j++) {
        const c2 = chantiersList[j];
        if (!c2.equipe_id || !c2.date_debut || !c2.date_fin) continue;

        // Same team
        if (c1.equipe_id !== c2.equipe_id) continue;

        const start2 = new Date(c2.date_debut);
        const end2 = new Date(c2.date_fin);

        // Check overlap
        if (start1 <= end2 && end1 >= start2) {
          conflictMap.set(c1.id, [...(conflictMap.get(c1.id) || []), c2.id]);
          conflictMap.set(c2.id, [...(conflictMap.get(c2.id) || []), c1.id]);
        }
      }
    }

    setConflicts(conflictMap);
  }, []);

  // Check conflicts for a specific move
  const checkMoveConflicts = useCallback(
    async (chantierId, newStart, newEnd, equipeId) => {
      if (!equipeId) return [];

      const { data, error } = await supabase
        .from('chantiers')
        .select('id, nom, client:clients(nom)')
        .eq('user_id', userId)
        .eq('equipe_id', equipeId)
        .neq('id', chantierId)
        .lte('date_debut', newEnd.toISOString())
        .gte('date_fin', newStart.toISOString());

      if (error) {
        console.error('Error checking conflicts:', error);
        return [];
      }

      return (data || []).map((c) => ({
        id: c.id,
        nom: c.nom,
        client_nom: c.client?.nom || 'Client inconnu',
      }));
    },
    [userId]
  );

  // Initial fetch
  useEffect(() => {
    fetchChantiers();
    fetchWeather();
  }, [fetchChantiers, fetchWeather]);

  // Transform chantiers to calendar events
  const events = useMemo(() => {
    return chantiers.map((chantier) => {
      // Determine status and color
      let status = chantier.statut || 'planifie';
      const now = new Date();
      const endDate = chantier.date_fin ? new Date(chantier.date_fin) : null;

      // Check if overdue
      if (status === 'en_cours' && endDate && endDate < now) {
        status = 'en_retard';
      }

      const colors = STATUS_COLORS[status] || STATUS_COLORS.planifie;
      const hasConflict = conflicts.has(chantier.id);

      // Client name
      const clientName = chantier.client
        ? `${chantier.client.prenom || ''} ${chantier.client.nom || ''}`.trim()
        : '';

      return {
        id: chantier.id,
        title: chantier.nom,
        start: chantier.date_debut,
        end: chantier.date_fin || chantier.date_debut,
        backgroundColor: colors.bg,
        borderColor: hasConflict ? '#ef4444' : colors.border,
        borderWidth: hasConflict ? 2 : 1,
        allDay: !chantier.heure_debut,
        extendedProps: {
          chantier: {
            ...chantier,
            client_nom: clientName,
          },
          hasConflict,
          status,
        },
      };
    });
  }, [chantiers, conflicts]);

  // Handle event click
  const handleEventClick = useCallback(
    (info) => {
      const chantier = info.event.extendedProps?.chantier;
      if (chantier && onEventClick) {
        onEventClick(chantier);
      }
    },
    [onEventClick]
  );

  // Handle date selection
  const handleDateSelect = useCallback(
    (info) => {
      if (onDateSelect) {
        onDateSelect(info.start, info.end);
      }
    },
    [onDateSelect]
  );

  // Handle event drag start
  const handleEventDragStart = useCallback((info) => {
    // Add visual feedback
    info.el.style.opacity = '0.7';
  }, []);

  // Handle event drop (drag end)
  const handleEventDrop = useCallback(
    async (info) => {
      info.el.style.opacity = '1';

      const chantier = info.event.extendedProps?.chantier;
      if (!chantier) return;

      const newStart = info.event.start;
      const newEnd = info.event.end || newStart;

      // Check for conflicts
      const moveConflicts = await checkMoveConflicts(
        chantier.id,
        newStart,
        newEnd,
        chantier.equipe_id
      );

      // Open confirmation modal
      setRescheduleModal({
        isOpen: true,
        chantier,
        newStart,
        newEnd,
        conflicts: moveConflicts,
        eventInfo: info,
      });
    },
    [checkMoveConflicts]
  );

  // Handle event resize
  const handleEventResize = useCallback(
    async (info) => {
      const chantier = info.event.extendedProps?.chantier;
      if (!chantier) return;

      const newStart = info.event.start;
      const newEnd = info.event.end;

      // Check for conflicts
      const moveConflicts = await checkMoveConflicts(
        chantier.id,
        newStart,
        newEnd,
        chantier.equipe_id
      );

      // Open confirmation modal
      setRescheduleModal({
        isOpen: true,
        chantier,
        newStart,
        newEnd,
        conflicts: moveConflicts,
        eventInfo: info,
      });
    },
    [checkMoveConflicts]
  );

  // Confirm reschedule
  const handleConfirmReschedule = useCallback(async () => {
    const { chantier, newStart, newEnd, eventInfo } = rescheduleModal;
    if (!chantier) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('chantiers')
        .update({
          date_debut: newStart.toISOString(),
          date_fin: newEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chantier.id);

      if (error) throw error;

      // Refresh data
      await fetchChantiers();

      // Close modal
      setRescheduleModal({ isOpen: false, chantier: null, newStart: null, newEnd: null, conflicts: [], eventInfo: null });
    } catch (error) {
      console.error('Error updating chantier:', error);
      // Revert the drag/resize
      if (eventInfo?.revert) {
        eventInfo.revert();
      }
    } finally {
      setIsSaving(false);
    }
  }, [rescheduleModal, fetchChantiers]);

  // Cancel reschedule
  const handleCancelReschedule = useCallback(() => {
    const { eventInfo } = rescheduleModal;
    if (eventInfo?.revert) {
      eventInfo.revert();
    }
    setRescheduleModal({ isOpen: false, chantier: null, newStart: null, newEnd: null, conflicts: [], eventInfo: null });
  }, [rescheduleModal]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.prev();
      setCurrentDate(api.getDate());
    }
  }, []);

  const handleNext = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.next();
      setCurrentDate(api.getDate());
    }
  }, []);

  const handleToday = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.today();
      setCurrentDate(api.getDate());
    }
  }, []);

  const handleViewChange = useCallback((newView) => {
    setCurrentView(newView);
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(VIEW_MAP[newView]);
    }
  }, []);

  // Format current date range for header
  const dateRangeText = useMemo(() => {
    const options = { month: 'long', year: 'numeric' };
    if (currentView === 'month') {
      return new Intl.DateTimeFormat('fr-FR', options).format(currentDate);
    }
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(currentDate);
  }, [currentDate, currentView]);

  // Day cell content with weather
  const dayCellContent = useCallback(
    (arg) => {
      const dateKey = arg.date.toISOString().split('T')[0];
      const dayWeather = weather[dateKey];
      const isRainy = dayWeather?.rain > 0;

      return (
        <div className={cn('w-full', isRainy && 'bg-amber-50 dark:bg-amber-900/10')}>
          <div className="flex items-center justify-between p-1">
            <span className={cn(
              'text-sm font-medium',
              arg.isToday && 'bg-primary-500 text-white rounded-full w-7 h-7 flex items-center justify-center'
            )}>
              {arg.dayNumberText}
            </span>
            {dayWeather && <WeatherBadge weather={dayWeather} />}
          </div>
        </div>
      );
    },
    [weather]
  );

  // Custom event content
  const eventContent = useCallback(
    (arg) => {
      const dateKey = arg.event.start?.toISOString().split('T')[0];
      const eventWeather = weather[dateKey];
      const hasConflict = arg.event.extendedProps?.hasConflict;

      return (
        <EventContent
          event={arg.event}
          weather={eventWeather}
          hasConflict={hasConflict}
        />
      );
    },
    [weather]
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white ml-2 capitalize">
            {dateRangeText}
          </h2>
        </div>

        {/* View switcher & actions */}
        <div className="flex items-center gap-2">
          {/* View buttons */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
            {['month', 'week', 'day'].map((v) => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                  currentView === v
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Jour'}
              </button>
            ))}
          </div>

          {/* New chantier button */}
          {onDateSelect && (
            <Button variant="primary" size="sm" onClick={() => onDateSelect(new Date(), new Date())}>
              <Plus className="w-4 h-4 mr-1" />
              Nouveau chantier
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.planifie.bg }} />
          <span className="text-gray-600 dark:text-gray-400">Planifie</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.en_cours.bg }} />
          <span className="text-gray-600 dark:text-gray-400">En cours</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.termine.bg }} />
          <span className="text-gray-600 dark:text-gray-400">Termine</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.en_retard.bg }} />
          <span className="text-gray-600 dark:text-gray-400">En retard</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span className="text-gray-600 dark:text-gray-400">Conflit equipe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CloudRain className="w-3 h-3 text-amber-500" />
          <span className="text-gray-600 dark:text-gray-400">Meteo pluie</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={VIEW_MAP[view]}
            locale="fr"
            firstDay={1}
            height="100%"
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            nowIndicator={true}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            allDaySlot={true}
            allDayText="Journee"
            eventClick={handleEventClick}
            select={handleDateSelect}
            eventDragStart={handleEventDragStart}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            dayCellContent={dayCellContent}
            eventContent={eventContent}
            headerToolbar={false}
            buttonText={{
              today: "Aujourd'hui",
              month: 'Mois',
              week: 'Semaine',
              day: 'Jour',
            }}
            moreLinkText={(n) => `+${n} autres`}
            noEventsText="Aucun chantier"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
          />
        )}
      </div>

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={rescheduleModal.isOpen}
        onClose={handleCancelReschedule}
        onConfirm={handleConfirmReschedule}
        chantier={rescheduleModal.chantier}
        newStart={rescheduleModal.newStart}
        newEnd={rescheduleModal.newEnd}
        conflicts={rescheduleModal.conflicts}
        isLoading={isSaving}
      />
    </div>
  );
}

/**
 * CalendarSkeleton - Loading skeleton for the calendar
 */
export function CalendarSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-9 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-9 w-9 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded ml-2" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-48 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-9 w-36 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>

      {/* Calendar skeleton */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
        {/* Days header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-slate-800 rounded" />
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 dark:bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
