import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { devisRemis, remiseDuDevis, remettreAvantSignature, TEXTES_REMISE } from '../remiseDevis';
import { ECRITURE_EN_ATTENTE } from '../erreursEcriture';

/**
 * Remise du devis avant la signature sur place (C. conso. L221-8, décision d'Hugo du 5 nov. 2026, D-40) : un devis jamais
 * remis au client ne se fait pas signer. La fenêtre de signature ne s'ouvre jamais avant que la remise soit enregistrée,
 * et la date de remise est celle de la remise, pas celle de la signature.
 */

const brouillon = { id: 'd1', type: 'devis', statut: 'brouillon', date_envoi: null };

/**
 * Un artisan simulé : `reponses` = ses réponses aux fenêtres dans l'ordre ; `journal` = ce qui s'est passé, dans l'ordre.
 */
function artisan({ reponses = [], enregistre = true, doc = brouillon } = {}) {
  const journal = [];
  const file = [...reponses];
  return {
    journal,
    options: {
      doc,
      confirm: async (o) => { journal.push(`fenêtre : ${o.confirmText}`); return file.shift() ?? false; },
      remettre: async () => { journal.push('PDF remis'); },
      enregistrer: async (maj) => { journal.push(`enregistré : ${maj.statut}, remis le ${maj.date_envoi}`); return enregistre; },
      ouvrirSignature: (d) => { journal.push(`signature ouverte (${d.statut})`); },
      signaler: (m) => { journal.push(`message : ${m}`); },
    },
  };
}
const signatureOuverte = (journal) => journal.some((l) => l.startsWith('signature ouverte'));
const remiseEnregistree = (journal) => journal.some((l) => l.startsWith('enregistré'));

describe('un devis remis : la remise est enregistrée', () => {
  it.each([['brouillon', false], ['envoye', true], ['vu', true], ['accepte', false], ['refuse', false], [undefined, false]])('statut %s → remis : %s', (statut, attendu) => {
    expect(devisRemis({ type: 'devis', statut })).toBe(attendu);
  });
  it('rien (pas de devis) : pas remis', () => {
    expect(devisRemis(null)).toBe(false);
    expect(devisRemis(undefined)).toBe(false);
  });
});

describe('« Faire signer » sur un brouillon : remise, enregistrement, puis signature', () => {
  it('contre-essai 1 : l’artisan renonce à la première fenêtre → rien n’est remis, rien n’est enregistré, la signature reste fermée', async () => {
    const { journal, options } = artisan({ reponses: [false] });
    expect(await remettreAvantSignature(options)).toBe(false);
    expect(journal).toEqual(['fenêtre : Ouvrir le PDF']);
  });
  it('contre-essai 2 : le PDF est ouvert mais l’artisan ne confirme pas la remise → rien n’est enregistré, la signature reste fermée', async () => {
    const { journal, options } = artisan({ reponses: [true, false] });
    expect(await remettreAvantSignature(options)).toBe(false);
    expect(journal).toEqual(['fenêtre : Ouvrir le PDF', 'PDF remis', 'fenêtre : Devis remis au client']);
    expect(signatureOuverte(journal)).toBe(false);
    expect(remiseEnregistree(journal)).toBe(false);
  });
  it('remise confirmée : la remise est enregistrée AVANT que la signature s’ouvre, et la signature reçoit le devis remis', async () => {
    const { journal, options } = artisan({ reponses: [true, true] });
    expect(await remettreAvantSignature(options)).toBe(true);
    const enregistree = journal.findIndex((l) => l.startsWith('enregistré'));
    const ouverte = journal.findIndex((l) => l.startsWith('signature ouverte'));
    expect(enregistree).toBeGreaterThan(-1);
    expect(ouverte).toBeGreaterThan(enregistree);
    expect(journal[ouverte]).toBe('signature ouverte (envoye)');
    // Le PDF est remis avant la confirmation
    expect(journal.indexOf('PDF remis')).toBeLessThan(journal.findIndex((l) => l === 'fenêtre : Devis remis au client'));
  });
  it('contre-essai 3 : la base refuse d’enregistrer la remise → la signature reste fermée et l’artisan est prévenu', async () => {
    const { journal, options } = artisan({ reponses: [true, true], enregistre: false });
    expect(await remettreAvantSignature(options)).toBe(false);
    expect(signatureOuverte(journal)).toBe(false);
    expect(journal.at(-1)).toBe(`message : ${TEXTES_REMISE.nonEnregistree}`);
  });
  it('une écriture mise en file hors ligne (ECRITURE_EN_ATTENTE) compte comme enregistrée : la signature s’ouvre', async () => {
    const { journal, options } = artisan({ reponses: [true, true], enregistre: ECRITURE_EN_ATTENTE });
    expect(await remettreAvantSignature(options)).toBe(true);
    expect(signatureOuverte(journal)).toBe(true);
  });
  it('un devis déjà remis (envoyé par e-mail) se fait signer sans nouvelle remise', async () => {
    const { journal, options } = artisan({ doc: { ...brouillon, statut: 'envoye', date_envoi: '2026-11-03' } });
    expect(await remettreAvantSignature(options)).toBe(true);
    expect(journal).toEqual(['signature ouverte (envoye)']);
  });
});

describe('les fenêtres de la remise disent la règle', () => {
  it('papier, ou support durable avec l’accord du client (L221-8) ; l’écran ne suffit pas ; l’artisan confirme « Devis remis au client »', () => {
    const { avant, apres } = TEXTES_REMISE;
    for (const attendu of ['sur papier', 'support durable', 's’il est d’accord', 'L221-8', 'Le montrer à l’écran ne suffit pas']) expect(avant.message).toContain(attendu);
    expect(apres.confirmText).toBe('Devis remis au client');
    // Une confirmation qui ne détruit rien n'est pas rouge
    expect([avant.variant, apres.variant]).toEqual(['info', 'info']);
  });
});

describe('la date de remise est celle de la remise', () => {
  it('le jour de la remise est posé, avec le statut « envoyé » et rien d’autre (aucune donnée de signature)', () => {
    const maj = remiseDuDevis(brouillon, '2026-11-05');
    expect(maj).toEqual({ statut: 'envoye', date_envoi: '2026-11-05' });
    expect(Object.keys(maj).some((k) => /signature|signataire/i.test(k))).toBe(false);
  });
  it('comme un envoi, la première date est gardée', () => {
    expect(remiseDuDevis({ ...brouillon, date_envoi: '2026-11-03' }, '2026-11-05').date_envoi).toBe('2026-11-03');
  });
  it('sans jour donné, c’est aujourd’hui (jour local)', () => {
    expect(remiseDuDevis(brouillon).date_envoi).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('DevisPage : la signature n’a qu’une porte', () => {
  const source = readFileSync(fileURLToPath(new URL('../../components/DevisPage.jsx', import.meta.url)), 'utf8');
  it('un seul appel à setShowSignaturePad(true), dans ouvrirSignature, derrière devisRemis', () => {
    expect(source.match(/setShowSignaturePad\(true\)/g)).toHaveLength(1);
    const debut = source.indexOf('const ouvrirSignature');
    expect(debut).toBeGreaterThan(-1);
    const porte = source.slice(debut, debut + 500);
    expect(porte).toContain('devisRemis(doc)');
    expect(porte.indexOf('devisRemis(doc)')).toBeLessThan(porte.indexOf('setShowSignaturePad(true)'));
  });
  it('« Faire signer » d’un brouillon passe par la remise ; celui d’un devis envoyé par la porte', () => {
    expect(source).toContain('trySend(selected, remettrePuisFaireSigner)');
    expect(source).toContain('onClick: () => ouvrirSignature(selected)');
  });
  it('la signature ne pose pas la date de remise', () => {
    const debut = source.indexOf('const handleSignatureSave');
    // La fonction se ferme par « }; » à deux espaces de retrait, comme tout le corps du composant
    const fin = source.indexOf('\n  };\n', debut);
    expect(debut).toBeGreaterThan(-1);
    expect(fin).toBeGreaterThan(debut);
    const corps = source.slice(debut, fin);
    expect(corps).toContain('onUpdate(selected.id, signe)');
    expect(corps).not.toContain('date_envoi');
  });
});
