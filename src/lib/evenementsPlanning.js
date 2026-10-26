/**
 * Événements du planning : les récurrences développées et les événements d'un jour, en un seul endroit.
 * Avant : le calcul vivait dans Planning.jsx, et le sous-titre de la page (« N rendez-vous aujourd'hui ») ne pouvait pas
 * le lire : l'en-tête disait « 0 tâches », le compteur « 38 évén. » et la tuile « 4 » (audit UX du 20 oct. 2026).
 */
import { jourLocal } from './dates';

const TROIS_MOIS_MAX = 3;

/** « AAAA-MM-JJ » → Date locale à minuit. */
const lireJour = (jour) => new Date(`${String(jour).slice(0, 10)}T00:00:00`);

/**
 * Les événements saisis, avec leurs occurrences à venir (jusqu'à `jusquA`, par défaut dans trois mois).
 * Une occurrence porte `isRecurrence`, `originalId` et son propre jour ; l'événement d'origine reste dans la liste.
 * @param {Array} evenements
 * @param {{ jusquA?: string }} [options] dernier jour développé, « AAAA-MM-JJ »
 */
export function developperRecurrences(evenements = [], { jusquA } = {}) {
  let limite = jusquA;
  if (!limite) {
    const dans3Mois = new Date();
    dans3Mois.setMonth(dans3Mois.getMonth() + TROIS_MOIS_MAX);
    limite = jourLocal(dans3Mois);
  }
  const developpes = [];
  for (const ev of evenements) {
    developpes.push(ev);
    if (!ev.recurrence || ev.recurrence === 'never' || !ev.date) continue;
    const fin = ev.recurrenceEnd || limite;
    const maxOccurrences = ev.recurrenceEndType === 'count' && ev.recurrenceOccurrences ? parseInt(ev.recurrenceOccurrences, 10) : Infinity;
    const courant = lireJour(ev.date);
    const maxIterations = (ev.recurrence === 'daily' || ev.recurrence === 'custom') ? 365 : 100;
    let occurrences = 0;
    for (let i = 0; i < maxIterations; i++) {
      if (ev.recurrence === 'custom') {
        // Personnalisé : jour après jour, seuls les jours choisis comptent (lundi = 0)
        courant.setDate(courant.getDate() + 1);
        const indexJour = (courant.getDay() + 6) % 7;
        if (!ev.recurrenceDays || !ev.recurrenceDays.includes(indexJour)) continue;
      } else if (ev.recurrence === 'daily') courant.setDate(courant.getDate() + 1);
      else if (ev.recurrence === 'weekly') courant.setDate(courant.getDate() + 7);
      else if (ev.recurrence === 'biweekly') courant.setDate(courant.getDate() + 14);
      else courant.setMonth(courant.getMonth() + 1);
      const jour = jourLocal(courant);
      if (ev.recurrenceEndType !== 'count' && jour > fin) break;
      occurrences++;
      if (occurrences > maxOccurrences) break;
      developpes.push({ ...ev, id: `${ev.id}_rec_${jour}`, date: jour, isRecurrence: true, originalId: ev.id });
    }
  }
  return developpes;
}

/**
 * Les événements d'un jour : celui qui commence ce jour-là, ou dont la période (date → dateEnd) le couvre.
 * @param {Array} evenements saisis (les récurrences sont développées ici)
 * @param {string} [jour] « AAAA-MM-JJ », aujourd'hui par défaut
 */
export function evenementsDuJour(evenements = [], jour = jourLocal()) {
  return developperRecurrences(evenements, { jusquA: jour }).filter((e) => {
    if (!e.date) return false;
    if (e.dateEnd) return jour >= e.date && jour <= e.dateEnd;
    return e.date === jour;
  });
}
