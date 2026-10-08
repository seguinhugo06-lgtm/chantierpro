// Vérifications de la migration 074 : codes testeurs et retours
import { PATRON, SALARIE, SOLO, PAYEUR, ORG_PATRON, ORG_SOLO } from './socle.mjs';

// eslint-disable-next-line no-unused-vars
export async function verifier({ db, q, en, commeAnonyme, compte, ok, ko, verifier }) {
  await q(`INSERT INTO codes_testeurs (code, plan, duree_mois, utilisations_max) VALUES ('AMIS-ARTISANS-TEST1', 'artisan', 12, 1)`);
  const nouveau = '55555555-5555-4555-8555-555555555555';
  await q(`INSERT INTO auth.users VALUES ($1, 'testeur@x.fr')`, [nouveau]);
  try {
    const r = await en(nouveau, () => q(`SELECT utiliser_code_testeur('amis-artisans-test1 ') AS r`));
    verifier(r.rows[0].r.plan === 'artisan', '074 : code testeur accepté (minuscules et espaces tolérés)');
    const sub = await q(`SELECT plan, status, cancel_at_period_end, current_period_end FROM subscriptions WHERE user_id = $1`, [nouveau]);
    verifier(sub.rows[0].plan === 'artisan' && sub.rows[0].cancel_at_period_end === true && new Date(sub.rows[0].current_period_end) > new Date(Date.now() + 360 * 86400000),
      '074 : plan Artisan offert ~12 mois, fin affichée');
  } catch (e) { ko('074 : utiliser_code_testeur', e); }
  for (const [uid, attendu, libelle] of [[nouveau, 'CODE_DEJA_UTILISE', 'même utilisateur deux fois'], [SOLO, 'CODE_EPUISE', 'code épuisé'], [PAYEUR, 'CODE_EPUISE', 'payeur (code épuisé d\'abord)']]) {
    try { await en(uid, () => q(`SELECT utiliser_code_testeur('AMIS-ARTISANS-TEST1')`)); ko(`074 : ${libelle} accepté à tort`); }
    catch (e) { verifier(e.message.includes(attendu), `074 : ${libelle} → ${attendu}`); }
  }
  await q(`INSERT INTO codes_testeurs (code, plan, duree_mois, utilisations_max) VALUES ('AMIS-ARTISANS-TEST2', 'equipe', 12, 10)`);
  try { await en(PAYEUR, () => q(`SELECT utiliser_code_testeur('AMIS-ARTISANS-TEST2')`)); ko('074 : un abonnement Stripe a été écrasé'); }
  catch (e) { verifier(e.message.includes('ABONNEMENT_PAYANT_ACTIF'), '074 : un abonnement Stripe actif n\'est jamais écrasé'); }
  try { await en(nouveau, () => q(`SELECT utiliser_code_testeur('INEXISTANT-123')`)); ko('074 : code inconnu accepté'); }
  catch (e) { verifier(e.message.includes('CODE_INCONNU'), '074 : code inconnu → CODE_INCONNU'); }
  try {
    await en(SOLO, () => q(`INSERT INTO retours (type, message, page) VALUES ('bug', 'Le bouton ne marche pas', 'devis')`));
    ok('074 : un utilisateur envoie un retour');
  } catch (e) { ko('074 : envoi de retour', e); }
  try { await en(SOLO, () => q(`INSERT INTO retours (type, message, statut) VALUES ('bug', 'je me réponds', 'fait')`)); ko('074 : statut forcé accepté'); }
  catch { ok('074 : impossible de créer un retour déjà « fait »'); }
  const retoursSolo = await en(SOLO, () => q('SELECT * FROM retours')); const retoursAutre = await en(PATRON, () => q('SELECT * FROM retours'));
  verifier(retoursSolo.rows.length === 1 && retoursAutre.rows.length === 0, '074 : chacun ne voit que ses retours');
  const maj = await en(SOLO, () => q(`UPDATE retours SET statut = 'fait' RETURNING id`));
  verifier(maj.rows.length === 0, '074 : l\'utilisateur ne peut pas modifier le statut');

}
