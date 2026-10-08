// Vérifications de la migration 075 : tables publiques fermées
import { PATRON, SALARIE, SOLO, PAYEUR, ORG_PATRON, ORG_SOLO } from './socle.mjs';

// eslint-disable-next-line no-unused-vars
export async function verifier({ db, q, en, commeAnonyme, compte, ok, ko, verifier }) {
  await q(`INSERT INTO payment_links (user_id, token) VALUES ($1, 'secret')`, [PATRON]);
  await q(`INSERT INTO clients (id, user_id, nom) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', $1, 'Client du patron')`, [PATRON]);
  await q(`INSERT INTO portal_access_logs (client_id, ip_address) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '1.2.3.4')`);
  await db.exec('BEGIN; SET LOCAL ROLE anon;');
  const anonPL = await q('SELECT * FROM payment_links'); const anonLogs = await q('SELECT * FROM portal_access_logs');
  await db.exec('ROLLBACK');
  verifier(anonPL.rows.length === 0, '075 : payment_links n\'est plus lisible avec la clé publique');
  verifier(anonLogs.rows.length === 0, '075 : portal_access_logs n\'est plus lisible avec la clé publique');
  const logsPatron = await en(PATRON, () => q('SELECT * FROM portal_access_logs'));
  const logsAutre = await en(SOLO, () => q('SELECT * FROM portal_access_logs'));
  verifier(logsPatron.rows.length === 1 && logsAutre.rows.length === 0, '075 : l\'artisan lit les journaux de SES clients, pas ceux des autres');

}
