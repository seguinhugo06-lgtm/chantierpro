// Vérifications de la migration 109 : l'accord de l'artisan avant sa première dictée (IA).
// Chacun ne lit, ne donne et ne retire que SON accord ; un visiteur rien ; la date de l'accord et celle du retrait sont
// celles du serveur ; un accord retiré ne revient pas ; rien ne s'efface, sauf avec le compte.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/109_accord_ia.sql');
const VERSION = '2026-11-03';

export async function verifier({ db, q, en, commeAnonyme, compte, verifier }) {
  let rejeu = true;
  try { await db.exec(fs.readFileSync(MIGRATION, 'utf8')); } catch { rejeu = false; }
  verifier(rejeu, '109 : migration rejouée sans erreur');

  const erreurDe = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
  const accords = (uid) => compte('SELECT count(*) AS n FROM accords_ia WHERE user_id = $1', [uid]);
  const enCours = (uid) => compte('SELECT count(*) AS n FROM accords_ia WHERE user_id = $1 AND revoque_le IS NULL', [uid]);

  // ── Donner son accord : la version seule vient du navigateur ──
  const donne = await en(SOLO, () => q(`INSERT INTO accords_ia (version) VALUES ($1) RETURNING user_id, fonction, version, accepte_le, revoque_le`, [VERSION]));
  const a = donne.rows[0];
  verifier(a.user_id === SOLO && a.fonction === 'dictee' && a.version === VERSION && a.accepte_le && a.revoque_le === null,
    `109 : un artisan donne son accord : compte, fonction, version et date du serveur (${JSON.stringify(a)})`);

  verifier(!!(await erreurDe(() => en(SOLO, () => q(`INSERT INTO accords_ia (version) VALUES ($1)`, [VERSION])))) && (await enCours(SOLO)) === 1,
    '109 : un seul accord en cours par compte (le second est refusé)');
  verifier(!!(await erreurDe(() => en(SOLO, () => q(`INSERT INTO accords_ia (user_id, version) VALUES ($1, $2)`, [PATRON, VERSION]))))
    && (await accords(PATRON)) === 0,
  '109 : on ne donne pas l\'accord d\'un autre compte');
  verifier(!!(await erreurDe(() => en(PATRON, () => q(`INSERT INTO accords_ia (version, accepte_le) VALUES ($1, now() - interval '1 year')`, [VERSION]))))
    && (await accords(PATRON)) === 0,
  '109 : on ne choisit pas la date de son accord');
  verifier(!!(await erreurDe(() => en(PATRON, () => q(`INSERT INTO accords_ia (version, revoque_le) VALUES ($1, now())`, [VERSION])))),
    '109 : on ne choisit pas la date du retrait à la création');
  verifier(!!(await erreurDe(() => en(PATRON, () => q(`INSERT INTO accords_ia (version) VALUES ('pas une version')`)))),
    '109 : une version illisible est refusée');

  // ── Lire : seulement le sien ──
  await en(PATRON, () => q(`INSERT INTO accords_ia (version) VALUES ($1)`, [VERSION]));
  const luParSolo = await en(SOLO, () => q('SELECT user_id FROM accords_ia'));
  verifier(luParSolo.rows.length === 1 && luParSolo.rows[0].user_id === SOLO, `109 : un artisan ne lit que son accord (${luParSolo.rows.length} ligne)`);
  const luParVisiteur = await commeAnonyme(() => q('SELECT count(*) AS n FROM accords_ia')).catch(() => ({ rows: [{ n: 0 }] }));
  verifier(Number(luParVisiteur.rows[0].n) === 0, '109 : un visiteur ne lit rien');
  verifier(!!(await erreurDe(() => commeAnonyme(() => q(`INSERT INTO accords_ia (user_id, version) VALUES ($1, $2)`, [SOLO, VERSION])))),
    '109 : un visiteur ne peut pas donner d\'accord');

  // ── Modifier : seulement la date du retrait, la sienne, posée par le serveur ──
  await en(SOLO, () => q(`UPDATE accords_ia SET version = '2099-01-01'`)).catch(() => null);
  await en(SOLO, () => q(`UPDATE accords_ia SET accepte_le = now() - interval '1 year'`)).catch(() => null);
  const intact = (await q('SELECT version, accepte_le FROM accords_ia WHERE user_id = $1', [SOLO])).rows[0];
  verifier(intact.version === VERSION && String(intact.accepte_le) === String(a.accepte_le), '109 : on ne modifie ni la version ni la date de son accord');
  await en(SOLO, () => q(`UPDATE accords_ia SET revoque_le = now() WHERE user_id = $1`, [PATRON])).catch(() => null);
  verifier((await enCours(PATRON)) === 1, '109 : on ne retire pas l\'accord d\'un autre');
  await commeAnonyme(() => q(`UPDATE accords_ia SET revoque_le = now()`)).catch(() => null);
  verifier((await enCours(PATRON)) === 1 && (await enCours(SOLO)) === 1, '109 : un visiteur ne retire rien');

  // ── Retirer son accord : date du serveur, quoi que dise le navigateur ──
  await en(SOLO, () => q(`UPDATE accords_ia SET revoque_le = '2000-01-01' WHERE revoque_le IS NULL`));
  const retire = (await q('SELECT revoque_le FROM accords_ia WHERE user_id = $1', [SOLO])).rows[0];
  verifier(retire.revoque_le && new Date(retire.revoque_le).getFullYear() >= 2026 && (await enCours(SOLO)) === 0,
    `109 : retirer son accord pose la date du serveur (${retire.revoque_le})`);
  verifier(!!(await erreurDe(() => en(SOLO, () => q(`UPDATE accords_ia SET revoque_le = NULL`)))) && (await enCours(SOLO)) === 0,
    '109 : un accord retiré ne revient pas');
  verifier(!!(await erreurDe(() => commeServeurUpdate(db, q))) , '109 : même le serveur ne réécrit pas un accord retiré');

  // Après un retrait, on peut en donner un nouveau ; l'ancien reste (preuve)
  await en(SOLO, () => q(`INSERT INTO accords_ia (version) VALUES ($1)`, [VERSION]));
  verifier((await accords(SOLO)) === 2 && (await enCours(SOLO)) === 1, '109 : après un retrait, un nouvel accord ; l\'ancien est gardé');

  // ── Effacer : personne, sauf avec le compte ──
  await en(SOLO, () => q('DELETE FROM accords_ia')).catch(() => null);
  verifier((await accords(SOLO)) === 2, '109 : un artisan n\'efface pas ses accords (preuve)');

  // ── Le serveur (fonction Edge) lit les accords ──
  await db.exec('BEGIN; SET LOCAL ROLE service_role;');
  const serveur = await q('SELECT count(*) AS n FROM accords_ia WHERE user_id = $1 AND revoque_le IS NULL AND version = $2', [SOLO, VERSION]);
  await db.exec('COMMIT');
  verifier(Number(serveur.rows[0].n) === 1, '109 : le serveur lit l\'accord en cours');

  // ── Droits explicites ──
  const droits = (await q(`SELECT has_table_privilege('anon', 'public.accords_ia', 'SELECT,INSERT,UPDATE,DELETE') AS visiteur,
      has_table_privilege('authenticated', 'public.accords_ia', 'DELETE') AS efface,
      has_column_privilege('authenticated', 'public.accords_ia', 'accepte_le', 'INSERT') AS date_choisie,
      has_column_privilege('authenticated', 'public.accords_ia', 'user_id', 'UPDATE') AS change_compte,
      has_column_privilege('authenticated', 'public.accords_ia', 'version', 'INSERT') AS version`)).rows[0];
  verifier(!droits.visiteur && !droits.efface && !droits.date_choisie && !droits.change_compte && droits.version,
    `109 : droits par colonne (${JSON.stringify(droits)})`);

  // ── Le serveur ne fait que lire (droits par défaut de Supabase retirés) ──
  const serveurEcrit = (await q(`SELECT has_table_privilege('service_role', 'public.accords_ia', 'INSERT') OR has_table_privilege('service_role', 'public.accords_ia', 'UPDATE')
      OR has_table_privilege('service_role', 'public.accords_ia', 'DELETE') AS ecrit`)).rows[0].ecrit;
  verifier(serveurEcrit === false, '109 : le serveur (service_role) lit les accords mais ne peut ni en créer, ni en modifier, ni en effacer');

  // ── Au plus 10 accords par compte et par jour : pas de remplissage en boucle (gardien, M1) ──
  const BOUCLE = '10900000-0000-4000-8000-000000000002';
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'boucle@109.fr')`, [BOUCLE]);
  let boucles = 0;
  for (let i = 0; i < 10; i++) {
    await en(BOUCLE, () => q(`INSERT INTO accords_ia (version) VALUES ($1)`, [VERSION]));
    await en(BOUCLE, () => q(`UPDATE accords_ia SET revoque_le = now() WHERE revoque_le IS NULL`));
    boucles++;
  }
  const onzieme = await erreurDe(() => en(BOUCLE, () => q(`INSERT INTO accords_ia (version) VALUES ($1)`, [VERSION])));
  verifier(boucles === 10 && /trop d'accords/.test(onzieme || '') && (await accords(BOUCLE)) === 10,
    `109 : le 11e accord du jour d'un même compte est refusé (${onzieme})`);
  // Vieillir les accords (le déclencheur de retrait l'interdit : coupé le temps de la mise en scène, en superutilisateur)
  await q('ALTER TABLE accords_ia DISABLE TRIGGER accords_ia_retrait');
  await q(`UPDATE accords_ia SET accepte_le = now() - interval '2 days' WHERE user_id = $1`, [BOUCLE]);
  await q('ALTER TABLE accords_ia ENABLE TRIGGER accords_ia_retrait');
  verifier(!(await erreurDe(() => en(BOUCLE, () => q(`INSERT INTO accords_ia (version) VALUES ($1)`, [VERSION])))),
    '109 : le lendemain, le compte peut de nouveau donner son accord');

  // ── Suppression du compte : ses accords partent avec lui ──
  const PARTI = '10900000-0000-4000-8000-000000000001';
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'parti@109.fr')`, [PARTI]);
  await en(PARTI, () => q(`INSERT INTO accords_ia (version) VALUES ($1)`, [VERSION]));
  await q('DELETE FROM auth.users WHERE id = $1', [PARTI]);
  verifier((await accords(PARTI)) === 0, '109 : à la suppression du compte, ses accords sont effacés');
}

async function commeServeurUpdate(db, q) {
  await db.exec('BEGIN; SET LOCAL ROLE postgres;');
  try {
    await q(`UPDATE accords_ia SET revoque_le = NULL WHERE user_id = $1 AND revoque_le IS NOT NULL`, [SOLO]);
    await db.exec('COMMIT');
  } catch (e) { await db.exec('ROLLBACK'); throw e; }
}
