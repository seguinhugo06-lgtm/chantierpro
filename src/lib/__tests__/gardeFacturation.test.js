import { describe, it, expect } from 'vitest';
import { verifierNouvelleFacture, montantCredite, dejaFactureTTC, pourcentageAcompteValide, estEntierementFacture } from '../gardeFacturation';

const DEVIS = { id: 'd1', type: 'devis', statut: 'signe', client_id: 'c1', total_ttc: 1100 };
const facture = (o) => ({ type: 'facture', devis_source_id: 'd1', statut: 'envoye', ...o });

describe('verifierNouvelleFacture', () => {
  it('accepte un premier acompte dans les bornes', () => {
    expect(verifierNouvelleFacture(DEVIS, [DEVIS], { nature: 'acompte', montantTTC: 330 }).ok).toBe(true);
  });

  it('refuse un devis sans client, un montant nul ou négatif', () => {
    expect(verifierNouvelleFacture({ ...DEVIS, client_id: null }, [], { nature: 'totale', montantTTC: 1100 }).raison).toMatch(/client/);
    expect(verifierNouvelleFacture(DEVIS, [], { nature: 'solde', montantTTC: 0 }).ok).toBe(false);
    expect(verifierNouvelleFacture(DEVIS, [], { nature: 'acompte', montantTTC: -220 }).ok).toBe(false);
  });

  it('refuse de facturer plus que le devis (acompte de 150 %, deux soldes, complète + acompte)', () => {
    expect(verifierNouvelleFacture(DEVIS, [], { nature: 'acompte', montantTTC: 1650 }).ok).toBe(false);
    const acompte = facture({ id: 'f1', facture_type: 'acompte', numero: 'FAC-1', total_ttc: 330 });
    expect(verifierNouvelleFacture(DEVIS, [acompte], { nature: 'solde', montantTTC: 770 }).ok).toBe(true);
    const solde = facture({ id: 'f2', facture_type: 'solde', numero: 'FAC-2', total_ttc: 770 });
    expect(verifierNouvelleFacture(DEVIS, [acompte, solde], { nature: 'solde', montantTTC: 770 }).raison).toMatch(/déjà entièrement facturé \(FAC-2\)/);
    const complete = facture({ id: 'f3', facture_type: 'totale', numero: 'FAC-3', total_ttc: 1100 });
    expect(verifierNouvelleFacture(DEVIS, [complete], { nature: 'acompte', montantTTC: 330 }).ok).toBe(false);
  });

  it('tolère quelques centimes d\'arrondi entre les factures et le devis', () => {
    const a = facture({ id: 'f1', facture_type: 'acompte', total_ttc: 330.01 });
    expect(verifierNouvelleFacture(DEVIS, [a], { nature: 'solde', montantTTC: 770.01 }).ok).toBe(true);
  });

  it('une facture annulée par un avoir total ne compte plus : le devis peut être refacturé', () => {
    const complete = facture({ id: 'f3', facture_type: 'totale', total_ttc: 1100 });
    const avoir = { id: 'a1', type: 'facture', facture_type: 'avoir', avoir_source_id: 'f3', statut: 'envoye', total_ttc: -1100 };
    expect(montantCredite(complete, [complete, avoir])).toBe(1100);
    expect(dejaFactureTTC('d1', [complete, avoir])).toBe(0);
    expect(verifierNouvelleFacture(DEVIS, [complete, avoir], { nature: 'totale', montantTTC: 1100 }).ok).toBe(true);
  });

  it('un avoir en brouillon ne crédite rien', () => {
    const complete = facture({ id: 'f3', facture_type: 'totale', total_ttc: 1100 });
    const brouillon = { id: 'a1', type: 'facture', facture_type: 'avoir', avoir_source_id: 'f3', statut: 'brouillon', total_ttc: -1100 };
    expect(montantCredite(complete, [complete, brouillon])).toBe(0);
  });

  it('situations et autres factures ne se mélangent pas', () => {
    const sit = facture({ id: 's1', facture_type: 'situation', total_ttc: 300 });
    expect(verifierNouvelleFacture(DEVIS, [sit], { nature: 'totale', montantTTC: 800 }).raison).toMatch(/situations/);
    const acompte = facture({ id: 'f1', facture_type: 'acompte', total_ttc: 330 });
    expect(verifierNouvelleFacture(DEVIS, [acompte], { nature: 'situation' }).ok).toBe(false);
    expect(verifierNouvelleFacture(DEVIS, [sit], { nature: 'situation' }).ok).toBe(true);
  });
});

describe('estEntierementFacture', () => {
  it('une facture complète (ou un solde) non annulée : le devis est facturé, même resté « signé »', () => {
    const complete = facture({ id: 'f3', facture_type: 'totale', total_ttc: 1100 });
    expect(estEntierementFacture(DEVIS, [complete])).toBe(true);
    const avoir = { id: 'a1', type: 'facture', facture_type: 'avoir', avoir_source_id: 'f3', statut: 'envoye', total_ttc: -1100 };
    expect(estEntierementFacture(DEVIS, [complete, avoir])).toBe(false);
  });
  it('un acompte seul ne facture pas tout le devis', () => {
    expect(estEntierementFacture(DEVIS, [facture({ id: 'f1', facture_type: 'acompte', total_ttc: 330 })])).toBe(false);
  });
});

describe('pourcentageAcompteValide', () => {
  it('entre 1 et 99 %, virgule acceptée', () => {
    expect(pourcentageAcompteValide(30)).toBe(true);
    expect(pourcentageAcompteValide('33,5')).toBe(true);
    expect(pourcentageAcompteValide(0)).toBe(false);
    expect(pourcentageAcompteValide(100)).toBe(false);
    expect(pourcentageAcompteValide(150)).toBe(false);
    expect(pourcentageAcompteValide(-20)).toBe(false);
    expect(pourcentageAcompteValide('')).toBe(false);
  });
});
