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

  // Relecture juridique du 10 oct. 2026 : le générateur lisait `capitalSocial`, alors que les Réglages
  // enregistrent `capital` ; le capital d'une société n'était jamais imprimé sur ses lettres (C. com. R123-238).
  it('société : forme juridique et capital social lu dans `capital` (champ des Réglages), en tête et en pied', () => {
    const sarl = { nom: 'Élec Sud', formeJuridique: 'SARL', capital: '10000', siret: '12345678900012' };
    const t = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise: sarl }));
    expect(t.match(/SARL - Capital : 10000 €/g)).toHaveLength(2);
  });

  it('repli sur l\'ancien `capitalSocial`, et rien sur le capital quand il n\'est pas saisi', () => {
    const ancien = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise: { nom: 'X', formeJuridique: 'SAS', capitalSocial: 5000 } }));
    expect(ancien).toContain('SAS - Capital : 5000 €');
    const sans = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise: { nom: 'X', formeJuridique: 'SAS' } }));
    expect(sans).toContain('SAS');
    expect(sans).not.toContain('Capital');
  });

  it('entrepreneur individuel : pas de capital social, même resté saisi après un changement de statut', () => {
    for (const [formeJuridique, capital] of [['Micro-entreprise', '0'], ['EI', '10000'], ['EIRL', '5000']]) {
      const t = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise: { nom: 'Hugo Séguin', formeJuridique, capital } }));
      expect(t).toContain('Entrepreneur individuel');
      expect(t).not.toContain('Capital');
    }
  });

  it('un « € » saisi avec le capital n\'est pas doublé', () => {
    const t = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise: { nom: 'X', formeJuridique: 'SARL', capital: '10 000 €' } }));
    expect(t).toContain('SARL - Capital : 10 000 €');
    expect(t).not.toMatch(/€\s*€/);
  });

  it('RCS (C. com. R123-237) : ville et numéro des Réglages, sinon l\'ancien champ libre `rcs`', () => {
    const complet = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise: { nom: 'X', formeJuridique: 'SARL', rcsVille: 'Bordeaux', rcsNumero: '123 456 789', rcs: 'Paris B 999' } }));
    expect(complet.match(/RCS Bordeaux B 123 456 789/g)).toHaveLength(2);
    expect(complet).not.toContain('Paris B 999');
    const libre = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise: { nom: 'X', formeJuridique: 'SARL', rcs: 'Paris B 123 456 789' } }));
    expect(libre.match(/RCS Paris B 123 456 789/g)).toHaveLength(2);
    const prefixe = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise: { nom: 'X', formeJuridique: 'SARL', rcs: 'RCS Lyon 123 456 789' } }));
    expect(prefixe).toContain('RCS Lyon 123 456 789');
    expect(prefixe).not.toContain('RCS RCS');
  });

  it('ne parle de relances précédentes que s\'il y en a eu', () => {
    const sans = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise }));
    expect(sans).not.toContain('précédentes relances');
    const avec = texte(buildMiseEnDemeureHtml({ doc, client: { nom: 'Dupont' }, entreprise, executions: [{ status: 'sent', channel: 'email', created_at: '2026-09-10T10:00:00Z' }] }));
    expect(avec).toContain('malgré nos précédentes relances');
  });
});
