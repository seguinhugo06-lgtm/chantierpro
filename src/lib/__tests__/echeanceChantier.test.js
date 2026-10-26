import { describe, it, expect } from 'vitest';
import { joursAvantFin, chantierEnRetard, joursSansActivite } from '../echeanceChantier';
import { avancementChantier } from '../avancementChantier';

const AUJOURDHUI = new Date(2026, 9, 25, 10, 30); // 25 oct. 2026, 10 h 30

describe('échéance d’un chantier : une règle pour la liste, la fiche et l’alerte', () => {
  it('compte les jours entiers jusqu’à la fin prévue, en heure locale', () => {
    expect(joursAvantFin({ statut: 'en_cours', date_fin: '2026-10-28' }, AUJOURDHUI)).toBe(3);
    expect(joursAvantFin({ statut: 'en_cours', date_fin: '2026-10-25' }, AUJOURDHUI)).toBe(0);
    expect(joursAvantFin({ statut: 'prospect', date_fin: '2026-10-20' }, AUJOURDHUI)).toBe(-5);
  });

  it('lit la date de fin sous ses deux noms et ignore l’heure', () => {
    expect(joursAvantFin({ statut: 'en_cours', dateFin: '2026-10-26' }, AUJOURDHUI)).toBe(1);
    expect(joursAvantFin({ statut: 'en_cours', date_fin: '2026-10-26T00:00:00Z' }, AUJOURDHUI)).toBe(1);
  });

  it('le jour de la fin n’est pas un retard : seule une fin passée l’est', () => {
    expect(chantierEnRetard({ statut: 'en_cours', date_fin: '2026-10-25' }, AUJOURDHUI)).toBe(false);
    expect(chantierEnRetard({ statut: 'en_cours', date_fin: '2026-10-24' }, AUJOURDHUI)).toBe(true);
    // minuit et demi : le jour est celui de l’appareil, pas celui de l’UTC
    expect(chantierEnRetard({ statut: 'en_cours', date_fin: '2026-10-25' }, new Date(2026, 9, 25, 0, 30))).toBe(false);
  });

  it('seul un chantier en cours peut être en retard : un prospect dont la date est passée ne l’est pas', () => {
    expect(joursAvantFin({ statut: 'prospect', date_fin: '2026-10-20' }, AUJOURDHUI)).toBe(-5);
    expect(chantierEnRetard({ statut: 'prospect', date_fin: '2026-10-20' }, AUJOURDHUI)).toBe(false);
    expect(chantierEnRetard({ statut: 'en_cours', date_fin: '2026-10-20' }, AUJOURDHUI)).toBe(true);
  });

  it('un chantier terminé, archivé ou abandonné n’a ni échéance ni retard', () => {
    for (const statut of ['termine', 'archive', 'abandonne']) {
      expect(joursAvantFin({ statut, date_fin: '2026-01-01' }, AUJOURDHUI)).toBeNull();
      expect(chantierEnRetard({ statut, date_fin: '2026-01-01' }, AUJOURDHUI)).toBe(false);
    }
  });

  it('sans date de fin lisible : rien à dire', () => {
    expect(joursAvantFin({ statut: 'en_cours' }, AUJOURDHUI)).toBeNull();
    expect(joursAvantFin({ statut: 'en_cours', date_fin: 'bientôt' }, AUJOURDHUI)).toBeNull();
    expect(chantierEnRetard({ statut: 'en_cours', date_fin: '' }, AUJOURDHUI)).toBe(false);
  });

  it('sans activité : à partir de 7 jours, pour un chantier en cours seulement', () => {
    const il_y_a = (j) => new Date(AUJOURDHUI.getTime() - j * 86400000).toISOString();
    expect(joursSansActivite({ statut: 'en_cours', updated_at: il_y_a(8) }, AUJOURDHUI)).toBe(8);
    expect(joursSansActivite({ statut: 'en_cours', updated_at: il_y_a(6) }, AUJOURDHUI)).toBeNull();
    expect(joursSansActivite({ statut: 'en_cours', updated_at: il_y_a(30), last_photo_at: il_y_a(2) }, AUJOURDHUI)).toBeNull();
    expect(joursSansActivite({ statut: 'prospect', updated_at: il_y_a(30) }, AUJOURDHUI)).toBeNull();
    expect(joursSansActivite({ statut: 'en_cours' }, AUJOURDHUI)).toBeNull();
  });
});

describe('avancement d’un chantier : la moyenne de ce que l’on sait', () => {
  it('un chantier terminé est à 100 %', () => {
    expect(avancementChantier({ statut: 'termine', avancement: 10 }, null, 0, 0)).toBe(100);
  });

  it('les tâches pèsent 40 %, les heures 30 %, les achats 30 % — ramenés à 100 % quand un signal manque', () => {
    expect(avancementChantier({ statut: 'en_cours' }, {}, 1, 2)).toBe(50); // tâches seules
    const chantier = { statut: 'en_cours', heures_estimees: 100, budget_materiaux: 1000 };
    const bilan = { heuresTotal: 50, coutMateriaux: 1000 };
    expect(avancementChantier(chantier, bilan, 0, 4)).toBe(45); // 0 × 0,4 + 50 × 0,3 + 100 × 0,3
    expect(avancementChantier(chantier, { heuresTotal: 100, coutMateriaux: 2000 }, 4, 4)).toBe(100); // plafonné à 100
  });

  it('sans signal : l’avancement saisi, avec un minimum pour un chantier en cours', () => {
    expect(avancementChantier({ statut: 'en_cours', avancement: 0 }, null, 0, 0)).toBe(5);
    expect(avancementChantier({ statut: 'en_cours', avancement: 40 }, null, 0, 0)).toBe(40);
    expect(avancementChantier({ statut: 'prospect', avancement: 0 }, null, 0, 0)).toBe(0);
  });
});
