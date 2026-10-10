import { describe, it, expect } from 'vitest';
import { estFranchiseTva, sansTva, franchiseAppliquee, tvaARegulariser } from '../franchiseTva';
import { calculerTotaux, totauxDocument, lignesTotauxHtml } from '../totauxDocument';
import { lignesFactureAcompte } from '../facturation';
import { generateFacturXMLBasic } from '../facturx';

const MICRO = { formeJuridique: 'Micro-entreprise' };
const ligne = (description, quantite, prixUnitaire, tva) => ({ description, quantite, prixUnitaire, tva });

describe('franchise en base (art. 293 B CGI) : aucune TVA facturée', () => {
  it('reconnaît la micro-entreprise (camelCase ou colonne)', () => {
    expect(estFranchiseTva(MICRO)).toBe(true);
    expect(estFranchiseTva({ forme_juridique: 'Micro-entreprise' })).toBe(true);
    expect(estFranchiseTva({ formeJuridique: 'SARL' })).toBe(false);
    expect(estFranchiseTva(null)).toBe(false);
  });

  it('devis micro : 100 € HT → TVA 0, total 100 € (avant : 120 € sous la mention 293 B)', () => {
    const t = calculerTotaux([ligne('Prise', 1, 100, 20)], { tauxDefaut: 20, franchise: true });
    expect(t.totalHT).toBe(100);
    expect(t.totalTVA).toBe(0);
    expect(t.totalTTC).toBe(100);
  });

  it('facture d\'acompte micro sur un devis à lignes à 20 % : TTC = HT', () => {
    const devis = { lignes: [ligne('Tableau', 1, 1000, 20), ligne('Isolation', 10, 50, 5.5)], total_ht: 1500 };
    const lignes = sansTva(lignesFactureAcompte(devis, 30, { tauxDefaut: 20 }));
    expect(lignes.every((l) => l.tva === 0)).toBe(true);
    const t = calculerTotaux(lignes, { tauxDefaut: 20, franchise: true });
    expect(t.totalHT).toBe(450);
    expect(t.totalTTC).toBe(450);
  });

  it('document micro imprimé en franchise : ni ligne de TVA ni TTC ; « Net à payer », « Total », « Total de l’avoir »', () => {
    const facture = { type: 'facture', statut: 'envoye', lignes: [ligne('Prise', 1, 100, 0)], total_ht: 100, tva: 0, total_ttc: 100 };
    expect(totauxDocument(facture, { isMicro: true })).toMatchObject({ totalHT: 100, totalTVA: 0, totalTTC: 100, tva: [] });
    const html = lignesTotauxHtml(facture, { isMicro: true });
    expect(html).not.toMatch(/TVA/);
    expect(html).not.toMatch(/TTC/);
    expect(html).toMatch(/Net à payer/);
    expect(lignesTotauxHtml({ ...facture, type: 'devis' }, { isMicro: true })).toMatch(/<span>Total<\/span>/);
    expect(lignesTotauxHtml({ ...facture, facture_type: 'avoir', total_ht: -100, total_ttc: -100 }, { isMicro: true })).toMatch(/Total de l’avoir/);
  });

  it('document ÉMIS enregistré avec TVA : réimprimé tel qu’émis, à régulariser par avoir (CGI art. 283, 3 ; 289)', () => {
    const emise = { type: 'facture', statut: 'envoye', lignes: [ligne('Prise', 1, 100, 20)], total_ht: 100, tva: 20, total_ttc: 120 };
    expect(franchiseAppliquee(emise, MICRO)).toBe(false);
    expect(tvaARegulariser(emise, MICRO)).toBe(true);
    const html = lignesTotauxHtml(emise, { isMicro: franchiseAppliquee(emise, MICRO) });
    expect(html).toMatch(/TVA 20/);
    expect(html).toMatch(/Total TTC/);
    // Devis signé avec TVA : tel qu'émis aussi ; devis envoyé non signé et brouillon : en franchise
    expect(franchiseAppliquee({ ...emise, type: 'devis', statut: 'signe' }, MICRO)).toBe(false);
    expect(franchiseAppliquee({ ...emise, type: 'devis', statut: 'envoye' }, MICRO)).toBe(true);
    expect(franchiseAppliquee({ ...emise, statut: 'brouillon' }, MICRO)).toBe(true);
    // Un avoir régularise, il ne se régularise pas ; une facture annulée par avoir total non plus
    expect(tvaARegulariser({ ...emise, facture_type: 'avoir', total_ht: -100, tva: -20, total_ttc: -120 }, MICRO)).toBe(false);
    expect(tvaARegulariser({ ...emise, montant_credite: 120 }, MICRO)).toBe(false);
    // Hors franchise : jamais
    expect(franchiseAppliquee(emise, { formeJuridique: 'SARL' })).toBe(false);
    expect(tvaARegulariser(emise, { formeJuridique: 'SARL' })).toBe(false);
  });

  it('hors franchise : rien ne change', () => {
    const t = calculerTotaux([ligne('Prise', 1, 100, 20)], { tauxDefaut: 20 });
    expect(t.totalTTC).toBe(120);
    expect(lignesTotauxHtml({ lignes: [ligne('Prise', 1, 100, 20)], total_ht: 100, tva: 20, total_ttc: 120 })).toMatch(/Total TTC/);
  });

  it('sansTva laisse les titres de lot', () => {
    expect(sansTva([{ _isSection: true, description: 'Lot 1' }, ligne('Prise', 1, 100, 20)])).toEqual([
      { _isSection: true, description: 'Lot 1' }, ligne('Prise', 1, 100, 0),
    ]);
  });
});

describe('XML Factur-X : l\'échéance est celle imprimée', () => {
  it('reprend date_echeance (« 30 jours fin de mois ») au lieu de date + délai', () => {
    const facture = { type: 'facture', numero: 'FAC-1', date: '2026-10-20', date_echeance: '2026-11-30', lignes: [ligne('Prise', 1, 100, 20)], total_ht: 100, tva: 20, total_ttc: 120 };
    const xml = generateFacturXMLBasic(facture, { nom: 'Dupont' }, { nom: 'Élec', siret: '12345678900012' });
    expect(xml).toMatch(/<ram:DueDateDateTime>\s*<udt:DateTimeString format="102">20261130</);
  });
});
