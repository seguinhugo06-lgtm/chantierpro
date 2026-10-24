import { describe, it, expect } from 'vitest';
import { buildDevisHtml } from '../devisHtmlBuilder';
import { donneesFacture } from '../../components/ramonage/actionsRamonage';

const entreprise = { nom: 'Élec Seguin', formeJuridique: 'EI', siret: '12345678900011', adresse: '1 rue A, 33000 Bordeaux' };
const client = { nom: 'Rousseau', prenom: 'Claire' };
const doc = (tva) => ({
  type: 'devis', numero: 'DEV-2026-00001', date: '2026-10-07', statut: 'brouillon',
  lignes: [{ description: 'Remplacement tableau électrique', quantite: 1, unite: 'u', prixUnitaire: 1200, tva }],
  total_ht: 1200, tva: 1200 * tva / 100, total_ttc: 1200 * (1 + tva / 100),
});

describe('buildDevisHtml — TVA à taux réduit', () => {
  it('un devis à 10 % porte la certification du client, au futur (BOI-LETTRE-000280 § 10)', () => {
    const html = buildDevisHtml({ doc: doc(10), client, entreprise, couleur: '#f97316' });
    expect(html).toContain('CERTIFICATION DU CLIENT');
    expect(html).toContain('Je soussigné(e) Claire Rousseau certifie');
    expect(html).toContain('qu’ils n’auront pas pour effet');
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

  // Facture : modèle du BOI-LETTRE-000280 § 30 (« par le règlement »), au futur pour un acompte ; rien sur un avoir
  const facture = (factureType) => ({ ...doc(10), type: 'facture', numero: 'FAC-2026-00001', facture_type: factureType });

  it('une facture à 10 % : le règlement vaut certification, sans signature', () => {
    const html = buildDevisHtml({ doc: facture('totale'), client, entreprise, couleur: '#f97316' });
    expect(html).toContain('Par le règlement de la présente facture, le client certifie');
    expect(html).toContain('qu’ils n’ont pas eu pour effet');
    expect(html).not.toContain('Je soussigné(e)');
    expect(html).not.toContain('Date et signature du client');
  });

  it('une facture d’acompte : certification au futur', () => {
    const html = buildDevisHtml({ doc: facture('acompte'), client, entreprise, couleur: '#f97316' });
    expect(html).toContain('Par le règlement de la présente facture, le client certifie');
    expect(html).toContain('qu’ils n’auront pas pour effet');
  });

  it('la facture d’un ramonage sans devis (D-30) : certification par le règlement, au passé', () => {
    const ramonages = [{ id: 'r1', client_id: 'c1', numero: 'RAM-2026-00001', realise_le: '2026-10-20T09:00:00Z', prix_ht: 80 }];
    const factureRamonage = { ...donneesFacture({ ramonages, entreprise, aujourdhui: '2026-10-24' }), numero: 'FAC-2026-00002' };
    expect(factureRamonage.type).toBe('facture');
    expect(factureRamonage.facture_type).toBeUndefined();
    const html = buildDevisHtml({ doc: factureRamonage, client, entreprise, couleur: '#f97316' });
    expect(html).toContain('TVA À TAUX RÉDUIT (10 %)');
    expect(html).toContain('Par le règlement de la présente facture, le client certifie');
    expect(html).toContain('qu’ils n’ont pas eu pour effet');
    expect(html).not.toMatch(/Date et signature du client|Je soussigné/);
  });

  it('un avoir n’en porte pas', () => {
    const html = buildDevisHtml({ doc: { ...facture('avoir'), numero: 'AV-2026-00001' }, client, entreprise, couleur: '#f97316' });
    expect(html).not.toContain('CERTIFICATION DU CLIENT');
  });
});
