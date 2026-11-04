import { useState, useMemo } from 'react';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, Banknote, Users, Scale, ShieldCheck,
} from 'lucide-react';
import { jourLocal } from '../../lib/dates';
import { prochainesEcheances, joursAvant, COUVERTURE_FIN } from '../../lib/echeancesAdmin';
import { LigneEcheance } from './EcheancesUi';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';

/**
 * Calendrier de l'Administratif : les échéances du profil de l'artisan (src/lib/echeancesAdmin.js), les mêmes que
 * « Prochaines échéances » de l'accueil. Avant (31 oct. 2026) : un tableau en dur qui s'arrêtait en septembre 2026.
 */

export default function AdminCalendar({ echeances = [], profil = null, onChangerReponses, tvaDansLaTresorerie = false, isDark: _isDark = false, couleur: _couleur }) {
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
    return filteredEcheances.filter(e => e.date === dateStr);
  };

  // Filter events
  const filteredEcheances = useMemo(
    () => (filter === 'all' ? echeances : echeances.filter(e => e.type === filter)),
    [echeances, filter],
  );

  // Les 90 prochains jours (et les assurances déjà expirées), plus les échéances sans date précise de la période
  const upcomingEvents = useMemo(
    () => prochainesEcheances(filteredEcheances, new Date(), 50)
      .filter(e => e.joursRestants === null ? joursAvant(e.dateTri) <= 90 : e.joursRestants <= 90),
    [filteredEcheances],
  );

  const pointType = (type) => (type === 'assurance' ? 'bg-alerte-point' : type === 'legal' ? 'bg-danger-point' : 'bg-info-point');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Calendrier Administratif</h2>
          <p className={`text-sm ${textMuted} mt-1`}>
            Vos déclarations et paiements jusqu’au {new Date(`${COUVERTURE_FIN}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}, selon votre fiche entreprise. Rappels dans l’application seulement.
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
          { id: 'assurance', label: 'Assurance', icon: ShieldCheck },
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
                        className={`w-1.5 h-1.5 rounded-full ${pointType(e.type)}`}
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
              Aucune échéance dans les 90 prochains jours
            </p>
          ) : (
            upcomingEvents.map(event => <LigneEcheance key={event.id} echeance={event} detaillee />)
          )}
        </div>
        {profil?.formeConnue && onChangerReponses && (
          <button type="button" onClick={onChangerReponses} className="mt-3 min-h-[44px] text-sm font-medium text-accent-texte underline">
            {tvaDansLaTresorerie ? 'Changer mes réponses (rythme Urssaf, impôt, salariés)' : 'Changer mes réponses (rythme Urssaf, TVA, impôt, salariés)'}
          </button>
        )}
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
            <LigneEcheance key={event.id} echeance={{ ...event, joursRestants: joursAvant(event.date) }} detaillee />
          ))}
        </ModalBody>
        <ModalFooter>
          <Bouton variante="secondaire" onClick={() => setSelectedDate(null)}>Fermer</Bouton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
