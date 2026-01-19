import { useState, useMemo } from 'react';
import {
  Calendar, Bell, Clock, AlertTriangle, Check, Plus,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';

/**
 * AdminCalendar - Rappels intelligents et calendrier personnalisé
 * Alertes push, échéances fiscales/sociales, snooze personnalisé
 */

const ECHEANCES_2026 = [
  // Janvier
  { id: 'tva-t4', date: '2026-01-20', title: 'Déclaration TVA T4 2025', type: 'fiscal', priority: 'high' },
  { id: 'cotis-t4', date: '2026-01-31', title: 'Cotisations URSSAF T4', type: 'social', priority: 'high' },

  // Février
  { id: 'dsn-jan', date: '2026-02-05', title: 'DSN Janvier', type: 'social', priority: 'high' },
  { id: 'cfe', date: '2026-02-28', title: 'Solde CFE 2025', type: 'fiscal', priority: 'medium' },

  // Mars
  { id: 'dsn-fev', date: '2026-03-05', title: 'DSN Février', type: 'social', priority: 'high' },

  // Avril
  { id: 'tva-t1', date: '2026-04-20', title: 'Déclaration TVA T1 2026', type: 'fiscal', priority: 'high' },
  { id: 'cotis-t1', date: '2026-04-30', title: 'Cotisations URSSAF T1', type: 'social', priority: 'high' },

  // Mai
  { id: 'doeth', date: '2026-05-01', title: 'DOETH 2025', type: 'social', priority: 'high' },
  { id: 'dsn-avr', date: '2026-05-05', title: 'DSN Avril', type: 'social', priority: 'high' },
  { id: 'ir', date: '2026-05-31', title: 'Déclaration Impôt Revenu', type: 'fiscal', priority: 'high' },

  // Septembre
  { id: 'efacture', date: '2026-09-01', title: '⚡ E-Facture obligatoire', type: 'legal', priority: 'critical' },
];

const REMINDER_PRESETS = [
  { label: '1 jour avant', days: 1 },
  { label: '3 jours avant', days: 3 },
  { label: '1 semaine avant', days: 7 },
  { label: '2 semaines avant', days: 14 },
];

export default function AdminCalendar({ isDark = false, couleur = '#f97316' }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0)); // Janvier 2026
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [filter, setFilter] = useState('all');
  const [customReminders, setCustomReminders] = useState([]);
  const [snoozed, setSnoozed] = useState({});

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';

  const today = new Date();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days = [];

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth]);

  // Get events for a date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return ECHEANCES_2026.filter(e => e.date === dateStr);
  };

  // Filter events
  const filteredEcheances = useMemo(() => {
    let events = ECHEANCES_2026;
    if (filter !== 'all') {
      events = events.filter(e => e.type === filter);
    }
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filter]);

  // Upcoming events (next 30 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return filteredEcheances.filter(e => {
      const d = new Date(e.date);
      return d >= now && d <= in30Days;
    });
  }, [filteredEcheances]);

  const handleSnooze = (eventId, days) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    setSnoozed(prev => ({ ...prev, [eventId]: newDate.toISOString() }));
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'critical':
        return { bg: 'bg-red-500', text: 'text-red-500', light: isDark ? 'bg-red-900/30' : 'bg-red-50' };
      case 'high':
        return { bg: 'bg-amber-500', text: 'text-amber-500', light: isDark ? 'bg-amber-900/30' : 'bg-amber-50' };
      default:
        return { bg: 'bg-blue-500', text: 'text-blue-500', light: isDark ? 'bg-blue-900/30' : 'bg-blue-50' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'fiscal': return '💰';
      case 'social': return '👥';
      case 'legal': return '⚖️';
      default: return '📅';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Calendrier Administratif</h2>
          <p className={`text-sm ${textMuted} mt-1`}>
            Ne rate plus aucune échéance
          </p>
        </div>
        <button
          onClick={() => setShowAddReminder(true)}
          className="px-4 py-2 rounded-xl text-white font-medium flex items-center gap-2 hover:shadow-lg transition-shadow"
          style={{ background: couleur }}
        >
          <Plus size={16} />
          Ajouter rappel
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'Tout', icon: Calendar },
          { id: 'fiscal', label: 'Fiscal', icon: null, emoji: '💰' },
          { id: 'social', label: 'Social', icon: null, emoji: '👥' },
          { id: 'legal', label: 'Légal', icon: null, emoji: '⚖️' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.id
                ? 'text-white'
                : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
            }`}
            style={filter === f.id ? { background: couleur } : {}}
          >
            {f.emoji || (f.icon && <f.icon size={14} className="inline mr-1" />)}
            {f.label}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`p-4 rounded-2xl ${cardBg} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <ChevronLeft size={20} className={textMuted} />
          </button>
          <h3 className={`font-bold ${textPrimary}`}>
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <ChevronRight size={20} className={textMuted} />
          </button>
        </div>

        {/* Days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className={`text-center text-xs font-medium py-2 ${textMuted}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const events = getEventsForDate(day.date);
            const isToday = day.date.toDateString() === today.toDateString();
            const hasEvents = events.length > 0;

            return (
              <button
                key={i}
                onClick={() => hasEvents && setSelectedDate(day.date)}
                className={`aspect-square p-1 rounded-lg text-center transition-all ${
                  !day.isCurrentMonth
                    ? 'opacity-30'
                    : isToday
                      ? 'ring-2 ring-offset-2'
                      : hasEvents
                        ? 'cursor-pointer hover:scale-105'
                        : ''
                } ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                style={isToday ? { ringColor: couleur } : {}}
              >
                <span className={`text-sm ${isToday ? 'font-bold' : ''} ${textPrimary}`}>
                  {day.date.getDate()}
                </span>
                {hasEvents && (
                  <div className="flex justify-center mt-1 gap-0.5">
                    {events.slice(0, 3).map((e, j) => (
                      <div
                        key={j}
                        className={`w-1.5 h-1.5 rounded-full ${getPriorityStyle(e.priority).bg}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming events list */}
      <div className={`p-4 rounded-2xl ${cardBg} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} style={{ color: couleur }} />
          <h3 className={`font-bold ${textPrimary}`}>Prochaines échéances</h3>
        </div>

        <div className="space-y-2">
          {upcomingEvents.length === 0 ? (
            <p className={`text-center py-6 ${textMuted}`}>
              Aucune échéance dans les 30 prochains jours 🎉
            </p>
          ) : (
            upcomingEvents.map(event => {
              const style = getPriorityStyle(event.priority);
              const daysLeft = Math.ceil((new Date(event.date) - today) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl ${style.light} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{getTypeIcon(event.type)}</span>
                      <div>
                        <p className={`font-medium ${textPrimary}`}>{event.title}</p>
                        <p className={`text-sm ${textMuted} mt-1`}>
                          {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${daysLeft <= 7 ? 'text-red-500' : daysLeft <= 14 ? 'text-amber-500' : textMuted}`}>
                        J-{daysLeft}
                      </span>
                      <div className="flex gap-1 mt-2">
                        {REMINDER_PRESETS.slice(0, 2).map(preset => (
                          <button
                            key={preset.days}
                            onClick={() => handleSnooze(event.id, preset.days)}
                            className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-slate-50'}`}
                          >
                            <Bell size={10} className="inline mr-1" />
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Fun messages */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'} border ${isDark ? 'border-emerald-700' : 'border-emerald-200'}`}>
        <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
          💬 <em>"Oups, l'URSSAF attend ta DSN – ne les fais pas attendre !"</em>
        </p>
      </div>

      {/* Event detail modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedDate(null)} />
          <div className={`relative max-w-md w-full p-6 rounded-3xl ${cardBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold ${textPrimary}`}>
                {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => setSelectedDate(null)} className={textMuted}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {getEventsForDate(selectedDate).map(event => (
                <div key={event.id} className={`p-4 rounded-xl ${getPriorityStyle(event.priority).light}`}>
                  <div className="flex items-center gap-2">
                    <span>{getTypeIcon(event.type)}</span>
                    <p className={`font-medium ${textPrimary}`}>{event.title}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className={`w-full mt-4 py-3 rounded-xl font-medium ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
