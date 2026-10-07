import { describe, it, expect } from 'vitest';
import { choisirAbonnement, appliquerFinOffre, utiliserCodeTesteur } from '../subscriptionsApi';

describe('appliquerFinOffre', () => {
  const maintenant = new Date('2027-10-08T00:00:00Z');
  it('une offre testeur échue repasse en gratuit', () => {
    const offre = { plan: 'artisan', status: 'active', stripe_subscription_id: null, current_period_end: '2027-10-07T00:00:00Z' };
    expect(appliquerFinOffre(offre, maintenant)).toMatchObject({ plan: 'gratuit', status: 'canceled' });
  });
  it('une offre en cours, un abonnement Stripe ou une offre sans date restent tels quels', () => {
    const enCours = { plan: 'artisan', status: 'active', current_period_end: '2027-12-01T00:00:00Z' };
    const stripe = { plan: 'artisan', status: 'active', stripe_subscription_id: 'sub_1', current_period_end: '2027-01-01T00:00:00Z' };
    const sansDate = { plan: 'equipe', status: 'active' };
    expect(appliquerFinOffre(enCours, maintenant)).toBe(enCours);
    expect(appliquerFinOffre(stripe, maintenant)).toBe(stripe);
    expect(appliquerFinOffre(sansDate, maintenant)).toBe(sansDate);
    expect(appliquerFinOffre(null, maintenant)).toBeNull();
  });
});

describe('utiliserCodeTesteur', () => {
  it('refuse un code trop court sans appeler le serveur', async () => {
    expect((await utiliserCodeTesteur('abc')).error).toMatch(/code complet/);
  });
});

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
