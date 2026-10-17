// Vérifications de la migration 089 : accusés de rétractation relancés par le serveur.
// Les rétractations sont posées comme retracter_devis les enregistre (086) ; le job appelle ensuite
// notify-signature pour chaque jeton rendu par accuses_retractation_a_relancer (pg_net n'existe pas au banc :
// on constate la sélection, l'espacement des essais, la borne, le partage entre comptes et la garde du compteur).
import { PATRON, SOLO } from './socle.mjs';

const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ORGA_PATRON = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export async function verifier({ q, en, commeAnonyme, verifier }) {
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const retracte = async (numero, depuis, champs = {}) => (await q(
    `INSERT INTO devis (user_id, organization_id, numero, type, statut, date, signature_data, signature_date, signature_token,
       retractation_en_ligne, retractation_le, retractation_nom, retractation_email, retractation_accuse_le)
     VALUES ($1, $2, $3, 'devis', 'annule', current_date, 'data:image/png;base64,AA==', now() - interval '8 days',
       CASE WHEN $6 THEN NULL ELSE gen_random_uuid() END, true, now() - $4::interval, 'Léa Client089', 'lea@089.fr', $5)
     RETURNING id, signature_token`,
    [champs.user ?? SOLO, champs.org ?? ORGA_SOLO, numero, depuis, champs.accuse ?? null, champs.sansJeton === true])).rows[0];
  const relancer = async (limite = 10) => (await q('SELECT t FROM accuses_retractation_a_relancer($1) t', [limite])).rows.map((r) => r.t);
  const essais = async (id) => (await q('SELECT retractation_accuse_essais AS n FROM devis WHERE id = $1', [id])).rows[0].n;
  const vider = () => q(`DELETE FROM devis WHERE numero LIKE 'DEV-089-%'`);

  // ── Sélection ──
  const enAttente = await retracte('DEV-089-A', '20 minutes');
  const recente = await retracte('DEV-089-B', '1 minute');            // la page du client est peut-être encore en train d'envoyer
  const dejaAccusee = await retracte('DEV-089-C', '2 hours', { accuse: new Date().toISOString() });
  const ancienne = await retracte('DEV-089-D', '8 days');             // au-delà de 7 jours : plus de rappel automatique
  const sansJeton = await retracte('DEV-089-E', '30 minutes', { sansJeton: true });
  const premier = await relancer();
  verifier(premier.length === 1 && premier[0] === enAttente.signature_token,
    `089 : seule la rétractation de plus de 5 minutes, sans accusé, de moins de 7 jours et avec un lien est relancée (${premier.length} jeton(s))`);
  verifier(await essais(enAttente.id) === 1 && await essais(recente.id) === 0 && await essais(dejaAccusee.id) === 0 && await essais(ancienne.id) === 0 && await essais(sansJeton.id) === 0,
    '089 : un essai est compté pour le devis relancé, et pour lui seul');

  // ── Essais espacés : 5 min, 15 min, 45 min… après la rétractation ──
  const second = await relancer();
  const troisieme = await relancer();
  verifier(second.includes(enAttente.signature_token) && !troisieme.includes(enAttente.signature_token) && await essais(enAttente.id) === 2,
    '089 : rétractée il y a 20 minutes : 2e essai (au-delà de 15 min), pas de 3e avant 45 min');
  await vider();

  // ── Borne : 5 essais au plus ──
  const tenace = await retracte('DEV-089-T', '6 days');
  for (let i = 0; i < 7; i++) await relancer();
  verifier(await essais(tenace.id) === 5 && (await relancer()).length === 0, '089 : au plus 5 essais par devis (adresse invalide : pas de rappel sans fin)');
  await vider();

  // ── Un accusé parti (notify-signature réserve retractation_accuse_le) n'est plus relancé ──
  const autre = await retracte('DEV-089-F', '15 minutes');
  await q('UPDATE devis SET retractation_accuse_le = now() WHERE id = $1', [autre.id]);
  verifier((await relancer()).length === 0, '089 : un accusé envoyé (par la page ou par un rappel) n\'est plus relancé');
  await vider();

  // ── Partage : au plus 2 devis par compte et par passage, p_limite en tout ──
  const solo = [];
  for (let i = 0; i < 4; i++) solo.push(await retracte(`DEV-089-S${i}`, `${10 + i} minutes`));
  const patron = await retracte('DEV-089-P', '10 minutes', { user: PATRON, org: ORGA_PATRON });
  const passage = await relancer(10);
  verifier(passage.length === 3 && passage.includes(patron.signature_token) && solo.filter((d) => passage.includes(d.signature_token)).length === 2,
    `089 : un compte qui a 4 accusés en attente n'en passe que 2, l'autre compte passe aussi (${passage.length} jetons)`);
  const restants = solo.filter((d) => !passage.includes(d.signature_token)).map((d) => d.signature_token);
  const suivant = await relancer(10);
  verifier(restants.every((t) => suivant.includes(t)), '089 : ceux qui attendaient passent en tête au passage suivant (moins d\'essais d\'abord)');
  verifier((await relancer(1)).length <= 1, '089 : jamais plus de p_limite jetons par passage');

  // ── Le compteur n'est tenu que par le serveur ──
  const idSolo = solo[0].id;
  verifier(await refuse(() => en(SOLO, () => q('UPDATE devis SET retractation_accuse_essais = -32768 WHERE id = $1', [idSolo])))
    && await refuse(() => en(SOLO, () => q('UPDATE devis SET retractation_accuse_essais = 0 WHERE id = $1', [idSolo])))
    && await refuse(() => en(SOLO, () => q(`INSERT INTO devis (user_id, organization_id, numero, type, statut, retractation_accuse_essais)
         VALUES ($1, $2, 'DEV-089-X', 'devis', 'brouillon', -5)`, [SOLO, ORGA_SOLO]))),
  '089 : l\'artisan ne peut ni remettre à zéro ni forcer le compteur (sinon ses devis passeraient devant ceux des autres)');
  verifier((await en(SOLO, () => q(`UPDATE devis SET numero = 'DEV-089-S0b' WHERE id = $1 RETURNING id`, [idSolo]))).rows.length === 1,
    '089 : … sans gêner les autres modifications du devis');
  const avant = await essais(idSolo);
  await q('UPDATE devis SET retractation_le = now() - interval \'6 days\' WHERE id = $1', [idSolo]);
  await relancer(10);
  verifier(await essais(idSolo) === avant + 1, '089 : … et le serveur l\'incrémente toujours');
  verifier(await refuse(() => q('UPDATE devis SET retractation_accuse_essais = 101 WHERE id = $1', [idSolo])),
    '089 : contrainte de valeur (0 à 100), même pour le serveur');

  // ── Réservé au serveur ──
  verifier(await refuse(() => en(SOLO, () => q('SELECT accuses_retractation_a_relancer(10)')))
    && await refuse(() => commeAnonyme(() => q('SELECT accuses_retractation_a_relancer(10)'))),
  '089 : ni l\'artisan ni un visiteur n\'appellent la fonction (elle rend des liens de signature)');
  const controles = (await q(`SELECT
      has_function_privilege('authenticated', 'public.accuses_retractation_a_relancer(integer)', 'EXECUTE')
        OR has_function_privilege('anon', 'public.accuses_retractation_a_relancer(integer)', 'EXECUTE') AS c2,
      (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_garder_essais_accuse')
        + (SELECT count(*) FROM pg_constraint WHERE conname = 'devis_retractation_accuse_essais_borne') AS c4`)).rows[0];
  verifier(controles.c2 === false && Number(controles.c4) === 2, `089 : contrôles 2 et 4 de l'en-tête → f, 2 (${controles.c2}, ${controles.c4})`);

  await vider();
}
