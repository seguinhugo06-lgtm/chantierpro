import { describe, it, expect, vi } from 'vitest';
import { PLANS } from '../../stores/subscriptionStore';
import { traiterDictee, classerErreurApi, LIMITES, MESSAGES } from '../../../supabase/functions/voice-intent/regles.ts';
import { requeteDictee, MODELE, EFFORT } from '../../../supabase/functions/voice-intent/consignes.ts';

const ORG = '11111111-2222-4333-8444-555555555555';
const UTILISATEUR = { id: 'u-1', email: 'artisan@exemple.fr' };
const INTENTION = { resume: 'Un devis', incertitudes: [], client: null, chantiers: [], document: null };

const demande = (corps = { transcript: 'Madame Dupont, 15 m² de carrelage à 45 euros', organisation: ORG }, jeton = 'jeton-utilisateur') =>
  new Request('https://x/voice-intent', {
    method: 'POST',
    headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
    body: JSON.stringify(corps),
  });

const reponseModele = (texte = JSON.stringify(INTENTION), extra = {}) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: texte }],
  usage: { input_tokens: 1500, output_tokens: 300 },
  ...extra,
});

function dependances(surcharges = {}) {
  let t = 1000;
  return {
    cleServeur: 'cle-serveur',
    cleApi: 'sk-ant-test',
    utilisateur: vi.fn(async (jeton) => (jeton === 'jeton-utilisateur' ? UTILISATEUR : null)),
    reserver: vi.fn(async () => ({ autorise: true, id: 42, limite: 10, utilise: 3, plan: 'gratuit' })),
    terminer: vi.fn(async () => {}),
    appeler: vi.fn(async () => { t += 1800; return reponseModele(); }),
    maintenant: () => t,
    journal: vi.fn(),
    ...surcharges,
  };
}

const lire = async (r) => ({ status: r.status, corps: await r.json(), cors: r.headers.get('access-control-allow-origin') });

describe('voice-intent : quota par plan', () => {
  it('recopie exactement PLANS[plan].limits.dictees (une seule source)', () => {
    for (const plan of Object.keys(PLANS)) {
      expect(LIMITES.dictee[plan], plan).toBe(PLANS[plan].limits.dictees);
    }
    expect(Object.keys(LIMITES.dictee).sort()).toEqual(Object.keys(PLANS).sort());
  });

  it('réserve AVANT d’appeler le modèle, pour l’utilisateur vérifié et l’organisation demandée', async () => {
    const dep = dependances();
    const ordre = [];
    dep.reserver.mockImplementation(async (d) => { ordre.push('reserver'); expect(d).toEqual({ userId: 'u-1', organisation: ORG, fonction: 'dictee', limites: LIMITES.dictee }); return { autorise: true, id: 42, limite: 10, utilise: 3, plan: 'gratuit' }; });
    dep.appeler.mockImplementation(async () => { ordre.push('appeler'); return reponseModele(); });
    const { status, corps } = await lire(await traiterDictee(demande(), dep));
    expect(status).toBe(200);
    expect(ordre).toEqual(['reserver', 'appeler']);
    expect(corps.intention).toEqual(INTENTION);
    expect(corps.quota).toEqual({ limite: 10, utilise: 3, plan: 'gratuit' });
  });

  it('quota atteint : 429 QUOTA_ATTEINT, message qui propose la saisie à la main, et l’API n’est pas appelée', async () => {
    const dep = dependances({ reserver: vi.fn(async () => ({ autorise: false, limite: 10, utilise: 10, plan: 'gratuit' })) });
    const { status, corps, cors } = await lire(await traiterDictee(demande(), dep));
    expect(status).toBe(429);
    expect(corps.code).toBe('QUOTA_ATTEINT');
    expect(corps.error).toBe(MESSAGES.quota(10));
    expect(corps.error).toMatch(/à la main/);
    expect(cors).toBe('*');
    expect(dep.appeler).not.toHaveBeenCalled();
  });

  it('autre organisation : 403, sans appel à l’API', async () => {
    const dep = dependances({ reserver: vi.fn(async () => ({ horsOrganisation: true })) });
    const { status, corps } = await lire(await traiterDictee(demande(), dep));
    expect([status, corps.code]).toEqual([403, 'HORS_ORGANISATION']);
    expect(dep.appeler).not.toHaveBeenCalled();
  });

  it('compteur absent (migration non appliquée) ou base en panne : refus propre (fermé), sans appel à l’API', async () => {
    for (const reserver of [vi.fn(async () => ({ indisponible: true })), vi.fn(async () => { throw new Error('connexion refusée'); })]) {
      const dep = dependances({ reserver });
      const { status, corps } = await lire(await traiterDictee(demande(), dep));
      expect([status, corps.code, corps.error]).toEqual([503, 'IA_INDISPONIBLE', MESSAGES.indisponible]);
      expect(dep.appeler).not.toHaveBeenCalled();
    }
  });

  it('une organisation mal formée n’est pas transmise : la base prend celle de l’utilisateur', async () => {
    const dep = dependances();
    await traiterDictee(demande({ transcript: 'Un devis de peinture', organisation: "x' OR 1=1" }), dep);
    expect(dep.reserver.mock.calls[0][0].organisation).toBeNull();
  });
});

describe('voice-intent : qui peut appeler', () => {
  it.each([
    ['sans jeton', ''],
    ['clé anon ou jeton invalide', 'jeton-inconnu'],
    ['la clé de service (aucun utilisateur à décompter)', 'cle-serveur'],
  ])('%s → 401, rien de réservé', async (_, jeton) => {
    const dep = dependances();
    const { status, corps } = await lire(await traiterDictee(demande(undefined, jeton), dep));
    expect([status, corps.code]).toEqual([401, 'NON_CONNECTE']);
    expect(dep.reserver).not.toHaveBeenCalled();
  });

  it('dictée vide ou trop longue → 400, rien de réservé', async () => {
    for (const transcript of ['', ' a ', 'x'.repeat(5001), 42]) {
      const dep = dependances();
      const r = await traiterDictee(demande({ transcript }), dep);
      expect(r.status).toBe(400);
      expect(dep.reserver).not.toHaveBeenCalled();
    }
  });
});

describe('voice-intent : API en panne ou crédits épuisés', () => {
  it('clé API absente : 503 avant toute réservation', async () => {
    const dep = dependances({ cleApi: undefined });
    const { status, corps } = await lire(await traiterDictee(demande(), dep));
    expect([status, corps.code]).toEqual([503, 'IA_INDISPONIBLE']);
    expect(dep.reserver).not.toHaveBeenCalled();
  });

  it.each([
    ['crédits épuisés (400 credit balance)', Object.assign(new Error('Your credit balance is too low to access the Anthropic API.'), { status: 400 }), 'credits'],
    ['facturation (402)', Object.assign(new Error('billing'), { status: 402, type: 'billing_error' }), 'credits'],
    ['clé refusée (401)', Object.assign(new Error('invalid x-api-key'), { status: 401 }), 'cle'],
    ['trop de requêtes (429)', Object.assign(new Error('rate'), { status: 429 }), 'debit'],
    ['API surchargée (529)', Object.assign(new Error('Overloaded'), { status: 529 }), 'surcharge'],
    ['panne (500)', Object.assign(new Error('boom'), { status: 500 }), 'panne'],
    ['délai dépassé', Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' }), 'delai'],
    ['pas de réseau', Object.assign(new Error('Connection error.'), { name: 'APIConnectionError' }), 'reseau'],
  ])('%s → 503 « indisponible, à la main », usage clos en échec (ne décompte pas)', async (_, err, motif) => {
    expect(classerErreurApi(err)).toBe(motif);
    const dep = dependances({ appeler: vi.fn(async () => { throw err; }) });
    const { status, corps, cors } = await lire(await traiterDictee(demande(), dep));
    expect([status, corps.code, corps.error]).toEqual([503, 'IA_INDISPONIBLE', 'Dictée indisponible pour le moment. Saisissez votre devis à la main.']);
    expect(corps.success).toBeUndefined();
    expect(cors).toBe('*');
    expect(dep.terminer).toHaveBeenCalledWith(42, expect.objectContaining({ statut: 'echec', motif, modele: 'claude-haiku-5-5' }));
  });

  it('refus du modèle ou réponse illisible : erreur propre, usage clos en échec avec ses jetons', async () => {
    const cas = [
      [reponseModele(undefined, { stop_reason: 'refusal' }), 422, 'NON_TRAITEE', 'refus'],
      [reponseModele('{"resume": "coupé'), 502, 'ILLISIBLE', 'illisible'],
      [reponseModele(undefined, { stop_reason: 'max_tokens' }), 502, 'ILLISIBLE', 'illisible'],
      [{ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }], usage: {} }, 502, 'ILLISIBLE', 'illisible'],
    ];
    for (const [message, status, code, motif] of cas) {
      const dep = dependances({ appeler: vi.fn(async () => message) });
      const r = await lire(await traiterDictee(demande(), dep));
      expect([r.status, r.corps.code]).toEqual([status, code]);
      expect(r.corps.error).toMatch(/à la main/);
      expect(dep.terminer).toHaveBeenCalledWith(42, expect.objectContaining({ statut: 'echec', motif }));
    }
  });

  it('succès : usage clos « réussi » avec les jetons et la durée ; le bloc thinking en tête est ignoré', async () => {
    const dep = dependances();
    const { corps } = await lire(await traiterDictee(demande(), dep));
    expect(corps.success).toBe(true);
    expect(dep.terminer).toHaveBeenCalledWith(42, { statut: 'reussi', modele: MODELE, dureeMs: 1800, jetonsEntree: 1500, jetonsSortie: 300 });
    expect(corps.usage).toEqual({ input_tokens: 1500, output_tokens: 300, duree_ms: 1800 });
  });

  it('un journal en panne ne casse pas une dictée réussie', async () => {
    const dep = dependances({ terminer: vi.fn(async () => { throw new Error('base indisponible'); }) });
    const r = await traiterDictee(demande(), dep);
    expect(r.status).toBe(200);
    expect(dep.journal).toHaveBeenCalledWith('erreur', expect.stringContaining('non clos'));
  });
});

describe('voice-intent : requête Haiku 5.5', () => {
  it('modèle claude-haiku-5-5, effort low, sortie structurée ; ni température, ni budget de réflexion, ni pré-remplissage', () => {
    const r = requeteDictee('  Madame Dupont  ', { clients: ['Marie Dupont'], articles: ['Carrelage sol'] });
    expect(r.model).toBe('claude-haiku-5-5');
    expect(EFFORT).toBe('low');
    expect(r.output_config.effort).toBe('low');
    expect(r.output_config.format.type).toBe('json_schema');
    expect(r.output_config.format.schema.additionalProperties).toBe(false);
    expect(r).not.toHaveProperty('temperature');
    expect(r).not.toHaveProperty('top_p');
    expect(r).not.toHaveProperty('top_k');
    expect(r).not.toHaveProperty('thinking');
    expect(r.messages).toEqual([{ role: 'user', content: 'Madame Dupont' }]);
    expect(r.system).toContain('Marie Dupont');
    expect(r.system).toContain('Carrelage sol');
  });

  it('le contexte venu du navigateur est borné (60 clients, 80 articles, textes seulement)', () => {
    const clients = Array.from({ length: 100 }, (_, i) => `Client ${i}`);
    const r = requeteDictee('Un devis', { clients: [...clients, { nom: 'objet' }], articles: 'pas une liste' });
    expect(r.system).toContain('Client 59');
    expect(r.system).not.toContain('Client 60');
    expect(r.system).not.toContain('objet');
    expect(r.system).not.toContain('Libellés du catalogue');
  });
});
