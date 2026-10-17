import { describe, it, expect } from 'vitest';
import { ligneChiffreeSansDesignation, messageLigneSansDesignation } from '../totauxDocument';

// Relecture juriste-btp du 16 oct. 2026 (tâche lignes-sans-designation) : une ligne chiffrée sans désignation comptait
// dans les totaux mais n'était ni enregistrée ni imprimée ; le total ne correspondait plus aux lignes du document.
describe('ligne chiffrée sans désignation', () => {
  it('rend le numéro de la première (titres de lot exclus du compte)', () => {
    const lignes = [
      { _isSection: true, description: 'Cuisine' },
      { description: 'Prise 16 A', quantite: 2, prixUnitaire: 25 },
      { description: '  ', quantite: '1,5', prixUnitaire: '40' },
    ];
    expect(ligneChiffreeSansDesignation(lignes)).toBe(2);
  });

  it('se fie au montant de la ligne quand il est donné (Devis Express)', () => {
    expect(ligneChiffreeSansDesignation([{ description: '', montant: 30 }])).toBe(1);
    expect(ligneChiffreeSansDesignation([{ description: '', montant: 0, quantite: 3, prixUnitaire: 10 }])).toBe(0);
  });

  it('une ligne vide (sans montant) ou une remise négative désignée ne bloquent pas', () => {
    expect(ligneChiffreeSansDesignation([{ description: '', quantite: 1, prixUnitaire: 0 }])).toBe(0);
    expect(ligneChiffreeSansDesignation([{ description: 'Geste commercial', quantite: 1, prixUnitaire: -50 }])).toBe(0);
    expect(ligneChiffreeSansDesignation([{ description: '', quantite: 1, prixUnitaire: -50 }])).toBe(1);
    expect(ligneChiffreeSansDesignation(null)).toBe(0);
  });

  it('accepte la désignation du catalogue (designation)', () => {
    expect(ligneChiffreeSansDesignation([{ designation: 'Disjoncteur', quantite: 1, prixUnitaire: 12 }])).toBe(0);
  });
});

describe('message pour l\'artisan', () => {
  it('cite le montant de la ligne plutôt qu\'un numéro (l\'éditeur ne numérote pas ses lignes)', () => {
    const m = messageLigneSansDesignation([{ description: 'Prise', quantite: 1, prixUnitaire: 25 }, { description: '', quantite: 2, prixUnitaire: 30 }]);
    expect(m).toMatch(/^Une ligne à 60,00\s€ HT n'a pas de désignation : ajoutez-la ou supprimez la ligne/);
    expect(messageLigneSansDesignation([{ description: 'Prise', quantite: 1, prixUnitaire: 25 }])).toBe('');
  });
});
