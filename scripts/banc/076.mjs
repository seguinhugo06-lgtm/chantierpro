// Vérifications de la migration 076 : les clés Stripe des artisans ne sont lisibles que par le serveur.
// Le socle reproduit les droits d'avant (012, 029 + droits par défaut de Supabase) : sans 076, un visiteur lit la clé.
import { PATRON, SOLO } from './socle.mjs';

const VAULT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// eslint-disable-next-line no-unused-vars
export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  await q(`INSERT INTO vault.decrypted_secrets (id, decrypted_secret) VALUES ($1, 'sk_live_secret_du_patron')`, [VAULT]);
  await q(`INSERT INTO stripe_config (user_id, stripe_enabled, secret_key_vault_id) VALUES ($1, true, $2)`, [PATRON, VAULT]);

  const essai = async (fn) => { try { const r = await fn(); return JSON.stringify(r.rows); } catch (e) { return 'refusé : ' + e.message; } };
  for (const nom of ['get_stripe_secret_for_user', 'get_stripe_config_for_user']) {
    const visiteur = await essai(() => commeAnonyme(() => q(`SELECT ${nom}($1) AS r`, [PATRON])));
    verifier(visiteur.startsWith('refusé') && !visiteur.includes('sk_live'), `076 : un visiteur (clé publique) ne peut plus appeler ${nom}`);
    const autre = await essai(() => en(SOLO, () => q(`SELECT ${nom}($1) AS r`, [PATRON])));
    verifier(autre.startsWith('refusé') && !autre.includes('sk_live'), `076 : un autre artisan connecté ne peut plus lire la clé du patron par ${nom}`);
  }
  await db.exec('BEGIN; SET LOCAL ROLE service_role;');
  let serveur = '';
  try { serveur = (await q('SELECT get_stripe_secret_for_user($1) AS r', [PATRON])).rows[0]?.r || ''; } finally { await db.exec('ROLLBACK'); }
  verifier(serveur === 'sk_live_secret_du_patron', '076 : la fonction de paiement (service_role) lit toujours la clé de l\'artisan');
}
