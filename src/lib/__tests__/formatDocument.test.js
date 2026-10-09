import { describe, it, expect } from 'vitest';
import { euros, pourcent } from '../formatDocument';
import { buildDevisHtml } from '../devisHtmlBuilder';

// Revue du 9 oct. 2026 : le document que le client signe affichait « 45.00 € » et « TVA 5.5% ».
const fines = (s) => s.replace(/[  ]/g, ' ');

describe('formatDocument', () => {
  it('écrit les euros à la française', () => {
    expect(fines(euros(45))).toBe('45,00 €');
    expect(fines(euros(1234.5))).toBe('1 234,50 €');
    expect(fines(euros(undefined))).toBe('0,00 €');
  });

  it('écrit les pourcentages à la française', () => {
    expect(fines(pourcent(5.5))).toBe('5,5 %');
    expect(fines(pourcent('20'))).toBe('20 %');
  });
});

describe('document de devis', () => {
  it('ne contient plus de montant ni de taux au format anglais', () => {
    const doc = {
      id: 'd1', numero: 'DEV-2026-00042', type: 'devis', statut: 'envoye', date: '2026-10-09',
      lignes: [{ id: 'l1', description: 'Carrelage grès cérame 60x60', quantite: 180, unite: 'm²', prixUnitaire: 45, tva: 10, montant: 8100 }],
      total_ht: 8100, tva: 810, total_ttc: 8910, tvaRate: 10,
    };
    const html = fines(buildDevisHtml({ doc, client: { nom: 'Dupont', prenom: 'Marie' }, entreprise: { nom: 'BTP Test' }, couleur: '#f97316' }));
    expect(html).toContain('45,00 €');
    expect(html).toContain('8 910,00 €');
    expect(html).toMatch(/TVA 10 %/);
    expect(html).not.toMatch(/\d\.\d{2} €/);
    expect(html).not.toMatch(/TVA \d+(\.\d+)?%/);
  });
});

describe('document avec remise (relecture juridique du 9 oct. 2026)', () => {
  const doc = {
    id: 'd2', numero: 'FAC-2026-00042', type: 'facture', statut: 'envoye', date: '2026-10-09',
    lignes: [{ id: 'l1', description: 'Pose', quantite: 1, unite: 'forfait', prixUnitaire: 1000, tva: 20, montant: 1000 }],
    remise: 10, total_ht: 900, tva: 180, total_ttc: 1080, conditionsPaiement: '30_jours',
  };
  const html = fines(buildDevisHtml({ doc, client: { nom: 'Dupont' }, entreprise: { nom: 'BTP Test', delaiPaiement: 30 }, couleur: '#f97316' }));

  it('imprime la remise sur le total des lignes et la TVA après remise', () => {
    expect(html).toContain('Total HT avant remise');
    expect(html).toContain('1 000,00 €');
    expect(html).toContain('-100,00 €');
    expect(html).toContain('Total HT après remise');
    expect(html).toContain('900,00 €');
    expect(html).toContain('180,00 €');
    expect(html).not.toContain('200,00 €');
    expect(html).toContain('1 080,00 €');
  });

  it('imprime un seul taux de pénalités, juste, et la date d\'échéance', () => {
    expect(html).toContain('Taux de la BCE majoré de 10 points (art. L441-10 C. com.)');
    expect(html).not.toMatch(/3 fois le taux directeur/);
    expect(html).not.toMatch(/~13/);
    expect(html).toMatch(/Date d'échéance : \d{2}\/\d{2}\/2026/);
  });
});
