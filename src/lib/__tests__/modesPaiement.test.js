import { describe, it, expect } from 'vitest';
import { MODES_PAIEMENT, libelleModePaiement } from '../modesPaiement';
import { LIBELLES_MODE_RECU, buildPaymentReceiptEmailBody } from '../emailSender';

// Relecture de la Task 4 (24 oct. 2026) : « Prélèvement », choisi dans « Encaisser », s'affichait « prelevement » sur la
// fiche facture et dans le reçu envoyé au client. Chaque mode de la fenêtre a un libellé dans les deux listes.
describe('modes de paiement : un libellé partout', () => {
  it.each(MODES_PAIEMENT.map((m) => [m.valeur, m.libelle]))('%s : libellé à l’écran « %s »', (valeur, libelle) => {
    expect(libelle).toBeTruthy();
    expect(libelleModePaiement(valeur)).toBe(libelle);
  });

  it.each(MODES_PAIEMENT.map((m) => [m.valeur]))('%s : libellé dans le reçu envoyé au client', (valeur) => {
    expect(LIBELLES_MODE_RECU[valeur], `pas de libellé de reçu pour « ${valeur} »`).toBeTruthy();
    const html = buildPaymentReceiptEmailBody({
      doc: { numero: 'FAC-2026-00001', type: 'facture' }, client: { nom: 'Exemple' }, entreprise: { nom: 'Élec Exemple' },
      montantFormatte: '100,00 €', modePaiement: valeur, datePaiement: '2026-10-02',
    });
    expect(html).toContain(`— ${LIBELLES_MODE_RECU[valeur]}`);
  });

  it('« prélèvement » écrit en toutes lettres, jamais le code', () => {
    expect(libelleModePaiement('prelevement')).toBe('Prélèvement');
    const html = buildPaymentReceiptEmailBody({ doc: { numero: 'F' }, client: {}, entreprise: {}, modePaiement: 'prelevement', datePaiement: '2026-10-02' });
    expect(html).toContain('prélèvement');
    expect(html).not.toContain('prelevement');
  });

  it('valeurs anciennes et absentes', () => {
    expect(libelleModePaiement('carte')).toBe('Carte');
    expect(libelleModePaiement(undefined)).toBe('Virement');
    expect(libelleModePaiement('lettre de change')).toBe('lettre de change');
  });
});
