// Vérifications de la migration 097 : plus de secret en clair dans les tâches planifiées.
// Au moment des migrations, le banc n'a pas de job : on en pose un, avec un faux secret, puis on rejoue la migration.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/097_plus_de_secret_en_clair_dans_les_taches_planifiees.sql');
const FAUX = 'faux-secret-du-banc-0123456789abcdef';
const commande = (secret) => `SELECT net.http_post(url := 'https://exemple.supabase.co/functions/v1/send-scheduled-relances',
  headers := '{"Content-Type":"application/json"}'::jsonb,
  body := jsonb_build_object('dryRun', false, 'cronSecret', ${secret}), timeout_milliseconds := 60000);`;

export async function verifier({ db, q, verifier }) {
  const rejouer = () => db.exec(fs.readFileSync(MIGRATION, 'utf8'));
  // Refus attendu, et le message (texte, détail, contexte) ne cite jamais le secret
  const erreurs = [];
  const refuse = async (fn) => {
    try { await fn(); return false; } catch (e) { erreurs.push([e.message, e.detail, e.where, e.hint].join(' ')); return true; }
  };
  const job = async () => (await q(`SELECT command FROM cron.job WHERE jobname = 'send-scheduled-relances-daily'`)).rows[0]?.command;
  const coffre = async () => (await q(`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret_relances'`)).rows.map((r) => r.decrypted_secret);

  await q(`INSERT INTO cron.job (jobname, schedule, command) VALUES ('send-scheduled-relances-daily', '0 8 * * *', $1)`,
    [commande(`$sec$${FAUX}$sec$`)]);
  await rejouer();
  const apres = await job();
  verifier(!apres.includes(FAUX) && apres.includes(`'cronSecret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret_relances')`),
    '097 : la commande du job lit le secret dans Vault et ne le contient plus');
  verifier(apres.endsWith('timeout_milliseconds := 60000);') && apres.includes("'dryRun', false"), '097 : le reste de la commande est intact');
  const ranges = await coffre();
  verifier(ranges.length === 1 && ranges[0] === FAUX, '097 : le secret est rangé dans Vault, une seule fois, à l\'identique');

  await rejouer();
  verifier((await job()) === apres && (await coffre()).length === 1, '097 : rejouée, elle ne change plus rien');

  // Un autre secret déjà dans Vault : arrêt, commande intacte
  await q(`UPDATE cron.job SET command = $1 WHERE jobname = 'send-scheduled-relances-daily'`, [commande(`$$${FAUX}-nouveau$$`)]);
  verifier(await refuse(rejouer) && (await job()).includes(`${FAUX}-nouveau`), '097 : un secret différent dans Vault arrête la migration, sans toucher au job');

  // Forme inattendue (secret non écrit entre dollars) : arrêt, commande intacte
  await q(`DELETE FROM vault.decrypted_secrets WHERE name = 'cron_secret_relances'`);
  await q(`UPDATE cron.job SET command = $1 WHERE jobname = 'send-scheduled-relances-daily'`, [commande(`'${FAUX}'`)]);
  verifier(await refuse(rejouer) && (await coffre()).length === 0, '097 : une commande de forme inattendue arrête la migration, rien n\'est rangé');

  // Secret présent deux fois dans la commande : arrêt, rien n'est rangé
  await q(`UPDATE cron.job SET command = $1 WHERE jobname = 'send-scheduled-relances-daily'`,
    [`${commande(`$s$${FAUX}$s$`)} -- ${FAUX}`]);
  verifier(await refuse(rejouer) && (await coffre()).length === 0, '097 : un secret écrit deux fois arrête la migration, rien n\'est rangé');
  verifier(erreurs.length === 3 && erreurs.every((m) => !m.includes(FAUX)), `097 : aucun message d'erreur ne cite le secret (${erreurs.length} refus)`);

  // Balise vide $$ et caractères spéciaux : extrait à l'identique
  const SPECIAL = `x'y\\z"é€;--)$a-0123456789`;
  await q(`UPDATE cron.job SET command = $1 WHERE jobname = 'send-scheduled-relances-daily'`, [commande(`$$${SPECIAL}$$`)]);
  await rejouer();
  const ranges2 = await coffre();
  verifier(ranges2.length === 1 && ranges2[0] === SPECIAL && !(await job()).includes(SPECIAL),
    '097 : balise $$ et caractères spéciaux : secret rangé à l\'identique, plus dans la commande');

  await q(`DELETE FROM cron.job WHERE jobname = 'send-scheduled-relances-daily'`);
  await q(`DELETE FROM vault.decrypted_secrets WHERE name = 'cron_secret_relances'`);
}
