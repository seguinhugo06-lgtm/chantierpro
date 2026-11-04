import { describe, it, expect, vi } from 'vitest';

/**
 * Rapports PDF internes (Finances › Rapports), tâche 28 `franchise-restes` (4 nov. 2026) : en franchise en base de TVA
 * (art. 293 B du CGI, estFranchiseTva), ni « HT » ni « TTC » (D-31) ; hors franchise, inchangés. jsPDF est remplacé par un
 * faux document qui garde le texte écrit.
 */
const ecrit = [];
vi.mock('jspdf', () => {
  class FauxPdf {
    constructor() {
      this.internal = { getNumberOfPages: () => 3, pageSize: { getWidth: () => 210, getHeight: () => 297 } };
      return new Proxy(this, {
        get(cible, cle) {
          if (cle in cible) return cible[cle];
          if (cle === 'text') return (t) => { ecrit.push(...[].concat(t)); };
          if (cle === 'output') return () => new Blob(['pdf']);
          if (cle === 'getTextWidth') return (t) => String(t).length * 2;
          if (cle === 'splitTextToSize') return (t) => [String(t)];
          return () => {};
        },
      });
    }
  }
  return { default: FauxPdf };
});
vi.mock('../natif', () => ({ remettreFichier: async () => 'remis' }));

const { generateActivityPDF, generateFinancialPDF, generateChantierPDF } = await import('../reportPdfBuilder');

const HT_OU_TTC = /(?<![A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ])/;
const MICRO = { nom: 'Élec Seguin', formeJuridique: 'Micro-entreprise' };
const SARL = { ...MICRO, formeJuridique: 'SARL' };
const piece = { numero: 'FAC-1', client: 'Rousseau', montant: 100, statut: 'envoye', date: '2026-10-01', type: 'facture' };

const texteDe = async (generer, data, entreprise) => {
  ecrit.length = 0;
  await generer(data, entreprise, {});
  return ecrit.join(' | ');
};

const activite = { periode: { label: 'Octobre 2026' }, kpis: { ca: 1000 }, comparisons: {}, devisList: [piece], facturesList: [piece] };
const financier = (franchise) => ({
  periode: { label: 'Octobre 2026' }, kpis: { caHT: 1000, totalDepenses: 200, margeBrute: 800, hasDepenses: true },
  tva: { franchise }, rentabiliteChantiers: [{ nom: 'Cuisine', ca: 1000, depenses: 200, marge: 800, hasDepenses: true }],
});
const chantier = { chantier: { nom: 'Cuisine' }, budgetPrevu: 0, totalCA: 1000, totalDepenses: 200, marge: 800, devisLies: [piece] };

describe('rapports PDF en franchise', () => {
  it('rapport d’activité : « Chiffre d’affaires » et « Montant » sans « TTC »', async () => {
    const micro = await texteDe(generateActivityPDF, activite, MICRO);
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(micro).toMatch(/Chiffre d'affaires/);
    expect(await texteDe(generateActivityPDF, activite, SARL)).toMatch(/Chiffre d'affaires TTC.*Montant TTC/);
  });

  it('rapport financier : « Chiffre d’affaires » sans « HT », pas de section TVA', async () => {
    const micro = await texteDe(generateFinancialPDF, financier(true), MICRO);
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(micro).not.toMatch(/TVA facturée/);
    const sarl = await texteDe(generateFinancialPDF, financier(false), SARL);
    expect(sarl).toMatch(/Chiffre d'affaires HT/);
    expect(sarl).toMatch(/CA HT/);
    expect(sarl).toMatch(/TVA facturée/);
  });

  it('rapport de chantier : « Devis signés » et « Montant » sans « HT » ni « TTC »', async () => {
    const micro = await texteDe(generateChantierPDF, chantier, MICRO);
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(micro).toMatch(/Devis signés/);
    expect(await texteDe(generateChantierPDF, chantier, SARL)).toMatch(/Devis signés HT.*Montant TTC/);
  });
});
