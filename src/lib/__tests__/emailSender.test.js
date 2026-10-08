import { describe, it, expect, vi, beforeEach } from 'vitest';

// Le client Supabase est simulé : on constate ce que l'app envoie à send-email et ce
// qu'elle montre à l'artisan quand la fonction refuse (403, 429).
const invoke = vi.fn();
vi.mock('../../supabaseClient', () => ({ default: { functions: { invoke: (...a) => invoke(...a) } } }));

const { invoquerEnvoiEmail, sendDocumentEmail } = await import('../emailSender');

// Ce que supabase-js renvoie sur une réponse 4xx/5xx : un message générique, la vraie réponse dans `context`.
const refus = (status, corps) => ({
  data: null,
  error: { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify(corps), { status }) },
});

describe('envoi d’un e-mail depuis l’app', () => {
  beforeEach(() => invoke.mockReset());

  it('un devis part avec le même corps qu’avant (action, destinataire, objet, expéditeur)', async () => {
    invoke.mockResolvedValueOnce({ data: { success: true, id: 're_1' }, error: null });
    const r = await sendDocumentEmail({ to: 'client@exemple.fr', subject: 'Devis DEV-1', bodyHtml: '<p>Bonjour</p>', fromName: 'Dupont', replyTo: 'contact@dupont.fr' });
    expect(r).toEqual({ success: true, id: 're_1' });
    expect(invoke).toHaveBeenCalledWith('send-email', { body: {
      action: 'send_email', to: 'client@exemple.fr', subject: 'Devis DEV-1', html: '<p>Bonjour</p>',
      from_name: 'Dupont', reply_to: 'contact@dupont.fr', attachments: undefined,
    } });
  });

  it('un refus du serveur montre sa vraie raison, pas « non-2xx »', async () => {
    invoke.mockResolvedValueOnce(refus(403, { error: "Envoi refusé : x@y.fr n'est l'adresse d'aucun de vos clients.", code: 'destinataire_non_client' }));
    await expect(invoquerEnvoiEmail({ action: 'send_email', to: 'x@y.fr', subject: 's' })).rejects.toThrow("Envoi refusé : x@y.fr n'est l'adresse d'aucun de vos clients.");
    invoke.mockResolvedValueOnce(refus(429, { error: 'Limite de 50 e-mails par 24 heures atteinte.' }));
    await expect(invoquerEnvoiEmail({})).rejects.toThrow('Limite de 50 e-mails par 24 heures atteinte.');
  });

  it('corps illisible : le message d’origine reste', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch', context: undefined } });
    await expect(invoquerEnvoiEmail({})).rejects.toThrow('Failed to fetch');
  });
});
