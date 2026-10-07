import { describe, it, expect } from 'vitest';
import { choisirAbonnement } from '../subscriptionsApi';

describe('choisirAbonnement', () => {
  it('garde l’abonnement payant de l’organisation face à la ligne gratuite, plus récente, d’un collaborateur', () => {
    const lignes = [
      { id: 'collab', plan: 'gratuit', status: 'active', created_at: '2026-10-01' },
      { id: 'patron', plan: 'equipe', status: 'active', created_at: '2026-06-01' },
    ];
    expect(choisirAbonnement(lignes).id).toBe('patron');
  });

  it('préfère un abonnement actif à un abonnement résilié de plan supérieur', () => {
    const lignes = [
      { id: 'ancien', plan: 'equipe', status: 'canceled', created_at: '2026-01-01' },
      { id: 'actuel', plan: 'artisan', status: 'active', created_at: '2026-02-01' },
    ];
    expect(choisirAbonnement(lignes).id).toBe('actuel');
  });

  it('un impayé en cours de relance Stripe reste actif', () => {
    const lignes = [
      { id: 'gratuit', plan: 'gratuit', status: 'active' },
      { id: 'impaye', plan: 'artisan', status: 'past_due' },
    ];
    expect(choisirAbonnement(lignes).id).toBe('impaye');
  });

  it('à plan égal, prend le plus récent ; reconnaît les anciens noms de plans', () => {
    expect(choisirAbonnement([
      { id: 'a', plan: 'pro', status: 'active', created_at: '2026-01-01' },
      { id: 'b', plan: 'equipe', status: 'active', created_at: '2026-03-01' },
    ]).id).toBe('b');
  });

  it('renvoie null sans ligne', () => {
    expect(choisirAbonnement([])).toBeNull();
    expect(choisirAbonnement(null)).toBeNull();
  });
});
