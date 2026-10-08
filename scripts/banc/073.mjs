// Vérifications de la migration 073 : faille d'auto-surclassement fermée, plan de l'organisation partagé
import { PATRON, SALARIE, SOLO, PAYEUR, ORG_PATRON, ORG_SOLO } from './socle.mjs';

// eslint-disable-next-line no-unused-vars
export async function verifier({ db, q, en, commeAnonyme, compte, ok, ko, verifier }) {
  const s = await q(`SELECT user_id, organization_id FROM subscriptions ORDER BY user_id`);
  verifier(s.rows.find((r) => r.user_id === SALARIE).organization_id === null, '073 : la ligne gratuite d\'un collaborateur n\'est pas rattachée à l\'organisation');
  verifier(s.rows.find((r) => r.user_id === PATRON).organization_id === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '073 : la ligne du patron est rattachée à son organisation (déclencheur)');

  try {
    const r = await en(SALARIE, () => q(`UPDATE subscriptions SET plan = 'equipe' WHERE user_id = $1 RETURNING id`, [SALARIE]));
    verifier(r.rows.length === 0, '073 : un utilisateur ne peut plus se passer lui-même en plan Équipe');
  } catch (e) { ok('073 : UPDATE refusé (' + e.message + ')'); }
  try {
    await en(SOLO, () => q(`INSERT INTO subscriptions (user_id, plan) VALUES ($1, 'equipe')`, [SOLO]));
    ko('073 : un utilisateur a pu s\'insérer un plan payant');
  } catch { ok('073 : insertion d\'un plan payant refusée'); }
  try {
    await en(SOLO, () => q(`INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, 'gratuit', 'active')`, [SOLO]));
    ok('073 : insertion de sa ligne gratuite acceptée');
  } catch (e) { ko('073 : insertion gratuite refusée', e); }
  const vueSalarie = await en(SALARIE, () => q(`SELECT user_id, plan FROM subscriptions ORDER BY plan`));
  verifier(vueSalarie.rows.some((r) => r.plan === 'equipe' && r.user_id === PATRON), '073 : le collaborateur voit l\'abonnement Équipe de son organisation');
  verifier(!vueSalarie.rows.some((r) => r.user_id === PAYEUR), '073 : … et pas celui des autres');

}
