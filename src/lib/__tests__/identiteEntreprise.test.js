import { describe, it, expect } from 'vitest';
import { nomImprime, formeImprimee, estEntrepreneurIndividuel } from '../identiteEntreprise';
import { buildDevisHtml } from '../devisHtmlBuilder';

// C. com. L526-22 : le nom d'un entrepreneur individuel est suivi (ou précédé) de « EI » sur ses documents.
describe('entrepreneur individuel : « EI » à côté du nom', () => {
  it('micro-entreprise et EI : « EI » ajouté, sauf s\'il y est déjà', () => {
    expect(nomImprime({ nom: 'Hugo Séguin — Électricien', formeJuridique: 'Micro-entreprise' })).toBe('Hugo Séguin — Électricien EI');
    expect(nomImprime({ nom: 'Hugo Séguin', formeJuridique: 'EI' })).toBe('Hugo Séguin EI');
    expect(nomImprime({ nom: 'Hugo Séguin EI', formeJuridique: 'EI' })).toBe('Hugo Séguin EI');
    expect(nomImprime({ nom: 'Hugo Séguin, entrepreneur individuel', forme_juridique: 'Micro-entreprise' })).toBe('Hugo Séguin, entrepreneur individuel');
  });

  it('société ou EIRL : le nom tel quel', () => {
    expect(nomImprime({ nom: 'Élec & Fils', formeJuridique: 'SARL' })).toBe('Élec & Fils');
    expect(nomImprime({ nom: 'Dupont', formeJuridique: 'EIRL' })).toBe('Dupont');
    expect(estEntrepreneurIndividuel({ formeJuridique: 'SAS' })).toBe(false);
  });

  it('forme imprimée : la micro-entreprise est un régime, la forme est l\'entreprise individuelle', () => {
    expect(formeImprimee({ formeJuridique: 'Micro-entreprise' })).toBe('Entrepreneur individuel (micro-entreprise)');
    expect(formeImprimee({ formeJuridique: 'EI' })).toBe('Entrepreneur individuel');
    expect(formeImprimee({ formeJuridique: 'SARL' })).toBe('SARL');
  });

  it('le devis du client porte « EI » dans l\'en-tête et le pied de page', () => {
    const html = buildDevisHtml({
      doc: { type: 'devis', numero: 'DEV-1', date: '2026-10-10', lignes: [{ description: 'Prise', quantite: 1, prixUnitaire: 100, tva: 0 }], total_ht: 100, tva: 0, total_ttc: 100 },
      client: { nom: 'Dupont' },
      entreprise: { nom: 'Hugo Séguin — Électricien', formeJuridique: 'Micro-entreprise', siret: '12345678900012' },
    });
    expect((html.match(/Hugo Séguin — Électricien EI/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Entrepreneur individuel (micro-entreprise)');
  });
});
