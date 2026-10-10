import { describe, it, expect } from 'vitest';
import { soldeDe, relanceDe, texteCourt, telInternational } from '../messageRelance';
import { buildDocumentEmailBody } from '../emailSender';
import { echapperHtml } from '../echapperHtml';

const espaces = (t) => t.replace(/ | /g, ' ');
const facture = (o) => ({ id: 'f1', type: 'facture', facture_type: 'totale', statut: 'envoye', numero: 'FAC-2026-00010', total_ttc: 1000, date: '2026-09-01', date_echeance: '2026-09-11', ...o });
const LE_1_OCT = new Date('2026-10-01T10:00:00');
const LE_5_SEPT = new Date('2026-09-05T10:00:00');

describe('rappel d\'une facture : seulement après l\'échéance', () => {
  it('échue et due : un rappel du reste dû, avec l\'échéance et le lien de paiement', () => {
    const solde = soldeDe(facture({ montant_paye: 400 }), [], LE_1_OCT);
    expect(solde.enRetard).toBe(true);
    expect(relanceDe(facture({ montant_paye: 400 }), [], LE_1_OCT).reste).toBe(600);
    const t = espaces(texteCourt(facture(), { solde, lienPaiement: 'https://mallettico.fr/pay/abc', entrepriseNom: 'Élec Durand' }));
    expect(t).toMatch(/sauf erreur de ma part, la facture FAC-2026-00010, arrivée à échéance le 11 septembre 2026, n'est pas encore réglée : il reste 600,00 € à payer/);
    expect(t).toMatch(/pay\/abc — Élec Durand$/);
  });

  it('pas encore échue : un envoi normal (date limite), jamais « Rappel » — même si la facture est née « envoyée »', () => {
    const solde = soldeDe(facture(), [], LE_5_SEPT);
    expect(solde.enRetard).toBe(false);
    expect(relanceDe(facture(), [], LE_5_SEPT)).toBeNull();
    const t = espaces(texteCourt(facture(), { solde }));
    expect(t).toBe('Bonjour, voici votre facture FAC-2026-00010 : 1 000,00 € à régler au plus tard le 11 septembre 2026.');
    const html = espaces(buildDocumentEmailBody({ doc: facture(), client: { nom: 'Dupont' }, entreprise: { nom: 'Élec' }, solde }));
    expect(html).toMatch(/Veuillez trouver ci-joint votre facture/);
    expect(html).not.toMatch(/Sauf erreur|à nouveau/);
  });

  it('acompte reçu, avant l\'échéance : le reste à régler est indiqué', () => {
    const solde = soldeDe(facture({ montant_paye: 300 }), [], LE_5_SEPT);
    const html = espaces(buildDocumentEmailBody({ doc: facture(), client: { nom: 'Dupont' }, entreprise: { nom: 'Élec' }, solde, lienPaiement: 'https://x/pay/1' }));
    expect(html).toMatch(/reste à régler : <strong>700,00 €/);
    expect(html).toMatch(/Régler en ligne/);
  });

  it('facture soldée : pas de bouton de paiement', () => {
    const solde = soldeDe(facture({ montant_paye: 1000 }), [], LE_1_OCT);
    const html = buildDocumentEmailBody({ doc: facture(), client: { nom: 'Dupont' }, entreprise: { nom: 'Élec' }, solde, lienPaiement: 'https://x/pay/1' });
    expect(html).not.toMatch(/Régler en ligne/);
  });

  it('rien à relancer : brouillon, avoir, facture soldée ou créditée', () => {
    expect(relanceDe(facture({ statut: 'brouillon' }), [], LE_1_OCT)).toBeNull();
    expect(relanceDe(facture({ facture_type: 'avoir', total_ttc: -300 }), [], LE_1_OCT)).toBeNull();
    expect(relanceDe(facture({ montant_paye: 1000 }), [], LE_1_OCT)).toBeNull();
    expect(relanceDe(facture({ montant_credite: 1000 }), [], LE_1_OCT)).toBeNull();
  });

  it('un devis annonce le document et son montant', () => {
    expect(espaces(texteCourt({ type: 'devis', numero: 'DEV-1', total_ttc: 500 }))).toBe('Bonjour, voici votre devis DEV-1 : 500,00 €.');
  });

  it('WhatsApp / SMS d\'un devis : le lien pour le consulter et le signer (avant : le montant seul)', () => {
    const t = espaces(texteCourt({ type: 'devis', numero: 'DEV-1', total_ttc: 500 }, { lienSignature: 'https://mallettico.fr/devis/signer/abc', entrepriseNom: 'Élec' }));
    expect(t).toBe('Bonjour, voici votre devis DEV-1 : 500,00 €. Pour le consulter et le signer en ligne : https://mallettico.fr/devis/signer/abc — Élec');
  });
});

describe('numéro WhatsApp', () => {
  it('passe tout numéro à l\'international, outre-mer compris', () => {
    expect(telInternational('06 12 34 56 78')).toBe('33612345678');
    expect(telInternational('06.12.34.56.78')).toBe('33612345678');
    expect(telInternational('+33 6 12 34 56 78')).toBe('33612345678');
    expect(telInternational('0033612345678')).toBe('33612345678');
    expect(telInternational('0690 12 34 56')).toBe('590690123456'); // Guadeloupe
    expect(telInternational('0696 12 34 56')).toBe('596696123456'); // Martinique
    expect(telInternational('0694 12 34 56')).toBe('594694123456'); // Guyane
    expect(telInternational('0692 12 34 56')).toBe('262692123456'); // La Réunion
    expect(telInternational('0639 12 34 56')).toBe('262639123456'); // Mayotte
  });
});

describe('echapperHtml', () => {
  it('neutralise le HTML saisi', () => {
    expect(echapperHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(echapperHtml("L'Atelier & Fils")).toBe('L&#39;Atelier &amp; Fils');
    expect(echapperHtml(null)).toBe('');
  });
});
