import { describe, it, expect } from 'vitest';
import { texteDeHtml } from '../texteDeHtml';
import { buildDocumentEmailBody } from '../emailSender';

describe('texteDeHtml : aperçu texte d’un e-mail (feuille « Relancer »)', () => {
  it('un paragraphe par ligne, sans balises ni espace avant la ponctuation', () => {
    expect(texteDeHtml('<p>Bonjour <strong>Marc</strong>,</p><p>Le devis <strong>DEV-1</strong>, d’un montant de <strong>10 €</strong>.</p>'))
      .toBe('Bonjour Marc,\nLe devis DEV-1, d’un montant de 10 €.');
  });

  it('rend les entités échappées (nom saisi avec des caractères spéciaux)', () => {
    expect(texteDeHtml('<p>Dupont &amp; Fils &lt;SARL&gt; l&#39;atelier &quot;Lumière&quot;</p>'))
      .toBe('Dupont & Fils <SARL> l\'atelier "Lumière"');
  });

  it('vide pour une valeur absente', () => {
    expect(texteDeHtml('')).toBe('');
    expect(texteDeHtml(null)).toBe('');
  });

  it('l’e-mail de relance d’un devis se lit tel qu’il partira', () => {
    const html = buildDocumentEmailBody({
      doc: { numero: 'DEV-2026-00005', type: 'devis', total_ttc: 14400, date: '2026-10-01', date_envoi: '2026-10-02', validite: 30 },
      client: { prenom: 'Marc', nom: 'Lefevre' },
      entreprise: { nom: 'Élec Exemple' },
      montantFormatte: '14 400,00 €',
      signatureUrl: '[lien de signature]',
      relanceDevis: true,
    });
    const texte = texteDeHtml(html);
    expect(texte.split('\n')[0]).toBe('Bonjour Marc Lefevre,');
    expect(texte).toContain('Je me permets de revenir vers vous au sujet du devis DEV-2026-00005, d\'un montant de 14 400,00 €');
    expect(texte).toContain('Consulter et signer le devis en ligne');
    expect(texte).not.toMatch(/<|>/);
  });
});
