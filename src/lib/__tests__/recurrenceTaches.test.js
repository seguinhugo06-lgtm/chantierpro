import { describe, it, expect } from 'vitest';
import { getNextOccurrence, isOverdue, isToday } from '../../components/tasks/helpers';
import { jourLocal } from '../dates';

// Recette du 9 oct. 2026 : la « prochaine occurrence » partait un jour trop tôt en France (minuit local lu en UTC),
// et un mensuel du 31 sautait un mois. Ce test tourne aussi en Martinique et en Nouvelle-Calédonie (npm test).
describe('tâches récurrentes : la prochaine occurrence tombe le bon jour', () => {
  it('quotidienne, hebdomadaire, mensuelle, personnalisée', () => {
    expect(getNextOccurrence('2026-10-12', 'daily')).toBe('2026-10-13');
    expect(getNextOccurrence('2026-10-12', 'weekly')).toBe('2026-10-19');
    expect(getNextOccurrence('2026-10-15', 'monthly')).toBe('2026-11-15');
    expect(getNextOccurrence('2026-10-12', { type: 'custom', unit: 'week', interval: 2 })).toBe('2026-10-26');
  });

  it('mensuelle du 31 : dernier jour du mois suivant, sans sauter de mois', () => {
    expect(getNextOccurrence('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(getNextOccurrence('2026-10-31', { type: 'custom', unit: 'month', interval: 1 })).toBe('2026-11-30');
  });

  it('une tâche due aujourd’hui n’est pas en retard', () => {
    const aujourdhui = jourLocal();
    expect(isToday({ due_date: aujourdhui })).toBe(true);
    expect(isOverdue({ due_date: aujourdhui, is_done: false })).toBe(false);
  });
});
