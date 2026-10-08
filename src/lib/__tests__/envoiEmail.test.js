import { describe, it, expect, vi } from 'vitest';
import {
  traiterDemande,
  validerDemande,
  construireMessageResend,
  motifRechercheClient,
  nettoyerNomExpediteur,
  ADRESSE_EQUIPE,
} from '../../../supabase/functions/send-email/envoi.ts';

// Règles de la fonction Edge send-email (relais ouvert fermé le 8 oct. 2026).
// Les dépendances (Supabase, Resend) sont simulées : on constate ce que la
// fonction accepte, refuse, et ce qu'elle transmet réellement à Resend.

const PDF = 'JVBERi0xLjQK' + 'A'.repeat(40); // « %PDF-1.4 » en base64
const CLE_SERVEUR = 'cle-de-service-secrete';
const ARTISAN = { id: 'u-artisan', email: 'Artisan@Exemple.fr' };

function banc({ clients = ['Client.Dupont@Gmail.com'], quota = () => ({ id: 7 }), resend = { ok: true, status: 200, corps: { id: 're_1' } } } = {}) {
  const dep = {
    expediteur: 'noreply@mallettico.fr',
    cleResend: 're_test',
    cleServeur: CLE_SERVEUR,
    limiteJour: 50,
    utilisateur: vi.fn(async (jeton) => (jeton === 'jeton-artisan' ? ARTISAN : null)),
    // Simule PostgREST : la RLS ne montre que les clients de l'artisan, ILIKE insensible à la casse.
    emailsClients: vi.fn(async (jeton, adresse) => clients.filter((e) => e.trim().toLowerCase().includes(adresse.toLowerCase()))),
    reserver: vi.fn(async (...args) => quota(...args)),
    liberer: vi.fn(async () => {}),
    envoyer: vi.fn(async () => resend),
    journal: () => {},
  };
  return dep;
}

function requete(corps, jeton = 'jeton-artisan', methode = 'POST') {
  return new Request('https://x.supabase.co/functions/v1/send-email', {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
    body: methode === 'POST' ? JSON.stringify(corps) : undefined,
  });
}

const devis = (to = 'client.dupont@gmail.com', extra = {}) => ({
  action: 'send_email',
  to,
  subject: 'Devis DEV-2026-001 — Dupont Électricité',
  html: '<p>Bonjour</p>',
  from_name: 'Dupont Électricité',
  reply_to: 'contact@dupont-elec.fr',
  attachments: [{ filename: 'Devis-DEV-2026-001.pdf', content: PDF }],
  ...extra,
});

async function appeler(dep, corps, jeton) {
  const rep = await traiterDemande(requete(corps, jeton), dep);
  return { status: rep.status, corps: await rep.json(), cors: rep.headers.get('Access-Control-Allow-Origin') };
}

describe('send-email : critère d’acceptation', () => {
  it('un devis envoyé à un client de l’artisan part', async () => {
    const dep = banc();
    const { status, corps } = await appeler(dep, devis());
    expect(status).toBe(200);
    expect(corps).toEqual({ success: true, id: 're_1' });
    expect(dep.envoyer).toHaveBeenCalledTimes(1);
    expect(dep.reserver).toHaveBeenCalledWith('u-artisan', 1, 50);
    const message = dep.envoyer.mock.calls[0][0];
    expect(message.to).toEqual(['client.dupont@gmail.com']);
    expect(message.from).toBe('Dupont Électricité <noreply@mallettico.fr>');
    expect(message.attachments).toEqual([{ filename: 'Devis-DEV-2026-001.pdf', content: PDF }]);
  });

  it('un envoi à une adresse qui n’est pas un client est refusé, et rien ne part', async () => {
    const dep = banc();
    const { status, corps, cors } = await appeler(dep, devis('victime@banque.fr'));
    expect(status).toBe(403);
    expect(corps.code).toBe('destinataire_non_client');
    expect(corps.error).toMatch(/victime@banque\.fr n'est l'adresse d'aucun de vos clients/);
    expect(cors).toBe('*');
    expect(dep.envoyer).not.toHaveBeenCalled();
    expect(dep.reserver).not.toHaveBeenCalled();
  });
});

describe('send-email : destinataires', () => {
  it('accepte la casse et les espaces de la fiche client', async () => {
    const dep = banc({ clients: ['  CLIENT.dupont@gmail.com '] });
    expect((await appeler(dep, devis('Client.Dupont@gmail.com'))).status).toBe(200);
  });

  it('refuse une adresse qui ne fait que contenir celle d’un client', async () => {
    const dep = banc({ clients: ['jean.client.dupont@gmail.com'] });
    expect((await appeler(dep, devis('client.dupont@gmail.com'))).status).toBe(403);
  });

  it('accepte sa propre adresse de compte et l’équipe, sans lire les clients', async () => {
    const dep = banc({ clients: [] });
    expect((await appeler(dep, devis('artisan@exemple.fr'))).status).toBe(200);
    expect((await appeler(dep, devis(ADRESSE_EQUIPE, { attachments: undefined }))).status).toBe(200);
    expect(dep.emailsClients).not.toHaveBeenCalled();
  });

  it('plusieurs destinataires : un seul intrus suffit à tout refuser', async () => {
    const dep = banc();
    const { status } = await appeler(dep, devis(['client.dupont@gmail.com', 'intrus@x.fr']));
    expect(status).toBe(403);
    expect(dep.envoyer).not.toHaveBeenCalled();
  });

  it('refuse les formes qui contourneraient la vérification', async () => {
    const dep = banc();
    // 'Kevin' : signe kelvin, qui devient « k » en minuscules (ressemblerait à la fiche kevin@…).
    for (const to of ['Banque <victime@banque.fr>', 'client.dupont@gmail.com, victime@banque.fr', '%@gmail.com', '*@gmail.com', 'Kevin@gmail.com', 'jérôme@gmail.com', '', null]) {
      expect((await appeler(dep, devis(to))).status, String(to)).toBe(400);
    }
    expect((await appeler(dep, devis(Array.from({ length: 6 }, (_, i) => `c${i}@x.fr`)))).status).toBe(400);
    expect(dep.envoyer).not.toHaveBeenCalled();
  });

  it('lecture des clients en échec : refus (503), rien ne part', async () => {
    const dep = banc();
    dep.emailsClients.mockRejectedValueOnce(new Error('timeout'));
    const { status } = await appeler(dep, devis());
    expect(status).toBe(503);
    expect(dep.envoyer).not.toHaveBeenCalled();
  });

  it('le motif ILIKE neutralise le joker « _ »', () => {
    expect(motifRechercheClient(' Jean_Dupont@X.fr ')).toBe('%jean\\_dupont@x.fr%');
  });
});

describe('send-email : appelant', () => {
  it('sans jeton, avec la clé anon ou un jeton invalide : 401', async () => {
    const dep = banc();
    expect((await appeler(dep, devis(), null)).status).toBe(401);
    expect((await appeler(dep, devis(), 'cle-anon-publique')).status).toBe(401);
    expect(dep.envoyer).not.toHaveBeenCalled();
  });

  it('la clé de service (relances planifiées) envoie sans plafond ni lecture des clients', async () => {
    const dep = banc({ clients: [] });
    const { status } = await appeler(dep, devis('client.inconnu@x.fr', { attachments: undefined }), CLE_SERVEUR);
    expect(status).toBe(200);
    expect(dep.utilisateur).not.toHaveBeenCalled();
    expect(dep.emailsClients).not.toHaveBeenCalled();
    expect(dep.reserver).not.toHaveBeenCalled();
  });

  it('un compte anonyme (connexion anonyme Supabase) est refusé', async () => {
    const dep = banc();
    dep.utilisateur.mockResolvedValueOnce({ id: 'u-anonyme', email: null, anonyme: true });
    expect((await appeler(dep, devis())).status).toBe(401);
    expect(dep.envoyer).not.toHaveBeenCalled();
  });

  it('un jeton qui ressemble à la clé de service sans l’être n’en a pas les droits', async () => {
    const dep = banc();
    expect((await appeler(dep, devis('victime@banque.fr'), CLE_SERVEUR + 'x')).status).toBe(401);
  });

  it('seule l’action send_email existe (send_campaign et send_review_request retirées)', async () => {
    const dep = banc();
    for (const action of ['send_campaign', 'send_review_request', undefined]) {
      expect((await appeler(dep, devis(undefined, { action }))).status).toBe(400);
    }
    expect(dep.envoyer).not.toHaveBeenCalled();
  });

  it('OPTIONS répond avec les en-têtes CORS ; GET est refusé', async () => {
    const dep = banc();
    const options = await traiterDemande(requete(null, null, 'OPTIONS'), dep);
    expect(options.status).toBe(200);
    expect(options.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect((await traiterDemande(requete(null, 'jeton-artisan', 'GET'), dep)).status).toBe(405);
  });
});

describe('send-email : plafond quotidien', () => {
  it('plafond atteint : 429, message clair, rien ne part', async () => {
    const dep = banc({ quota: () => ({ id: null }) });
    const { status, corps } = await appeler(dep, devis());
    expect(status).toBe(429);
    expect(corps.code).toBe('plafond_atteint');
    expect(corps.error).toMatch(/Limite de 50 e-mails par 24 heures/);
    expect(dep.envoyer).not.toHaveBeenCalled();
  });

  it('Resend en échec : la réservation est rendue', async () => {
    const dep = banc({ resend: { ok: false, status: 422, corps: { message: 'domaine non vérifié' } } });
    const { status, corps } = await appeler(dep, devis());
    expect(status).toBe(502);
    expect(corps.error).toBe('domaine non vérifié');
    expect(dep.liberer).toHaveBeenCalledWith(7);
  });

  it('Resend injoignable (le réseau lève) : 502 et la réservation est rendue', async () => {
    const dep = banc();
    dep.envoyer.mockRejectedValueOnce(new Error('connection reset'));
    const { status, corps } = await appeler(dep, devis());
    expect(status).toBe(502);
    expect(corps.error).toMatch(/injoignable/);
    expect(dep.liberer).toHaveBeenCalledWith(7);
  });

  it('un vrai PDF produit par jsPDF (comme emailSender) passe la règle des pièces jointes', async () => {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.text('Devis DEV-2026-00001', 10, 10);
    const octets = new Uint8Array(pdf.output('arraybuffer'));
    const contenu = btoa(String.fromCharCode(...octets)); // même encodage qu'emailSender (uint8ToBase64)
    const v = validerDemande({ ...devis(), attachments: [{ filename: 'Devis-DEV-2026-00001.pdf', content: contenu }] });
    expect(v).toHaveProperty('demande');
  });

  it('compteur pas encore installé (migration 077) : l’envoi au client part quand même', async () => {
    const dep = banc({ quota: () => ({ id: null, indisponible: true }) });
    expect((await appeler(dep, devis())).status).toBe(200);
    expect(dep.liberer).not.toHaveBeenCalled();
  });

  it('erreur du compteur : refus (500), rien ne part', async () => {
    const dep = banc({ quota: () => { throw new Error('connexion perdue'); } });
    expect((await appeler(dep, devis())).status).toBe(500);
    expect(dep.envoyer).not.toHaveBeenCalled();
  });
});

describe('send-email : contenu transmis à Resend', () => {
  it('n’accepte que des PDF en pièce jointe', () => {
    const base = devis();
    const essai = (attachments) => validerDemande({ ...base, attachments });
    expect(essai([{ filename: 'facture.exe', content: PDF }])).toEqual({ erreur: 'Seuls des documents PDF peuvent être joints.' });
    expect(essai([{ filename: 'devis.pdf', content: 'TVqQAAMAAAAEAAAA' }])).toHaveProperty('erreur'); // un .exe renommé
    expect(essai([{ filename: '../devis.pdf', content: PDF }])).toHaveProperty('erreur');
    expect(essai([{ filename: 'devis.pdf', path: 'https://pirate.example/x.pdf' }])).toHaveProperty('erreur');
    expect(essai(Array.from({ length: 4 }, () => ({ filename: 'a.pdf', content: PDF })))).toHaveProperty('erreur');
    expect(essai([{ filename: 'a.pdf', content: 'JVBER' + 'A'.repeat(14_000_000) }])).toEqual({ erreur: 'Pièces jointes trop lourdes (10 Mo au plus).' });
  });

  it('ne transmet que les champs connus (ni cc, ni bcc, ni en-têtes)', () => {
    const v = validerDemande({ ...devis(), cc: ['x@y.fr'], bcc: ['z@y.fr'], headers: { 'X-Test': '1' } });
    const message = construireMessageResend(v.demande, 'noreply@mallettico.fr');
    expect(Object.keys(message).sort()).toEqual(['attachments', 'from', 'html', 'reply_to', 'subject', 'to']);
  });

  it('nom d’expéditeur et objet nettoyés, adresse de réponse invalide ignorée', () => {
    expect(nettoyerNomExpediteur('Dupont <pirate@x.fr>\r\nBcc: y@z.fr')).toBe('Dupont pirate x.fr Bcc y z.fr');
    expect(nettoyerNomExpediteur('support@banque.fr')).toBe('support banque.fr'); // n'imite pas une adresse
    expect(nettoyerNomExpediteur('   ')).toBeUndefined();
    const v = validerDemande({ ...devis(), subject: 'Devis\r\nBcc: x@y.fr', reply_to: 'contact chez dupont' });
    expect(v.demande.sujet).toBe('Devis  Bcc: x@y.fr');
    expect(v.demande.repondreA).toBeUndefined();
    expect(validerDemande({ ...devis(), subject: 'x'.repeat(251) })).toHaveProperty('erreur');
    expect(validerDemande({ ...devis(), html: 'x'.repeat(200_001) })).toHaveProperty('erreur');
  });
});
