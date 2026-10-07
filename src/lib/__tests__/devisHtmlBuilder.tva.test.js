import { describe, it, expect } from 'vitest';
import { buildDevisHtml } from '../devisHtmlBuilder';

const entreprise = { nom: 'Élec Seguin', formeJuridique: 'EI', siret: '12345678900011', adresse: '1 rue A, 33000 Bordeaux' };
const client = { nom: 'Rousseau', prenom: 'Claire' };
const doc = (tva) => ({
  type: 'devis', numero: 'DEV-2026-00001', date: '2026-10-07', statut: 'brouillon',
  lignes: [{ description: 'Remplacement tableau électrique', quantite: 1, unite: 'u', prixUnitaire: 1200, tva }],
  total_ht: 1200, tva: 1200 * tva / 100, total_ttc: 1200 * (1 + tva / 100),
});

describe('buildDevisHtml — TVA à taux réduit', () => {
  it('un devis à 10 % porte la certification du client (modèle I)', () => {
    const html = buildDevisHtml({ doc: doc(10), client, entreprise, couleur: '#f97316' });
    expect(html).toContain('CERTIFICATION DU CLIENT');
    expect(html).toContain('Je soussigné(e) Claire Rousseau certifie');
    expect(html).toContain('art. 279-0 bis');
  });

  it('un devis à 20 % n’en porte pas', () => {
    const html = buildDevisHtml({ doc: doc(20), client, entreprise, couleur: '#f97316' });
    expect(html).not.toContain('CERTIFICATION DU CLIENT');
  });

  it('une micro-entreprise en franchise n’en porte pas', () => {
    const html = buildDevisHtml({ doc: doc(10), client, entreprise: { ...entreprise, formeJuridique: 'Micro-entreprise' }, couleur: '#f97316' });
    expect(html).not.toContain('CERTIFICATION DU CLIENT');
  });
});
