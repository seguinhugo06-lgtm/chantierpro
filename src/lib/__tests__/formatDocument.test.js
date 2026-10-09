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
