// Vérifications de la migration 077 : plafond quotidien d'envoi d'e-mails (send-email).
// Le compteur n'est utilisable que par le serveur ; un utilisateur ne peut ni le lire, ni
// l'écrire, ni réserver (il épuiserait le plafond d'un autre).
import { PATRON, SALARIE, SOLO, PAYEUR } from './socle.mjs';

const RESERVER = 'SELECT reserver_envoi_email($1, $2, $3) AS id';

export async function verifier({ db, q, en, commeAnonyme, compte, verifier }) {
  const commeServeur = async (fn) => {
    await db.exec('BEGIN; SET LOCAL ROLE service_role;');
    try { const r = await fn(); await db.exec('COMMIT'); return r; } catch (e) { await db.exec('ROLLBACK'); throw e; }
  };
  const reserver = async (uid, nb, limite) => (await commeServeur(() => q(RESERVER, [uid, nb, limite]))).rows[0].id;
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const lignes = (uid) => compte('SELECT count(*) AS n FROM envois_email WHERE user_id = $1', [uid]);

  // ── Le plafond lui-même (rôle serveur, plafond 3) ──
  const ids = [await reserver(SOLO, 1, 3), await reserver(SOLO, 1, 3), await reserver(SOLO, 1, 3)];
  verifier(ids.every((id) => id != null), '077 : trois envois sous un plafond de 3 sont acceptés');
  verifier(await reserver(SOLO, 1, 3) == null && (await lignes(SOLO)) === 3, '077 : le 4e est refusé (NULL) et rien n\'est compté en plus');

  verifier(await reserver(PAYEUR, 2, 3) != null, '077 : un envoi à 2 destinataires compte pour 2');
  verifier(await reserver(PAYEUR, 2, 3) == null, '077 : 2 destinataires quand il n\'en reste qu\'un : refusé');
  verifier(await reserver(PAYEUR, 1, 3) != null, '077 : le dernier destinataire restant passe');

  // ── Fenêtre glissante et purge ──
  await q(`INSERT INTO envois_email (user_id, nb_destinataires, created_at) VALUES ($1, 50, now() - interval '25 hours')`, [PATRON]);
  verifier(await reserver(PATRON, 1, 3) != null, '077 : les envois de plus de 24 h ne comptent plus');
  await q(`INSERT INTO envois_email (user_id, nb_destinataires, created_at) VALUES ($1, 1, now() - interval '3 days'), ($2, 1, now() - interval '3 days')`, [PATRON, SALARIE]);
  await reserver(PATRON, 1, 3);
  verifier(await compte(`SELECT count(*) AS n FROM envois_email WHERE user_id = $1 AND created_at < now() - interval '2 days'`, [PATRON]) === 0,
    '077 : les lignes de plus de 2 jours de l\'utilisateur sont purgées');
  verifier(await compte(`SELECT count(*) AS n FROM envois_email WHERE user_id = $1 AND created_at < now() - interval '2 days'`, [SALARIE]) === 1,
    '077 : la purge ne touche pas les lignes d\'un autre utilisateur');
  verifier(await reserver(SALARIE, 1, 3) != null, '077 : les plafonds de deux utilisateurs sont indépendants (SOLO au plafond de 3, SALARIE envoie)');

  // ── Paramètres invalides ──
  verifier(await refuse(() => reserver(SOLO, 0, 50)) && await refuse(() => reserver(SOLO, 51, 50))
    && await refuse(() => reserver(SOLO, 1, 0)) && await refuse(() => reserver(null, 1, 50)),
  '077 : nombre de destinataires hors 1..50, plafond nul ou utilisateur absent → erreur');

  // ── Le serveur rend une réservation (Resend en échec) ──
  const rendue = await reserver(PAYEUR, 1, 10);
  const avant = await lignes(PAYEUR);
  const supprimees = await commeServeur(() => q('DELETE FROM envois_email WHERE id = $1', [rendue]));
  verifier(supprimees.affectedRows === 1 && (await lignes(PAYEUR)) === avant - 1, '077 : le serveur peut rendre une réservation (DELETE par id)');

  // ── Fermé à l'API publique ──
  verifier(await refuse(() => en(SOLO, () => q(RESERVER, [SOLO, 1, 1000]))), '077 : un utilisateur connecté ne peut pas appeler reserver_envoi_email');
  verifier(await refuse(() => en(SOLO, () => q(RESERVER, [PATRON, 50, 50]))), '077 : un utilisateur ne peut pas épuiser le plafond d\'un autre');
  verifier(await refuse(() => commeAnonyme(() => q(RESERVER, [SOLO, 1, 1000]))), '077 : un visiteur (clé publique) ne peut pas appeler reserver_envoi_email');

  const luParSolo = await en(SOLO, () => q('SELECT count(*) AS n FROM envois_email'));
  verifier(Number(luParSolo.rows[0].n) === 0 && (await lignes(SOLO)) === 3, '077 : un utilisateur ne lit aucune ligne du compteur, même les siennes');
  verifier(await refuse(() => en(SOLO, () => q('INSERT INTO envois_email (user_id, nb_destinataires) VALUES ($1, 1)', [SOLO]))),
    '077 : un utilisateur ne peut pas écrire dans le compteur');
  await en(SOLO, () => q('DELETE FROM envois_email WHERE user_id = $1', [SOLO]));
  verifier((await lignes(SOLO)) === 3, '077 : un utilisateur ne peut pas effacer ses envois pour remettre son plafond à zéro');
  const luParVisiteur = await commeAnonyme(() => q('SELECT count(*) AS n FROM envois_email'));
  verifier(Number(luParVisiteur.rows[0].n) === 0, '077 : un visiteur ne lit rien du compteur');

  // ── Requête de contrôle de l'en-tête (droits sur la fonction, RLS) ──
  const controle = (await q(`SELECT has_function_privilege('authenticated', 'public.reserver_envoi_email(uuid,integer,integer)', 'execute') AS auth_exec,
      has_function_privilege('anon', 'public.reserver_envoi_email(uuid,integer,integer)', 'execute') AS anon_exec,
      has_function_privilege('service_role', 'public.reserver_envoi_email(uuid,integer,integer)', 'execute') AS serveur_exec,
      (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.envois_email'::regclass) AS rls`)).rows[0];
  verifier(!controle.auth_exec && !controle.anon_exec && controle.serveur_exec && controle.rls,
    '077 : requête de contrôle → fonction fermée à anon/authenticated, ouverte au serveur, RLS active');
}
