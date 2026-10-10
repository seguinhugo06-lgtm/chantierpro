// Vérifications de la migration 082 : les fonctions du portail client (007) ne sont plus appelables par un
// visiteur ni par un compte connecté. Avant : avec un jeton de portail et la clé publique, un devis « envoyé »
// passait « accepté » sans signature.
import { SOLO } from './socle.mjs';

export async function verifier({ q, en, commeAnonyme, verifier }) {
  const jeton = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const client = (await q(`INSERT INTO clients (user_id, nom, portal_access_token) VALUES ($1, 'Client 082', $2) RETURNING id`, [SOLO, jeton])).rows[0].id;
  const devis = (await q(`INSERT INTO devis (user_id, client_id, numero, type, statut, total_ttc) VALUES ($1, $2, 'DEV-082', 'devis', 'envoye', 1000) RETURNING id`, [SOLO, client])).rows[0].id;

  const essayer = async (role, fn) => {
    try { await fn(); return 'autorisé'; } catch (e) { return /permission denied/i.test(e.message) ? 'refusé' : `erreur : ${e.message}`; }
  };
  for (const [nom, appel] of [
    ['portal_accept_devis', () => q('SELECT portal_accept_devis($1, $2)', [jeton, devis])],
    ['portal_refuse_devis', () => q('SELECT portal_refuse_devis($1, $2)', [jeton, devis])],
    ['get_client_by_portal_token', () => q('SELECT get_client_by_portal_token($1)', [jeton])],
  ]) {
    verifier(await essayer('anon', () => commeAnonyme(appel)) === 'refusé', `082 : un visiteur ne peut plus appeler ${nom}`);
    verifier(await essayer('connecté', () => en(SOLO, appel)) === 'refusé', `082 : un compte connecté ne peut plus appeler ${nom}`);
  }
  const statut = (await q('SELECT statut FROM devis WHERE id = $1', [devis])).rows[0].statut;
  verifier(statut === 'envoye', `082 : le devis reste « envoyé » (${statut})`);
  const config = (await q(`SELECT proconfig::text AS c FROM pg_proc WHERE proname = 'portal_accept_devis'`)).rows[0].c || '';
  verifier(/search_path=public, ?pg_temp/.test(config), `082 : search_path fixé (${config})`);
  await q('DELETE FROM devis WHERE id = $1', [devis]);
  await q('DELETE FROM clients WHERE id = $1', [client]);
}
