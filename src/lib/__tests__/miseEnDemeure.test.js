import { describe, it, expect } from 'vitest';
import { buildMiseEnDemeureHtml } from '../miseEnDemeureBuilder';

// Relecture juridique du 9 oct. 2026 : la mise en demeure réclamait le TTC entier après un acompte,
// et les pénalités L441-10 + 40 € à un particulier, qui ne les doit pas.
const texte = (h) => h.replace(/<[^>]+>/g, ' ').replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
const doc = { numero: 'FAC-2026-00042', total_ttc: 1080, montant_paye: 324, date: '2026-08-01', date_echeance: '2026-08-31' };
const entreprise = { nom: 'BTP Test' };

describe('mise en demeure', () => {
  it('à un professionnel : reste dû, pénalités au taux donné, indemnité de 40 €', () => {
    const t = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'SCI Les Tilleuls', categorie: 'Professionnel' }, entreprise, penaltyRate: 12.4 }));
    expect(t).toContain('dont il reste dû 756,00 €');
    expect(t).toContain('Déjà réglé');
    expect(t).toMatch(/Pénalités de retard \(12,4 % annuel/);
    expect(t).toContain('Indemnité forfaitaire de recouvrement');
    expect(t).not.toContain('${');
  });

  it('à un particulier : la somme due et les intérêts au taux légal (art. 1231-6 C. civ.), sans pénalités ni 40 €', () => {
    const t = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont', prenom: 'Marie' }, entreprise, penaltyRate: 12.4 }));
    expect(t).not.toMatch(/Pénalités de retard \(/);
    expect(t).not.toContain('Indemnité forfaitaire de recouvrement');
    expect(t).toContain('1231-6');
    expect(t).toMatch(/TOTAL DÛ 756,00 €/);
  });

  it('ne parle de relances précédentes que s\'il y en a eu', () => {
    const sans = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise }));
    expect(sans).not.toContain('précédentes relances');
    const avec = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise, executions: [{ status: 'sent', channel: 'email', created_at: '2026-09-10T10:00:00Z' }] }));
    expect(avec).toContain('malgré nos précédentes relances');
  });
});
