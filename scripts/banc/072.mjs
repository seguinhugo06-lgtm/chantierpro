// Vérifications de la migration 072 : suppression de compte (en dernier : elle efface des données)
import { PATRON, SALARIE, SOLO, PAYEUR, ORG_PATRON, ORG_SOLO } from './socle.mjs';

export const ordre = 999;
// eslint-disable-next-line no-unused-vars
export async function verifier({ db, q, en, commeAnonyme, compte, ok, ko, verifier }) {
  // Autonome : le client du patron peut ne pas exister si la vérification de 075 n'a pas tourné.
  await q(`INSERT INTO clients (id, user_id, nom) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', $1, 'Client du patron') ON CONFLICT (id) DO NOTHING`, [PATRON]);
  await db.exec(`
    INSERT INTO clients (id, user_id, organization_id, nom) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '${SOLO}', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Client du solo');
    INSERT INTO chantiers (id, user_id, organization_id, client_id, nom) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '${SOLO}', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Chantier');
    INSERT INTO devis (user_id, organization_id, client_id, chantier_id, numero) VALUES ('${SOLO}', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'DEV-1');
    INSERT INTO entreprise (user_id, nom) VALUES ('${SOLO}', 'Élec Solo');
    INSERT INTO devis (user_id, organization_id, client_id, numero) VALUES ('${SALARIE}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'DEV-SALARIE');
    -- Le salarié a enregistré SA clé Stripe (ligne rattachée à l'organisation du patron)
    INSERT INTO vault.decrypted_secrets (id, decrypted_secret) VALUES ('72aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sk_test_SALARIE');
    INSERT INTO stripe_config (user_id, organization_id, stripe_enabled, secret_key_vault_id) VALUES ('${SALARIE}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true, '72aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  `);
  const cleDuPatron = async () => (await q('SELECT get_stripe_config_for_user($1) AS c', [PATRON])).rows[0].c?.secret_key ?? null;

  // Simulation : bilan sans rien supprimer
  try {
    const r = await en(SOLO, () => q(`SELECT supprimer_mon_compte(true) AS b`));
    const b = r.rows[0].b;
    verifier(b.simulation === true && b.lignes_supprimees >= 5, `072 : simulation → bilan (${b.lignes_supprimees} lignes, tables ${Object.keys(b.tables).join(', ')})`);
    verifier(await compte(`SELECT count(*) n FROM auth.users WHERE id = $1`, [SOLO]) === 1 && await compte(`SELECT count(*) n FROM devis WHERE user_id = $1`, [SOLO]) === 1,
      '072 : la simulation n\'a rien supprimé');
  } catch (e) { ko('072 : simulation', e); }

  // Refus : abonnement payant actif, équipe active
  try { await en(PAYEUR, () => q(`SELECT supprimer_mon_compte()`)); ko('072 : payeur supprimé malgré son abonnement'); }
  catch (e) { verifier(e.message.includes('ABONNEMENT_ACTIF'), '072 : refus si abonnement payant actif'); }
  await q(`UPDATE subscriptions SET stripe_subscription_id = NULL, plan = 'gratuit' WHERE user_id = $1`, [PATRON]);
  try { await en(PATRON, () => q(`SELECT supprimer_mon_compte()`)); ko('072 : patron supprimé malgré son équipe'); }
  catch (e) { verifier(e.message.includes('EQUIPE_ACTIVE'), '072 : refus si l\'organisation a d\'autres membres'); }

  // Salarié qui part : ses devis restent à l'entreprise, ses références sont neutralisées
  try {
    const r = await en(SALARIE, () => q(`SELECT supprimer_mon_compte() AS b`));
    const b = r.rows[0].b;
    verifier(await compte(`SELECT count(*) n FROM auth.users WHERE id = $1`, [SALARIE]) === 0, '072 : compte du salarié supprimé');
    const devisSalarie = await q(`SELECT user_id FROM devis WHERE numero = 'DEV-SALARIE'`);
    verifier(devisSalarie.rows.length === 1 && devisSalarie.rows[0].user_id === PATRON, '072 : le devis créé par le salarié reste à l\'entreprise (réattribué au patron)');
    verifier(await compte(`SELECT count(*) n FROM activity_log WHERE action = 'devis créé'`) === 1, '072 : le journal d\'activité de l\'entreprise est conservé (auteur neutralisé)');
    verifier(await compte(`SELECT count(*) n FROM invitations`) === 0, '072 : l\'invitation envoyée par le salarié (invited_by obligatoire) est supprimée');
    verifier(await compte(`SELECT count(*) n FROM organization_members WHERE user_id = $1`, [SALARIE]) === 0, '072 : son appartenance à l\'organisation est retirée');
    verifier(!b.reattribuees?.stripe_config && await cleDuPatron() === 'sk_live_secret_du_patron' && await compte(`SELECT count(*) n FROM stripe_config WHERE user_id = $1`, [SALARIE]) === 0,
      '072 : sa clé Stripe part avec lui ; le patron garde la sienne (posée par les vérifications de 076)');
    console.log('     bilan salarié :', JSON.stringify(b));
  } catch (e) { ko('072 : suppression du salarié', e); }

  // Inconnu (revue de sécurité du 8 oct.) : n'importe quel compte peut écrire l'organization_id d'une autre
  // entreprise sur ses propres lignes (policies 002/012/038). En supprimant son compte, il ne doit
  // rien offrir au patron de cette entreprise — surtout pas sa clé Stripe.
  try {
    const INCONNU = '72000000-0000-4000-8000-000000000001';
    await db.exec(`
      DELETE FROM stripe_config WHERE user_id = '${PATRON}';  -- cas exploitable : un patron sans paiement en ligne configuré
      INSERT INTO auth.users (id, email) VALUES ('${INCONNU}', 'inconnu@072.fr');
      INSERT INTO vault.decrypted_secrets (id, decrypted_secret) VALUES ('72bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'sk_test_INCONNU');
      INSERT INTO stripe_config (user_id, organization_id, stripe_enabled, secret_key_vault_id) VALUES ('${INCONNU}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true, '72bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
      INSERT INTO clients (user_id, organization_id, nom) VALUES ('${INCONNU}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Client glissé');
    `);
    const b = (await en(INCONNU, () => q(`SELECT supprimer_mon_compte() AS b`))).rows[0].b;
    verifier(Object.keys(b.reattribuees || {}).length === 0, `072 : rien n'est réattribué au patron d'une organisation dont il n'est pas membre (${JSON.stringify(b.reattribuees)})`);
    verifier(await cleDuPatron() === null && await compte(`SELECT count(*) n FROM stripe_config WHERE user_id = $1`, [PATRON]) === 0,
      '072 : la clé Stripe de l\'inconnu ne devient pas celle du patron');
    verifier(await compte(`SELECT count(*) n FROM clients WHERE nom = 'Client glissé'`) === 0 && await compte(`SELECT count(*) n FROM stripe_config WHERE user_id = $1`, [INCONNU]) === 0,
      '072 : ses lignes glissées dans l\'organisation du patron sont supprimées avec son compte');
  } catch (e) { ko('072 : suppression d\'un inconnu qui a visé une autre organisation', e); }

  // Solo : tout part, y compris l'organisation et le compte
  try {
    await en(SOLO, () => q(`SELECT supprimer_mon_compte(false, '["chantier-photos/x.jpg"]'::jsonb) AS b`));
    verifier(await compte(`SELECT count(*) n FROM auth.users WHERE id = $1`, [SOLO]) === 0, '072 : compte solo supprimé (identités en cascade : '
      + (await compte(`SELECT count(*) n FROM auth.identities WHERE user_id = $1`, [SOLO])) + ' restante)');
    for (const t of ['clients', 'chantiers', 'devis', 'entreprise', 'subscriptions', 'retours']) {
      verifier(await compte(`SELECT count(*) n FROM ${t} WHERE user_id = $1`, [SOLO]) === 0, `072 : ${t} du solo vidé`);
    }
    verifier(await compte(`SELECT count(*) n FROM organizations WHERE owner_id = $1`, [SOLO]) === 0, '072 : organisation du solo supprimée');
    const j = await q(`SELECT lignes_supprimees, fichiers_restants FROM comptes_supprimes WHERE user_id = $1`, [SOLO]);
    verifier(j.rows.length === 1 && j.rows[0].fichiers_restants.length === 1, `072 : suppression journalisée (${j.rows[0]?.lignes_supprimees} lignes, 1 fichier à purger)`);
    verifier(await compte(`SELECT count(*) n FROM clients WHERE user_id = $1`, [PATRON]) === 1, '072 : les données des autres comptes sont intactes');
  } catch (e) { ko('072 : suppression du solo', e); }

  // Anonyme : refus
  try { await db.exec('BEGIN; SET LOCAL ROLE anon;'); await q(`SELECT supprimer_mon_compte()`); await db.exec('ROLLBACK'); ko('072 : appel anonyme accepté'); }
  catch { await db.exec('ROLLBACK').catch(() => {}); ok('072 : appel anonyme refusé'); }

}
