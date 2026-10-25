import { describe, it, expect } from 'vitest';
import { MODES_PAIEMENT, libelleModePaiement } from '../modesPaiement';
import { LIBELLES_MODE_RECU, buildPaymentReceiptEmailBody } from '../emailSender';

// Relecture de la Task 4 (24 oct. 2026) : « Prélèvement », choisi dans « Encaisser », s'affichait « prelevement » sur la
// fiche facture et dans le reçu envoyé au client. Chaque mode de la fenêtre a un libellé dans les deux listes.
const recu = (modePaiement) => buildPaymentReceiptEmailBody({
  doc: { numero: 'FAC-2026-00001', type: 'facture' }, client: { nom: 'Exemple' }, entreprise: { nom: 'Élec Exemple' },
  montantFormatte: '100,00 €', modePaiement, datePaiement: '2026-10-02',
});

describe('modes de paiement : un libellé partout', () => {
  it.each(MODES_PAIEMENT.map((m) => [m.valeur, m.libelle]))('%s : libellé à l’écran « %s »', (valeur, libelle) => {
    expect(libelle).toBeTruthy();
    expect(libelleModePaiement(valeur)).toBe(libelle);
  });

  it.each(MODES_PAIEMENT.map((m) => [m.valeur]))('%s : prévu dans le reçu envoyé au client', (valeur) => {
    expect(Object.prototype.hasOwnProperty.call(LIBELLES_MODE_RECU, valeur), `mode « ${valeur} » absent des libellés du reçu`).toBe(true);
    const html = recu(valeur);
    if (LIBELLES_MODE_RECU[valeur]) expect(html).toContain(`Reçu le 2 octobre 2026 — ${LIBELLES_MODE_RECU[valeur]}</p>`);
    else expect(html).toContain('Reçu le 2 octobre 2026</p>');
  });

  it('« prélèvement » écrit en toutes lettres, jamais le code', () => {
    expect(libelleModePaiement('prelevement')).toBe('Prélèvement');
    const html = recu('prelevement');
    expect(html).toContain('prélèvement');
    expect(html).not.toContain('prelevement');
  });

  it('« autre » : rien après la date dans le reçu (relecture juriste-btp du 24 oct. 2026)', () => {
    expect(recu('autre')).not.toMatch(/Reçu le 2 octobre 2026 —/);
  });

  it('valeurs anciennes et absentes : « Mode non précisé », jamais un mode inventé', () => {
    expect(libelleModePaiement('carte')).toBe('Carte');
    expect(libelleModePaiement(undefined)).toBe('Mode non précisé');
    expect(libelleModePaiement('')).toBe('Mode non précisé');
    expect(libelleModePaiement('lettre de change')).toBe('lettre de change');
  });
});
