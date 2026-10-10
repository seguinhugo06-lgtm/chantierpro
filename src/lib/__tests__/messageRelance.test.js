import { describe, it, expect } from 'vitest';
import { relanceDe, texteCourt, telInternational } from '../messageRelance';
import { echapperHtml } from '../echapperHtml';

const espaces = (t) => t.replace(/ | /g, ' ');
const facture = (o) => ({ id: 'f1', type: 'facture', facture_type: 'totale', statut: 'envoye', numero: 'FAC-2026-00010', total_ttc: 1000, date: '2026-09-01', date_echeance: '2026-09-11', ...o });
const LE_1_OCT = new Date('2026-10-01T10:00:00');

describe('relance d\'une facture', () => {
  it('relance le reste dû, avec l\'échéance et le retard', () => {
    const r = relanceDe(facture({ montant_paye: 400 }), [], LE_1_OCT);
    expect(r.reste).toBe(600);
    expect(r.jours).toBeGreaterThan(0);
    const t = espaces(texteCourt(facture(), { relance: r, lienPaiement: 'https://mallettico.fr/pay/abc' }));
    expect(t).toMatch(/FAC-2026-00010/);
    expect(t).toMatch(/600,00 €/);
    expect(t).not.toMatch(/1 000/);
    expect(t).toMatch(/échue depuis \d+ jours/);
    expect(t).toMatch(/pay\/abc/);
  });
  it('rien à relancer : brouillon, avoir, facture soldée ou créditée', () => {
    expect(relanceDe(facture({ statut: 'brouillon' }))).toBeNull();
    expect(relanceDe(facture({ facture_type: 'avoir', total_ttc: -300 }))).toBeNull();
    expect(relanceDe(facture({ montant_paye: 1000 }))).toBeNull();
    expect(relanceDe(facture({ montant_credite: 1000 }))).toBeNull();
  });
  it('un premier envoi annonce le document et son montant', () => {
    expect(espaces(texteCourt({ type: 'devis', numero: 'DEV-1', total_ttc: 500 }))).toBe('Bonjour, voici votre devis DEV-1 : 500,00 €.');
  });
});

describe('numéro WhatsApp', () => {
  it('passe tout numéro français à l\'international, chiffres seuls', () => {
    expect(telInternational('06 12 34 56 78')).toBe('33612345678');
    expect(telInternational('06.12.34.56.78')).toBe('33612345678');
    expect(telInternational('+33 6 12 34 56 78')).toBe('33612345678');
    expect(telInternational('0033612345678')).toBe('33612345678');
    expect(telInternational('+590 690 12 34 56')).toBe('590690123456');
  });
});

describe('echapperHtml', () => {
  it('neutralise le HTML saisi', () => {
    expect(echapperHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(echapperHtml("L'Atelier & Fils")).toBe('L&#39;Atelier &amp; Fils');
    expect(echapperHtml(null)).toBe('');
  });
});
