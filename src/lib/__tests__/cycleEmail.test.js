import { describe, it, expect, vi } from 'vitest';
import { traiterCycle, raisonSansBienvenue, BIENVENUE_DEPUIS } from '../../../supabase/functions/send-lifecycle-email/cycle.ts';
import { bienvenueAttendue } from '../bienvenue';

// send-lifecycle-email : avant le 8 oct. 2026, la clé publique suffisait pour envoyer un e-mail
// « Mallettico » à n'importe qui, avec un nom d'organisation et un lien d'invitation au choix.

const CLE_SERVEUR = 'cle-de-service-secrete';
const MAINTENANT = new Date('2026-10-10T10:00:00Z');
const PATRON = { id: 'u-patron', email: 'patron@exemple.fr', creeLe: '2026-10-09T08:00:00Z', appMetadata: {} };
const INVITATION_ID = '0b9f2a4e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const JETON_INVITATION = 'f1e2d3c4-b5a6-4978-8a6b-5c4d3e2f1a0b';

function banc({ utilisateur = PATRON, invitation, quota = () => ({ id: 3 }) } = {}) {
  return {
    expediteur: 'noreply@mallettico.fr',
    cleResend: 're_test',
    cleServeur: CLE_SERVEUR,
    limiteJour: 50,
    maintenant: () => MAINTENANT,
    utilisateur: vi.fn(async (jeton) => (jeton === 'jeton-patron' ? utilisateur : null)),
    invitation: vi.fn(async () => (invitation === undefined ? {
      email: 'salarie@exemple.fr', token: JETON_INVITATION, role: 'ouvrier', status: 'pending',
      expires_at: '2026-10-15T10:00:00Z', organization_id: 'org-1', invited_by: 'u-patron',
    } : invitation)),
    nomOrganisation: vi.fn(async () => 'Dupont & Fils <b>Élec</b>'),
    marquerBienvenue: vi.fn(async () => {}),
    reserver: vi.fn(async (...a) => quota(...a)),
    liberer: vi.fn(async () => {}),
    envoyer: vi.fn(async () => ({ ok: true, status: 200, corps: { id: 're_9' } })),
    journal: () => {},
  };
}

async function appeler(dep, corps, jeton = 'jeton-patron') {
  const rep = await traiterCycle(new Request('https://x.supabase.co/functions/v1/send-lifecycle-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
    body: JSON.stringify(corps),
  }), dep);
  return { status: rep.status, corps: await rep.json() };
}

describe('send-lifecycle-email : plus de relais ouvert', () => {
  it('avec la seule clé publique (ou sans jeton) : 401, rien ne part', async () => {
    const dep = banc();
    for (const jeton of [null, 'cle-anon-publique']) {
      const { status } = await appeler(dep, { type: 'invitation', to: 'victime@banque.fr', data: { inviteLink: 'https://pirate.example' } }, jeton);
      expect(status).toBe(401);
    }
    expect(dep.envoyer).not.toHaveBeenCalled();
  });

  it('les e-mails d’essai et de paiement sont réservés au serveur', async () => {
    const dep = banc();
    expect((await appeler(dep, { type: 'payment_failed', to: 'victime@banque.fr' })).status).toBe(403);
    expect(dep.envoyer).not.toHaveBeenCalled();
    expect((await appeler(dep, { type: 'payment_success', to: 'client@exemple.fr', data: { amount: '<a href="x">9,90 €</a>' } }, CLE_SERVEUR)).status).toBe(200);
    expect(dep.envoyer.mock.calls[0][0].html).toContain('&lt;a href=&quot;x&quot;&gt;9,90 €&lt;/a&gt;');
  });

  it('type inconnu : 400', async () => {
    expect((await appeler(banc(), { type: 'campagne', to: 'x@y.fr' })).status).toBe(400);
  });
});

describe('send-lifecycle-email : bienvenue', () => {
  it('part à l’adresse du compte connecté, jamais à celle fournie', async () => {
    const dep = banc();
    const { status } = await appeler(dep, { type: 'welcome', to: 'victime@banque.fr' });
    expect(status).toBe(200);
    expect(dep.envoyer.mock.calls[0][0].to).toEqual(['patron@exemple.fr']);
    expect(dep.marquerBienvenue).toHaveBeenCalledWith('u-patron', MAINTENANT.toISOString());
  });

  it('une seule fois, et seulement pour un compte récent', async () => {
    const deja = banc({ utilisateur: { ...PATRON, appMetadata: { bienvenue_envoyee_le: '2026-10-09T09:00:00Z' } } });
    expect((await appeler(deja, { type: 'welcome' })).corps).toMatchObject({ envoye: false, raison: 'déjà envoyée' });
    const ancien = banc({ utilisateur: { ...PATRON, creeLe: '2026-09-01T08:00:00Z' } });
    expect((await appeler(ancien, { type: 'welcome' })).corps.envoye).toBe(false);
    expect(deja.envoyer).not.toHaveBeenCalled();
    expect(ancien.envoyer).not.toHaveBeenCalled();
  });

  it('règle d’âge : comptes créés depuis la mise en place, moins de 7 jours', () => {
    expect(raisonSansBienvenue(PATRON, MAINTENANT)).toBeNull();
    expect(raisonSansBienvenue({ ...PATRON, creeLe: '2026-10-07T23:00:00Z' }, MAINTENANT)).toMatch(/antérieur/);
    expect(raisonSansBienvenue(PATRON, new Date('2026-10-17T09:00:00Z'))).toMatch(/7 jours/);
    expect(new Date(BIENVENUE_DEPUIS).toISOString()).toBe('2026-10-08T00:00:00.000Z');
  });

  it('côté app : demandée seulement pour un compte récent qui ne l’a pas reçue', () => {
    const maintenant = new Date('2026-10-10T10:00:00Z').getTime();
    const recent = { email: 'a@b.fr', created_at: '2026-10-09T10:00:00Z', app_metadata: {} };
    expect(bienvenueAttendue(recent, maintenant)).toBe(true);
    expect(bienvenueAttendue({ ...recent, app_metadata: { bienvenue_envoyee_le: 'x' } }, maintenant)).toBe(false);
    expect(bienvenueAttendue({ ...recent, created_at: '2026-09-01T10:00:00Z' }, maintenant)).toBe(false);
    expect(bienvenueAttendue({ ...recent, is_anonymous: true }, maintenant)).toBe(false);
  });
});

describe('send-lifecycle-email : invitation d’équipe', () => {
  it('destinataire, organisation (échappée) et lien viennent de la base, pas de la requête', async () => {
    const dep = banc();
    const { status } = await appeler(dep, {
      type: 'invitation', invitationId: INVITATION_ID,
      to: 'victime@banque.fr', data: { orgName: 'Votre banque', inviteLink: 'https://pirate.example' },
    });
    expect(status).toBe(200);
    expect(dep.invitation).toHaveBeenCalledWith('jeton-patron', INVITATION_ID);
    const message = dep.envoyer.mock.calls[0][0];
    expect(message.to).toEqual(['salarie@exemple.fr']);
    expect(message.subject).toBe('Invitation à rejoindre Dupont & Fils b Élec /b sur Mallettico');
    expect(message.html).toContain(`href="https://mallettico.fr/invitation/${JETON_INVITATION}"`);
    expect(message.html).not.toContain('pirate.example');
    expect(message.html).not.toContain('Votre banque');
    expect(message.html).not.toContain('<b>');
    expect(message.html).toContain('Ouvrier');
    expect(dep.reserver).toHaveBeenCalledWith('u-patron', 1, 50);
  });

  it('seul l’auteur de l’invitation peut la faire envoyer', async () => {
    const dep = banc({ invitation: {
      email: 'salarie@autre.fr', token: JETON_INVITATION, role: 'ouvrier', status: 'pending',
      expires_at: '2026-10-15T10:00:00Z', organization_id: 'org-2', invited_by: 'u-quelquun-dautre',
    } });
    expect((await appeler(dep, { type: 'invitation', invitationId: INVITATION_ID })).status).toBe(404);
    expect(dep.envoyer).not.toHaveBeenCalled();
  });

  it('invitation invisible, expirée, déjà acceptée ou identifiant invalide : refus', async () => {
    expect((await appeler(banc({ invitation: null }), { type: 'invitation', invitationId: INVITATION_ID })).status).toBe(404);
    const base = { email: 'salarie@exemple.fr', token: JETON_INVITATION, role: 'ouvrier', organization_id: 'org-1', invited_by: 'u-patron' };
    expect((await appeler(banc({ invitation: { ...base, status: 'pending', expires_at: '2026-10-01T00:00:00Z' } }), { type: 'invitation', invitationId: INVITATION_ID })).status).toBe(409);
    expect((await appeler(banc({ invitation: { ...base, status: 'accepted', expires_at: '2026-10-15T00:00:00Z' } }), { type: 'invitation', invitationId: INVITATION_ID })).status).toBe(409);
    expect((await appeler(banc(), { type: 'invitation', invitationId: 'x; drop table' })).status).toBe(400);
  });

  it('compte dans le plafond quotidien : au-delà, 429', async () => {
    const dep = banc({ quota: () => ({ id: null }) });
    expect((await appeler(dep, { type: 'invitation', invitationId: INVITATION_ID })).status).toBe(429);
    expect(dep.envoyer).not.toHaveBeenCalled();
  });
});
