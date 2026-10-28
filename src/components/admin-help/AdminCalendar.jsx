import { useState, useMemo } from 'react';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, Banknote, Users, Scale, CalendarDays,
} from 'lucide-react';
import { jourLocal, dateLue } from '../../lib/dates';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';

/**
 * AdminCalendar - Rappels intelligents et calendrier personnalisé
 * Échéances fiscales et sociales
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
  { id: 'efacture', date: '2026-09-01', title: 'E-Facture obligatoire', type: 'legal', priority: 'critical' },
];

// Les types d'échéance : une icône et deux libellés (court pour les boutons)
const TYPES_ECHEANCE = {
  custom: { icone: CalendarDays, court: 'Perso' },
  fiscal: { icone: Banknote, court: 'Fiscal' },
  social: { icone: Users, court: 'Social' },
  legal: { icone: Scale, court: 'Légal' },
};
const typeDe = (type) => TYPES_ECHEANCE[type] || TYPES_ECHEANCE.custom;
function IconeType({ type, size = 22, className = '' }) {
  const Icone = typeDe(type).icone;
  return <Icone size={size} className={`flex-shrink-0 text-encre-2 ${className}`} aria-hidden="true" />;
}

export default function AdminCalendar({ isDark: _isDark = false, couleur: _couleur }) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth())); // le mois en cours
  const [selectedDate, setSelectedDate] = useState(null);
  const [filter, setFilter] = useState('all');

  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-2';
  const cardBg = 'bg-surface';

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
    const dateStr = jourLocal(date);
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

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'critical':
        return { bg: 'bg-danger-point', text: 'text-danger-texte', light: 'bg-danger-fond' };
      case 'high':
        return { bg: 'bg-alerte-point', text: 'text-alerte-texte', light: 'bg-alerte-fond' };
      default:
        return { bg: 'bg-info-point', text: 'text-info-texte', light: 'bg-info-fond' };
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
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'Tout', icon: Calendar },
          { id: 'fiscal', label: 'Fiscal', icon: Banknote },
          { id: 'social', label: 'Social', icon: Users },
          { id: 'legal', label: 'Légal', icon: Scale },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
              filter === f.id
                ? 'bg-accent text-sur-accent'
                : 'bg-surface-2 text-encre-2'
            }`}
            aria-pressed={filter === f.id}
          >
            <f.icon size={14} aria-hidden="true" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`p-4 rounded-2xl ${cardBg} border border-bord`}>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-2"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={20} className={textMuted} aria-hidden="true" />
          </button>
          <h3 className={`font-bold ${textPrimary}`}>
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-2"
            aria-label="Mois suivant"
          >
            <ChevronRight size={20} className={textMuted} aria-hidden="true" />
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
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface'
                      : hasEvents
                        ? 'cursor-pointer hover:scale-105'
                        : ''
                } hover:bg-surface-2`}
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
      <div className={`p-4 rounded-2xl ${cardBg} border border-bord`}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-accent-texte" />
          <h3 className={`font-bold ${textPrimary}`}>Prochaines échéances</h3>
        </div>

        <div className="space-y-2">
          {upcomingEvents.length === 0 ? (
            <p className={`text-center py-6 ${textMuted}`}>
              Aucune échéance dans les 30 prochains jours
            </p>
          ) : (
            upcomingEvents.map(event => {
              const style = getPriorityStyle(event.priority);
              const daysLeft = Math.ceil((new Date(event.date) - today) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl ${style.light} border border-bord`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <IconeType type={event.type} className="mt-0.5" />
                      <div>
                        <p className={`font-medium ${textPrimary}`}>{event.title}</p>
                        <p className={`text-sm ${textMuted} mt-1`}>
                          {dateLue(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${daysLeft <= 7 ? 'text-danger-texte' : daysLeft <= 14 ? 'text-alerte-texte' : textMuted}`}>
                        J-{daysLeft}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Fun messages */}
      <div className={`p-4 rounded-xl bg-succes-fond border border-succes-point/40`}>
        <p className={`text-sm text-succes-texte`}>
          <em>"Oups, l'URSSAF attend ta DSN – ne les fais pas attendre !"</em>
        </p>
      </div>

      {/* Event detail modal */}
      <Modal isOpen={!!selectedDate} onClose={() => setSelectedDate(null)} size="sm">
        <ModalHeader>
          <ModalTitle>
            {selectedDate ? selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
          </ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-3">
          {selectedDate && getEventsForDate(selectedDate).map(event => (
            <div key={event.id} className={`p-4 rounded-xl ${getPriorityStyle(event.priority).light}`}>
              <div className="flex items-center gap-2">
                <IconeType type={event.type} size={18} />
                <p className={`font-medium ${textPrimary}`}>{event.title}</p>
              </div>
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <Bouton variante="secondaire" onClick={() => setSelectedDate(null)}>Fermer</Bouton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
