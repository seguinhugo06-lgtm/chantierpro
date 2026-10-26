import { describe, it, expect } from 'vitest';
import { developperRecurrences, evenementsDuJour } from '../evenementsPlanning';

const rdv = (extra = {}) => ({ id: 'e1', title: 'RDV', date: '2026-10-26', type: 'rdv', ...extra });

describe('événements du planning', () => {
  it('un événement sans récurrence reste seul', () => {
    expect(developperRecurrences([rdv()], { jusquA: '2026-12-31' })).toHaveLength(1);
    expect(developperRecurrences([rdv({ recurrence: 'never' })], { jusquA: '2026-12-31' })).toHaveLength(1);
  });

  it('chaque semaine : une occurrence par semaine jusqu’à la limite, l’original gardé', () => {
    const liste = developperRecurrences([rdv({ recurrence: 'weekly' })], { jusquA: '2026-11-16' });
    expect(liste.map((e) => e.date)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16']);
    expect(liste[1]).toMatchObject({ isRecurrence: true, originalId: 'e1', id: 'e1_rec_2026-11-02' });
    expect(liste[0].isRecurrence).toBeUndefined();
  });

  it('la fin de série de l’événement prime sur la limite', () => {
    const liste = developperRecurrences([rdv({ recurrence: 'daily', recurrenceEnd: '2026-10-28' })], { jusquA: '2026-12-31' });
    expect(liste.map((e) => e.date)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28']);
  });

  it('« N fois » : N occurrences après l’original, quelle que soit la limite de dates', () => {
    const liste = developperRecurrences([rdv({ recurrence: 'weekly', recurrenceEndType: 'count', recurrenceOccurrences: '3' })], { jusquA: '2026-10-30' });
    expect(liste).toHaveLength(4);
  });

  it('personnalisé : seuls les jours choisis (lundi = 0) reviennent', () => {
    // 26 oct. 2026 est un lundi ; mercredi (2) et vendredi (4)
    const liste = developperRecurrences([rdv({ recurrence: 'custom', recurrenceDays: [2, 4] })], { jusquA: '2026-11-06' });
    expect(liste.slice(1).map((e) => e.date)).toEqual(['2026-10-28', '2026-10-30', '2026-11-04', '2026-11-06']);
  });

  it('les événements d’un jour : le sien, ceux dont la période le couvre, et les occurrences', () => {
    const evenements = [
      rdv({ id: 'a', date: '2026-10-26' }),
      rdv({ id: 'b', date: '2026-10-24', dateEnd: '2026-10-27' }),
      rdv({ id: 'c', date: '2026-10-28' }),
      rdv({ id: 'd', date: '2026-10-19', recurrence: 'weekly' }),
    ];
    expect(evenementsDuJour(evenements, '2026-10-26').map((e) => e.id).sort()).toEqual(['a', 'b', 'd_rec_2026-10-26']);
    expect(evenementsDuJour(evenements, '2026-10-29')).toHaveLength(0);
    expect(evenementsDuJour([], '2026-10-26')).toEqual([]);
  });
});
