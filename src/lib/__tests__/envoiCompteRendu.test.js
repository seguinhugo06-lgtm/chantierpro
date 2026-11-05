import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Envoi du compte rendu d'intervention au client par e-mail (décision d'Hugo du 5 nov. 2026, D-39) : le chemin est celui de
 * l'attestation de ramonage (`envoyerAttestation`, actionsRamonage.js) — `sendDocumentEmail`, donc la fonction `send-email`,
 * aucune nouvelle fonction Edge. Le client Supabase est simulé : on constate ce que l'app envoie, et qu'un refus du
 * serveur n'est jamais pris pour un succès (supabase-js ne lève pas : l'erreur est dans `error`).
 */
const invoke = vi.fn();
vi.mock('../../supabaseClient', () => ({ default: { functions: { invoke: (...a) => invoke(...a) } } }));
// Le PDF : on constate ce qui est joint, pas la mise en page (4 octets « %PDF »)
vi.mock('../pdfDepuisHtml', () => ({ pdfDepuisHtml: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])) }));

const { envoyerCompteRendu, nomFichierCompteRendu } = await import('../../components/electricite/actionsCompteRendu');
const { envoyerAttestation } = await import('../../components/ramonage/actionsRamonage');

// Ce que supabase-js renvoie sur une réponse 4xx/5xx : un message générique, la vraie réponse dans `context`
const refus = (status, corps) => ({
  data: null,
  error: { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify(corps), { status }) },
});

const entreprise = { nom: 'Électricité Exemple', formeJuridique: 'EI', nomEntrepreneur: 'Paul Exemple', email: 'contact@exemple.fr', tel: '05 00 00 00 00' };
const client = { id: 'c1', prenom: 'Lucie', nom: 'Exemple', email: 'lucie@exemple.fr' };
const compteRendu = { id: 'cr1', numero: 'CRI-2026-00001', nature: 'renovation_partielle', realise_le: '2026-11-04T09:00:00Z', mesures: { terre_ohms: '42' } };
const html = '<html><body>Compte rendu</body></html>';

describe('envoi du compte rendu par e-mail', () => {
  beforeEach(() => invoke.mockReset());

  it('part par la fonction send-email : destinataire = le client, objet avec le numéro, PDF joint, réponse au nom de l’entreprise', async () => {
    invoke.mockResolvedValueOnce({ data: { success: true, id: 're_1' }, error: null });
    const r = await envoyerCompteRendu({ html, compteRendu, entreprise, client });
    expect(r).toEqual({ success: true, id: 're_1' });
    expect(invoke).toHaveBeenCalledTimes(1);
    const [fonction, { body }] = invoke.mock.calls[0];
    expect(fonction).toBe('send-email');
    expect(body.action).toBe('send_email');
    expect(body.to).toBe('lucie@exemple.fr');
    expect(body.subject).toMatch(/^Compte rendu d’intervention et d’autocontrôle n° CRI-2026-00001 — /);
    expect(body.html).toContain('n° CRI-2026-00001 du 4 novembre 2026');
    expect(body.reply_to).toBe('contact@exemple.fr');
    expect(body.from_name).toBeTruthy();
    // Un seul PDF, au nom du compte rendu, en base64 (« JVBER » = « %PDF » : ce que send-email exige)
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].filename).toBe(nomFichierCompteRendu(compteRendu));
    expect(body.attachments[0].filename).toBe('Compte-rendu-intervention-CRI-2026-00001.pdf');
    expect(body.attachments[0].content.startsWith('JVBER')).toBe(true);
  });

  it('même chemin que l’attestation de ramonage : mêmes champs envoyés à send-email (aucun champ de plus, aucune autre fonction)', async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    await envoyerCompteRendu({ html, compteRendu, entreprise, client });
    await envoyerAttestation({ html, ramonage: { numero: 'RAM-2026-00001' }, entreprise, client });
    const [[f1, { body: b1 }], [f2, { body: b2 }]] = invoke.mock.calls;
    expect(f1).toBe('send-email');
    expect(f2).toBe('send-email');
    expect(Object.keys(b1).sort()).toEqual(Object.keys(b2).sort());
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('un refus du serveur lève avec sa vraie raison : jamais un succès', async () => {
    invoke.mockResolvedValueOnce(refus(403, { error: "Envoi refusé : lucie@exemple.fr n'est l'adresse d'aucun de vos clients.", code: 'destinataire_non_client' }));
    await expect(envoyerCompteRendu({ html, compteRendu, entreprise, client }))
      .rejects.toThrow("Envoi refusé : lucie@exemple.fr n'est l'adresse d'aucun de vos clients.");
    invoke.mockResolvedValueOnce(refus(429, { error: 'Limite de 50 e-mails par 24 heures atteinte.' }));
    await expect(envoyerCompteRendu({ html, compteRendu, entreprise, client })).rejects.toThrow('Limite de 50 e-mails par 24 heures atteinte.');
  });

  it('une erreur renvoyée dans le corps d’une réponse 200 lève aussi ; un réseau coupé aussi', async () => {
    invoke.mockResolvedValueOnce({ data: { error: 'Resend non configuré.' }, error: null });
    await expect(envoyerCompteRendu({ html, compteRendu, entreprise, client })).rejects.toThrow('Resend non configuré.');
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch', context: undefined } });
    await expect(envoyerCompteRendu({ html, compteRendu, entreprise, client })).rejects.toThrow('Failed to fetch');
  });

  it('contre-essai : la fonction n’appelle que send-email, une seule fois par envoi', async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    await envoyerCompteRendu({ html, compteRendu, entreprise, client });
    expect(invoke.mock.calls.map(([f]) => f)).toEqual(['send-email']);
  });
});
