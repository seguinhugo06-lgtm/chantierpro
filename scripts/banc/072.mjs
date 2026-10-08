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
  `);

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
    console.log('     bilan salarié :', JSON.stringify(b));
  } catch (e) { ko('072 : suppression du salarié', e); }

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
