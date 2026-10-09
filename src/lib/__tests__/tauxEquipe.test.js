import { describe, it, expect } from 'vitest';
import { tauxFacture, coutHoraire, coutPourBilan, coutDesPointages } from '../tauxEquipe';
import { calculateChantierMargin } from '../business/margin-calculator';

describe('taux de l’équipe', () => {
  it('lit les taux saisis, en nombre ou en texte à virgule', () => {
    expect(tauxFacture({ tauxHoraire: 45 })).toBe(45);
    expect(coutHoraire({ coutHoraireCharge: '27,5' })).toBe(27.5);
  });

  it('ne fabrique aucun taux quand rien n’est saisi', () => {
    expect(tauxFacture({})).toBeNull();
    expect(coutHoraire({ coutHoraireCharge: '' })).toBeNull();
    expect(coutHoraire({ coutHoraireCharge: 0 })).toBeNull();
    expect(coutHoraire(undefined)).toBeNull();
  });

  it('le bilan prend le coût chargé, et le taux facturé seulement pour une fiche ancienne sans coût', () => {
    expect(coutPourBilan({ tauxHoraire: 45, coutHoraireCharge: 28 })).toBe(28);
    expect(coutPourBilan({ tauxHoraire: 45 })).toBe(45);
    expect(coutPourBilan({})).toBe(0);
  });

  it('additionne le coût des pointages et compte les heures sans coût connu', () => {
    const equipe = [{ id: 'a', coutHoraireCharge: 28 }, { id: 'b' }];
    const pointages = [{ employeId: 'a', heures: 8 }, { employeId: 'b', heures: 3 }, { employeId: 'inconnu', heures: 2 }];
    expect(coutDesPointages(pointages, equipe)).toEqual({ montant: 224, heuresSansCout: 5 });
  });
});

describe('bilan d’un chantier : la main-d’œuvre au coût chargé', () => {
  it('compte 10 h à 28 € (coût), pas à 45 € (taux facturé)', () => {
    const bilan = calculateChantierMargin({ id: 'ch1', budget_estime: 1000 }, {
      pointages: [{ chantierId: 'ch1', employeId: 'e1', heures: 10 }],
      equipe: [{ id: 'e1', tauxHoraire: 45, coutHoraireCharge: 28 }],
    });
    expect(bilan.coutMO).toBe(280);
  });
});
