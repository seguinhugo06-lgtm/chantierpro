import { describe, it, expect } from 'vitest';
import {
  PHRASE_DEVIS, PHRASE_RETARD_PROFESSIONNEL, PHRASE_AVOIR,
  natureDuDocument, textePiedDePage, piedDePageHtml,
} from '../piedDePageDocument';
import { blocConditionsPaiement } from '../formatDocument';
import { buildDevisHtml, buildSituationFactureHtml } from '../devisHtmlBuilder';
import { buildDocumentHTML } from '../pdfHtmlBuilder';

// Relecture juridique du 20 oct. 2026 : « pénalités de retard conformes à l'article L441-10 » s'imprimait sur tous les
// devis, y compris ceux d'un particulier. L441-10 (pénalités) et D441-5 (indemnité de 40 €) ne valent qu'entre
// professionnels (docs/metier-btp.md § 5).
const PARTICULIER = { nom: 'Martin', prenom: 'Paul', categorie: 'particulier' };
const PROFESSIONNEL = { nom: 'SCI Exemple', categorie: 'professionnel', entreprise: 'SCI Exemple' };
const SANS_CATEGORIE_AVEC_ENTREPRISE = { nom: 'Durand', entreprise: 'Durand Immobilier' };
const SYNDIC = { nom: 'Syndic des Tilleuls', categorie: 'syndic', entreprise: 'Syndic des Tilleuls' };

const SANS_REFERENCE = /L\.?\s?441|D\.?\s?441|441-10|441-5/;
const fines = (s) => s.replace(/[  ]/g, ' ');

describe('natureDuDocument', () => {
  it('avoir, facture ou devis', () => {
    expect(natureDuDocument({ type: 'facture', facture_type: 'avoir' })).toBe('avoir');
    expect(natureDuDocument({ type: 'facture', facture_type: 'acompte' })).toBe('facture');
    expect(natureDuDocument({ type: 'facture' })).toBe('facture');
    expect(natureDuDocument({ type: 'devis' })).toBe('devis');
    expect(natureDuDocument({})).toBe('devis');
    expect(natureDuDocument(null)).toBe('devis');
  });
});

describe('textePiedDePage', () => {
  it('devis à un professionnel : renvoi à L441-10 et D441-5, sans « conformes »', () => {
    const texte = textePiedDePage({ nature: 'devis', client: PROFESSIONNEL });
    expect(texte).toBe(`${PHRASE_DEVIS} ${PHRASE_RETARD_PROFESSIONNEL}`);
    expect(texte).toContain('Pénalités de retard et indemnité forfaitaire de recouvrement : articles L441-10 et D441-5 du Code de commerce');
    expect(texte).not.toMatch(/conforme/i);
  });

  it('devis à un client sans catégorie mais avec une entreprise : professionnel (règle de estClientPro)', () => {
    expect(textePiedDePage({ nature: 'devis', client: SANS_CATEGORIE_AVEC_ENTREPRISE })).toContain('L441-10 et D441-5');
  });

  it('devis à un particulier : aucune référence à L441-10 ni à D441-5, aucune pénalité', () => {
    const texte = textePiedDePage({ nature: 'devis', client: PARTICULIER });
    expect(texte).toBe(PHRASE_DEVIS);
    expect(texte).not.toMatch(SANS_REFERENCE);
    expect(texte).not.toMatch(/énalités|40 €|conforme/i);
  });

  it('client inconnu ou syndic de copropriété : traité comme un particulier (au doute, on n\'affirme rien)', () => {
    for (const client of [null, undefined, {}, SYNDIC]) {
      const texte = textePiedDePage({ nature: 'devis', client });
      expect(texte, JSON.stringify(client)).toBe(PHRASE_DEVIS);
    }
  });

  it('facture : pas de phrase au pied (les pénalités sont dans le bloc des conditions de règlement), pour tout client', () => {
    expect(textePiedDePage({ nature: 'facture', client: PROFESSIONNEL })).toBe('');
    expect(textePiedDePage({ nature: 'facture', client: PARTICULIER })).toBe('');
  });

  it('avoir : la phrase de rectification, sans référence légale, pour tout client', () => {
    for (const client of [PROFESSIONNEL, PARTICULIER]) {
      const texte = textePiedDePage({ nature: 'avoir', client });
      expect(texte).toBe(PHRASE_AVOIR);
      expect(texte).not.toMatch(SANS_REFERENCE);
    }
  });
});

describe('piedDePageHtml', () => {
  it('enveloppe le texte dans le bloc du pied de page, et ne produit rien sans texte', () => {
    expect(piedDePageHtml({ nature: 'devis', client: PARTICULIER })).toBe(
      `<div style="margin-top:6px;font-size:6.5pt;color:#666">${PHRASE_DEVIS}</div>`,
    );
    expect(piedDePageHtml({ nature: 'facture', client: PROFESSIONNEL })).toBe('');
  });
});

describe('bloc « Pénalités de retard » des conditions de règlement', () => {
  const facture = { type: 'facture', conditionsPaiement: '30_jours' };
  const bloc = (client, isFacture = true) => fines(blocConditionsPaiement({
    doc: isFacture ? facture : { type: 'devis', conditionsPaiement: '30_jours' },
    entreprise: { delaiPaiement: 30 }, isFacture, dateEcheance: isFacture ? '2026-11-30' : null, client,
  }));

  it('client professionnel : taux BCE + 10 points (L441-10) et indemnité de 40 € (D441-5)', () => {
    const html = bloc(PROFESSIONNEL);
    expect(html).toContain('Pénalités de retard');
    expect(html).toContain('Taux de la BCE majoré de 10 points (art. L441-10 C. com.)');
    expect(html).toContain('Indemnité forfaitaire pour frais de recouvrement : 40 € (art. L441-10 II et D441-5 C. com.)');
  });

  it('particulier ou client inconnu : ni taux, ni 40 €, ni article ; le délai de paiement et l\'échéance restent', () => {
    for (const client of [PARTICULIER, null, SYNDIC]) {
      const html = bloc(client);
      expect(html, JSON.stringify(client)).toContain('Délai de paiement');
      expect(html).toContain('30 jours.');
      expect(html).toContain('Date d\'échéance : 30/11/2026');
      expect(html).not.toMatch(SANS_REFERENCE);
      expect(html).not.toMatch(/énalités|BCE|40 €|recouvrement/);
    }
  });

  it('devis à un particulier : le délai seul', () => {
    const html = bloc(PARTICULIER, false);
    expect(html).toContain('Délai de paiement');
    expect(html).not.toMatch(/énalités|BCE|40 €|441/);
  });
});

describe('les générateurs de documents impriment le pied de page selon le client', () => {
  const lignes = [{ id: 'l1', description: 'Pose', quantite: 1, unite: 'forfait', prixUnitaire: 1000, tva: 20, montant: 1000 }];
  const devis = { id: 'd1', numero: 'DEV-2026-00001', type: 'devis', statut: 'envoye', date: '2026-10-20', lignes, total_ht: 1000, tva: 200, total_ttc: 1200, conditionsPaiement: '30_jours' };
  const facture = { ...devis, id: 'f1', numero: 'FAC-2026-00001', type: 'facture', date_echeance: '2026-11-20' };
  const entreprise = { nom: 'Élec Test', delaiPaiement: 30, siret: '12345678900012' };
  const generateurs = {
    'devisHtmlBuilder (page de signature)': (doc, client) => fines(buildDevisHtml({ doc, client, entreprise, couleur: '#f97316' })),
    'pdfHtmlBuilder (envois rapides)': (doc, client) => fines(buildDocumentHTML(doc, client, null, entreprise)),
  };

  describe.each(Object.entries(generateurs))('%s', (_nom, html) => {
    it('devis à un particulier : « Devis reçu avant l\'exécution des travaux. », sans L441-10 ni D441-5 ni « conformes »', () => {
      const h = html(devis, PARTICULIER);
      expect(h).toContain(PHRASE_DEVIS);
      expect(h).not.toMatch(SANS_REFERENCE);
      expect(h).not.toMatch(/pénalités de retard conformes/i);
      expect(h).not.toMatch(/Indemnité forfaitaire/);
    });

    it('devis à un professionnel : la phrase des articles L441-10 et D441-5, et le bloc des pénalités', () => {
      const h = html(devis, PROFESSIONNEL);
      expect(h).toContain(`${PHRASE_DEVIS} ${PHRASE_RETARD_PROFESSIONNEL}`);
      expect(h).not.toMatch(/conformes à l'article L441-10/);
      expect(h).toContain('Taux de la BCE majoré de 10 points (art. L441-10 C. com.)');
    });

    it('facture à un particulier : aucune pénalité ni indemnité de 40 €, mais l\'échéance', () => {
      const h = html(facture, PARTICULIER);
      expect(h).not.toMatch(SANS_REFERENCE);
      expect(h).not.toMatch(/Indemnité forfaitaire|Pénalités de retard/);
      expect(h).toMatch(/Date d'échéance : \d{2}\/\d{2}\/2026/);
    });

    it('facture à un professionnel : pénalités L441-10 et indemnité de 40 € (D441-5)', () => {
      const h = html(facture, PROFESSIONNEL);
      expect(h).toContain('Pénalités de retard');
      expect(h).toContain('Indemnité forfaitaire pour frais de recouvrement : 40 € (art. L441-10 II et D441-5 C. com.)');
    });
  });

  it('facture de situation : pénalités et 40 € seulement pour un client professionnel', () => {
    const situation = { numero: 1, lignes: [{ id: 'l1', description: 'Gros œuvre', quantite: 1, prixUnitaire: 1000, tva: 20, cumulActuel: 50, cumulPrecedent: 0 }] };
    const sitHtml = (client) => fines(buildSituationFactureHtml({ situation, parentDevis: devis, client, chantier: null, entreprise, couleur: '#f97316' }));
    expect(sitHtml(PROFESSIONNEL)).toContain('Indemnité forfaitaire de recouvrement: 40 €');
    const particulier = sitHtml(PARTICULIER);
    expect(particulier).not.toMatch(/Indemnité forfaitaire|Pénalités de retard|BCE/);
    expect(particulier).toContain('CONDITIONS DE RÈGLEMENT');
  });
});
