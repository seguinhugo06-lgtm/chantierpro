import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  devisRemis, remiseDuDevis, preuveRemise, preuveEnvoiParEmail, remettreAvantSignature, estModeRemise, MODES_REMISE, TEXTES_REMISE,
} from '../remiseDevis';
import { ECRITURE_EN_ATTENTE } from '../erreursEcriture';
import { jourLocal } from '../dates';

/**
 * Remise du devis avant la signature sur place (C. conso. L221-8, décision d'Hugo du 5 nov. 2026, D-40) : un devis jamais
 * remis au client ne se fait pas signer. La fenêtre de signature ne s'ouvre jamais avant que la remise soit enregistrée,
 * avec sa preuve (instant et mode, L221-7), et la date de remise est celle de la remise, pas celle de la signature.
 * Textes : avis juriste-btp du 5 nov. 2026, point 7 (lu au texte).
 */

const brouillon = { id: 'd1', type: 'devis', statut: 'brouillon', date_envoi: null };
const MAINTENANT = new Date('2026-11-05T09:12:34.000Z');

/**
 * Un artisan simulé : `reponses` = ses réponses à la 1re fenêtre, `modes` = ses choix à la 2e (rien = « Pas encore ») ;
 * `journal` = ce qui s'est passé, dans l'ordre.
 */
function artisan({ reponses = [true], modes = [], enregistre = true, doc = brouillon } = {}) {
  const journal = [];
  const premieres = [...reponses];
  const choix = [...modes];
  return {
    journal,
    options: {
      doc,
      confirm: async (o) => { journal.push(`fenêtre 1 : ${o.confirmText}`); return premieres.shift() ?? false; },
      choisirMode: async (o) => { const m = choix.shift() ?? null; journal.push(`fenêtre 2 : ${m ?? o.cancelText}`); return m; },
      remettre: async () => { journal.push('PDF remis'); },
      enregistrer: async (maj) => { journal.push(`enregistré : ${maj.statut}, remis le ${maj.date_envoi}, ${maj.remise_au_client?.mode}`); return enregistre; },
      ouvrirSignature: (d) => { journal.push(`signature ouverte (${d.statut})`); },
      signaler: (m) => { journal.push(`message : ${m}`); },
      maintenant: () => MAINTENANT,
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
    expect(journal).toEqual(['fenêtre 1 : Ouvrir le PDF']);
  });
  it('contre-essai 2 : le PDF est ouvert mais l’artisan répond « Pas encore » → rien n’est enregistré, la signature reste fermée', async () => {
    const { journal, options } = artisan({ modes: [] });
    expect(await remettreAvantSignature(options)).toBe(false);
    expect(journal).toEqual(['fenêtre 1 : Ouvrir le PDF', 'PDF remis', 'fenêtre 2 : Pas encore']);
    expect(signatureOuverte(journal)).toBe(false);
    expect(remiseEnregistree(journal)).toBe(false);
  });
  it.each([['papier'], ['envoye']])('remise « %s » confirmée : elle est enregistrée AVANT que la signature s’ouvre, et la signature reçoit le devis remis', async (mode) => {
    const { journal, options } = artisan({ modes: [mode] });
    expect(await remettreAvantSignature(options)).toBe(true);
    const enregistree = journal.findIndex((l) => l.startsWith('enregistré'));
    const ouverte = journal.findIndex((l) => l.startsWith('signature ouverte'));
    expect(enregistree).toBeGreaterThan(-1);
    expect(ouverte).toBeGreaterThan(enregistree);
    expect(journal[enregistree]).toMatch(new RegExp(`, ${mode}$`));
    expect(journal[ouverte]).toBe('signature ouverte (envoye)');
    // Le PDF est remis avant la réponse
    expect(journal.indexOf('PDF remis')).toBeLessThan(journal.findIndex((l) => l.startsWith('fenêtre 2')));
  });
  it('la preuve enregistrée porte l’instant et le mode choisis', async () => {
    const reçus = [];
    const { options } = artisan({ modes: ['papier'] });
    await remettreAvantSignature({ ...options, enregistrer: async (maj) => { reçus.push(maj); return true; } });
    expect(reçus).toHaveLength(1);
    expect(reçus[0].remise_au_client).toEqual({ le: '2026-11-05T09:12:34.000Z', mode: 'papier' });
    expect(reçus[0].statut).toBe('envoye');
  });
  it('contre-essai 3 : la base refuse d’enregistrer la remise → la signature reste fermée et l’artisan est prévenu', async () => {
    const { journal, options } = artisan({ modes: ['papier'], enregistre: false });
    expect(await remettreAvantSignature(options)).toBe(false);
    expect(signatureOuverte(journal)).toBe(false);
    expect(journal.at(-1)).toBe(`message : ${TEXTES_REMISE.nonEnregistree}`);
  });
  it('contre-essai 4 : un mode que la fenêtre ne propose pas est refusé (rien d’enregistré, signature fermée)', async () => {
    const { journal, options } = artisan({ modes: ['telephone'] });
    expect(await remettreAvantSignature(options)).toBe(false);
    expect(remiseEnregistree(journal)).toBe(false);
    expect(signatureOuverte(journal)).toBe(false);
  });
  it('une écriture mise en file hors ligne (ECRITURE_EN_ATTENTE) compte comme enregistrée : la signature s’ouvre', async () => {
    const { journal, options } = artisan({ modes: ['papier'], enregistre: ECRITURE_EN_ATTENTE });
    expect(await remettreAvantSignature(options)).toBe(true);
    expect(signatureOuverte(journal)).toBe(true);
  });
  it('un devis déjà remis (envoyé par e-mail) se fait signer sans nouvelle remise', async () => {
    const { journal, options } = artisan({ doc: { ...brouillon, statut: 'envoye', date_envoi: '2026-11-03' } });
    expect(await remettreAvantSignature(options)).toBe(true);
    expect(journal).toEqual(['signature ouverte (envoye)']);
  });
});

describe('preuve de la remise (C. conso. L221-7) : l’instant et le mode', () => {
  it('deux modes seulement : imprimé et remis, ou envoyé par e-mail ou par message', () => {
    expect(MODES_REMISE).toEqual([
      { valeur: 'papier', libelle: 'Imprimé et remis' },
      { valeur: 'envoye', libelle: 'Envoyé par e-mail ou par message' },
    ]);
    expect(estModeRemise('papier')).toBe(true);
    expect(estModeRemise('envoye')).toBe(true);
    expect(estModeRemise('telephone')).toBe(false);
    expect(estModeRemise(null)).toBe(false);
  });
  it('l’instant est celui de la remise (ISO, avec l’heure), le canal n’est écrit que s’il est connu', () => {
    expect(preuveRemise({ mode: 'papier', le: MAINTENANT })).toEqual({ le: '2026-11-05T09:12:34.000Z', mode: 'papier' });
    expect(preuveRemise({ mode: 'envoye', canal: 'email', le: MAINTENANT })).toEqual({ le: '2026-11-05T09:12:34.000Z', mode: 'envoye', canal: 'email' });
  });
  it('contre-essais : un mode inconnu ou un instant illisible ne fait pas de preuve (jamais une preuve vide)', () => {
    expect(() => preuveRemise({ mode: 'telephone', le: MAINTENANT })).toThrow(/mode de remise inconnu/);
    expect(() => preuveRemise({ le: MAINTENANT })).toThrow(/mode de remise inconnu/);
    expect(() => preuveRemise({ mode: 'papier', le: 'hier' })).toThrow(/illisible/);
  });
  it('le jour de la remise est posé avec le statut « envoyé » et la preuve, sans aucune donnée de signature', () => {
    const maj = remiseDuDevis(brouillon, { mode: 'papier', le: MAINTENANT });
    expect(maj).toEqual({ statut: 'envoye', date_envoi: jourLocal(MAINTENANT), remise_au_client: { le: '2026-11-05T09:12:34.000Z', mode: 'papier' } });
    expect(Object.keys(maj).some((k) => /signature|signataire/i.test(k))).toBe(false);
  });
  it('comme un envoi, la première date est gardée (la preuve, elle, est celle de cette remise)', () => {
    const maj = remiseDuDevis({ ...brouillon, date_envoi: '2026-11-03' }, { mode: 'envoye', le: MAINTENANT });
    expect(maj.date_envoi).toBe('2026-11-03');
    expect(maj.remise_au_client.le).toBe('2026-11-05T09:12:34.000Z');
  });
  it('sans instant donné, c’est maintenant', () => {
    const avant = Date.now();
    const { le } = remiseDuDevis(brouillon, { mode: 'papier' }).remise_au_client;
    expect(new Date(le).getTime()).toBeGreaterThanOrEqual(avant - 1);
    expect(new Date(le).getTime()).toBeLessThanOrEqual(Date.now() + 1);
  });
  it('« Envoyer » par e-mail enregistre le mode « envoyé », canal e-mail, sur un devis', () => {
    expect(preuveEnvoiParEmail(brouillon, MAINTENANT)).toEqual({ remise_au_client: { le: '2026-11-05T09:12:34.000Z', mode: 'envoye', canal: 'email' } });
  });
  it('contre-essais : rien pour une facture, rien quand une première remise est déjà enregistrée (c’est elle qui compte)', () => {
    expect(preuveEnvoiParEmail({ ...brouillon, type: 'facture' }, MAINTENANT)).toEqual({});
    expect(preuveEnvoiParEmail({ ...brouillon, remise_au_client: { le: '2026-11-04T08:00:00.000Z', mode: 'papier' } }, MAINTENANT)).toEqual({});
    expect(preuveEnvoiParEmail(null, MAINTENANT)).toEqual({});
  });
});

describe('les fenêtres de la remise : mot pour mot l’avis juriste-btp du 5 nov. 2026 (point 7)', () => {
  it('1re fenêtre : titre inchangé, message exact, bouton « Ouvrir le PDF »', () => {
    expect(TEXTES_REMISE.avant.title).toBe('Remettez d’abord le devis');
    expect(TEXTES_REMISE.avant.message).toBe('Avant de signer chez lui, le client doit avoir reçu le devis sur papier ou, s’il est d’accord, sur un autre support durable : le PDF envoyé par e-mail ou par message, qu’il peut garder (article L221-8 du Code de la consommation). Le montrer sur votre écran ne suffit pas. Le PDF va s’ouvrir : imprimez-le, ou envoyez-le-lui.');
    expect(TEXTES_REMISE.avant.confirmText).toBe('Ouvrir le PDF');
  });
  it('2e fenêtre : titre inchangé, message exact, bouton « Devis remis au client », annulation « Pas encore »', () => {
    expect(TEXTES_REMISE.apres.title).toBe('Le client a-t-il reçu le devis ?');
    expect(TEXTES_REMISE.apres.message).toBe('Répondez oui seulement s’il l’a reçu : imprimé, ou envoyé par e-mail ou par message avec son accord.');
    expect(TEXTES_REMISE.apres.confirmText).toBe('Devis remis au client');
    expect(TEXTES_REMISE.apres.cancelText).toBe('Pas encore');
  });
  it('la première fenêtre garde le bouton « Annuler » par défaut et n’est pas rouge', () => {
    expect(TEXTES_REMISE.avant.cancelText).toBeUndefined();
    expect(TEXTES_REMISE.avant.variant).toBe('info');
  });
});

describe('DevisPage : la signature n’a qu’une porte, la preuve suit l’envoi, la base est écoutée', () => {
  const source = readFileSync(fileURLToPath(new URL('../../components/DevisPage.jsx', import.meta.url)), 'utf8');
  const corpsDe = (nom) => {
    const debut = source.indexOf(`const ${nom}`);
    expect(debut, nom).toBeGreaterThan(-1);
    // Une fonction du composant se ferme par « }; » à deux espaces de retrait, comme tout le corps du composant
    const fin = source.indexOf('\n  };\n', debut);
    expect(fin, nom).toBeGreaterThan(debut);
    return source.slice(debut, fin);
  };
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
  it('la remise demande le mode par la fenêtre dédiée, et la fenêtre est montée par la liste comme par la fiche', () => {
    expect(source).toContain('choisirMode: () => new Promise((resolve) => setDemandeRemise({ resolve }))');
    expect(source).toContain('<RemiseDevisModal');
    expect(source.indexOf('<RemiseDevisModal')).toBeLessThan(source.indexOf('// === PREVIEW VIEW ==='));
  });
  it('« Envoyer » par e-mail joint la preuve (mode envoyé, canal e-mail) à l’écriture du statut, en démo comme en réel', () => {
    const envoi = corpsDe('sendEmail');
    expect(envoi.match(/preuveEnvoiParEmail\(doc\)/g)).toHaveLength(2);
    expect(envoi.match(/\.\.\.preuve/g).length).toBeGreaterThanOrEqual(3);
  });
  it('la signature ne pose pas la date de remise, et un refus de la base n’affiche pas « Devis signé »', () => {
    const corps = corpsDe('handleSignatureSave');
    expect(corps).toContain('onUpdate(selected.id, signe)');
    expect(corps).not.toContain('date_envoi');
    expect(corps).toContain('if (!enregistre)');
    expect(corps.indexOf('if (!enregistre)')).toBeLessThan(corps.indexOf('Devis signé et accepté'));
    expect(corps).toContain('TEXTES_REMISE.signatureNonEnregistree');
  });
  it('le message de signature refusée est dit à l’artisan', () => {
    expect(TEXTES_REMISE.signatureNonEnregistree).toBe('La signature n’a pas été enregistrée : le devis n’est pas signé. Refaites-le signer.');
  });
});

describe('SignaturePad : « Passer à la signature » prend son accent', () => {
  it('le libellé du bouton', () => {
    const pad = readFileSync(fileURLToPath(new URL('../../components/SignaturePad.jsx', import.meta.url)), 'utf8');
    expect(pad).toContain('Passer à la signature');
    expect(pad).not.toContain('Passer a la signature');
  });
});
