import { describe, it, expect } from 'vitest';
import { finValidite, joursRestants, estExpire } from '../validiteDevis';
import { signatureDuClient } from '../signatureDocument';
import { buildDocumentEmailBody } from '../emailSender';

describe('validité d\'un devis (recette du 9 oct. 2026)', () => {
  it('fin = date + validité choisie, 30 jours par défaut, sinon la date enregistrée', () => {
    expect(finValidite({ date: '2026-10-01', validite: 45 })).toBe('2026-11-15');
    expect(finValidite({ date: '2026-10-01' })).toBe('2026-10-31');
    expect(finValidite({ date: '2026-10-01', date_validite: '2026-12-01' })).toBe('2026-12-01');
    expect(finValidite({})).toBeNull();
  });

  it('valable jusqu\'au dernier jour inclus, expiré le lendemain', () => {
    const doc = { date: '2026-10-01', validite: 30 };
    expect(joursRestants(doc, '2026-10-21')).toBe(10);
    expect(joursRestants(doc, '2026-10-31')).toBe(0);
    expect(estExpire(doc, '2026-10-31')).toBe(false);
    expect(estExpire(doc, '2026-11-01')).toBe(true);
  });
});

describe('signature du client : les deux chemins se relisent', () => {
  const trace = 'data:image/png;base64,iVBORw0KGgo=';

  it('signature à distance (sign_devis) : tracé, nom et date', () => {
    expect(signatureDuClient({ signature_data: trace, signataire_nom: 'Paul Martin', signature_date: '2026-10-09T10:00:00Z' }))
      .toEqual({ image: trace, nom: 'Paul Martin', date: '2026-10-09T10:00:00Z' });
  });

  it('signature sur place : mêmes informations', () => {
    expect(signatureDuClient({ signature: trace, signataire: 'Paul Martin', signatureDate: '2026-10-09' }))
      .toEqual({ image: trace, nom: 'Paul Martin', date: '2026-10-09' });
  });

  it('seul un tracé encodé s\'imprime en image ; non signé = null', () => {
    expect(signatureDuClient({ signature: 'signed' }).image).toBeNull();
    expect(signatureDuClient({ signature: 'javascript:alert(1)' }).image).toBeNull();
    expect(signatureDuClient({ signature: 'data:image/svg+xml;base64,PHN2Zz4=' }).image).toBeNull();
    expect(signatureDuClient({})).toBeNull();
  });
});

describe('e-mail d\'un devis : la validité réelle (avant : « reste valable 30 jours » quoi qu\'il arrive)', () => {
  const espaces = (t) => t.replace(/\u202f|\u00a0/g, ' ');
  const devis = { type: 'devis', numero: 'DEV-1', date: '2026-10-01', validite: 45, total_ttc: 500, date_envoi: '2026-10-02' };

  it('dit le dernier jour de validité', () => {
    const html = espaces(buildDocumentEmailBody({ doc: devis, client: { nom: 'Dupont' }, entreprise: { nom: 'Élec' } }));
    expect(html).toMatch(/valable jusqu'au <strong>15 novembre 2026/);
    expect(html).not.toMatch(/30 jours/);
  });

  it('relance : revient vers le client, avec la date d\'envoi, et le lien de signature « simple »', () => {
    const html = espaces(buildDocumentEmailBody({ doc: devis, client: { nom: 'Dupont' }, entreprise: { nom: 'Élec', formeJuridique: 'EI' }, relanceDevis: true, signatureUrl: 'https://mallettico.fr/devis/signer/abc' }));
    expect(html).toMatch(/revenir vers vous au sujet du devis <strong>DEV-1/);
    expect(html).toMatch(/envoyé le 2 octobre 2026/);
    expect(html).toMatch(/Signature électronique simple/);
    expect(html).toMatch(/Élec EI/);
  });
});
