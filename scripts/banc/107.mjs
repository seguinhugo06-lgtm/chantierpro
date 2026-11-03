// Vérifications de la migration 107 : quota mensuel de l'IA par organisation et par fonction, journal des jetons.
// Seul le serveur (la fonction Edge, après vérification du jeton) réserve et clôt ; un utilisateur ou un visiteur ne
// peut ni réserver, ni clore, ni lire, ni écrire, ni effacer pour remettre son compteur à zéro.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SALARIE, SOLO, PAYEUR, ORG_PATRON, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/107_quota_ia.sql');
const RESERVER = 'SELECT reserver_usage_ia($1, $2, $3, $4::jsonb) AS r';
const TERMINER = 'SELECT terminer_usage_ia($1, $2, $3, $4, $5, $6, $7) AS ok';
// La recopie de PLANS[plan].limits.dictees que passe la fonction Edge (supabase/functions/voice-intent/regles.ts)
const LIMITES = JSON.stringify({ gratuit: 10, artisan: -1, equipe: -1 });
const ORG_PAYEUR = '10700000-0000-4000-8000-0000000000a1';
const TESTEUR = '10700000-0000-4000-8000-000000000001';
const ORG_TESTEUR = '10700000-0000-4000-8000-0000000000a2';

export async function verifier({ db, q, en, commeAnonyme, compte, verifier }) {
  let rejeu = true;
  try { await db.exec(fs.readFileSync(MIGRATION, 'utf8')); } catch { rejeu = false; }
  verifier(rejeu, '107 : migration rejouée sans erreur');

  const commeServeur = async (fn) => {
    await db.exec('BEGIN; SET LOCAL ROLE service_role;');
    try { const r = await fn(); await db.exec('COMMIT'); return r; } catch (e) { await db.exec('ROLLBACK'); throw e; }
  };
  const reserverBrut = async (uid, org, fonction = 'dictee', limites = LIMITES) =>
    (await commeServeur(() => q(RESERVER, [uid, org, fonction, limites]))).rows[0].r;
  // Hors vérification du plafond anti-abus (5 par minute, 100 par jour) : la réservation est datée d'avant-hier, dans
  // le même mois de quota, pour que les vérifications du quota mensuel ne butent pas sur le plafond.
  const reserver = async (...args) => {
    const r = await reserverBrut(...args);
    await q(`UPDATE usage_ia_log SET created_at = now() - interval '2 days' WHERE created_at > now() - interval '1 day'`);
    return r;
  };
  const terminer = async (id, statut, motif = null) =>
    (await commeServeur(() => q(TERMINER, [id, statut, 'claude-haiku-5-5', 1200, 400, 1800, motif]))).rows[0].ok;
  const erreurDe = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
  const lignes = (org) => compte('SELECT count(*) AS n FROM usage_ia_log WHERE organization_id = $1', [org]);

  // Un abonné payant seul dans son organisation ; un testeur dont l'offre gratuite d'un an est échue.
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Payeur 107', 'payeur-107', $2)`, [ORG_PAYEUR, PAYEUR]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_PAYEUR, PAYEUR]);
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'testeur@107.fr')`, [TESTEUR]);
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Testeur 107', 'testeur-107', $2)`, [ORG_TESTEUR, TESTEUR]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_TESTEUR, TESTEUR]);
  await q(`INSERT INTO subscriptions (user_id, plan, status, current_period_end) VALUES ($1, 'artisan', 'active', now() - interval '1 day')`, [TESTEUR]);

  // ── Plan gratuit : 10 dictées par mois pour l'organisation ──
  const premieres = [];
  for (let i = 0; i < 10; i++) premieres.push(await reserver(SOLO, ORG_SOLO));
  verifier(premieres.every((r) => r.autorise === true && r.id != null && r.plan === 'gratuit' && r.limite === 10),
    `107 : dix dictées acceptées au plan gratuit (${premieres.map((r) => r.utilise).join(',')})`);
  const onzieme = await reserver(SOLO, ORG_SOLO);
  verifier(onzieme.autorise === false && onzieme.utilise === 10 && onzieme.limite === 10 && (await lignes(ORG_SOLO)) === 10,
    `107 : la 11e est refusée, rien n'est compté en plus (${JSON.stringify(onzieme)})`);

  // Un échec (API en panne) rend la dictée ; clore deux fois est sans effet ; un usage réussi reste compté
  verifier(await terminer(premieres[0].id, 'echec', 'credits') === true, '107 : le serveur clôt un usage en échec');
  verifier(await terminer(premieres[0].id, 'reussi') === false, '107 : un usage déjà clos ne se clôt pas deux fois');
  verifier(await terminer(premieres[1].id, 'reussi') === true, '107 : le serveur clôt un usage réussi');
  const ligne = (await q('SELECT statut, modele, jetons_entree, jetons_sortie, duree_ms, motif FROM usage_ia_log WHERE id = $1', [premieres[0].id])).rows[0];
  verifier(ligne.statut === 'echec' && ligne.modele === 'claude-haiku-5-5' && ligne.jetons_entree === 1200 && ligne.jetons_sortie === 400
    && ligne.duree_ms === 1800 && ligne.motif === 'credits', `107 : modèle, jetons, durée et motif journalisés (${JSON.stringify(ligne)})`);
  const apresEchec = await reserver(SOLO, ORG_SOLO);
  verifier(apresEchec.autorise === true && apresEchec.utilise === 10, '107 : une dictée en échec ne décompte pas : une place se libère');
  verifier((await reserver(SOLO, ORG_SOLO)).autorise === false, '107 : puis le quota est de nouveau atteint');

  // Les fonctions sont comptées à part ; une fonction sans quota décidé est refusée
  const assistant = await reserver(SOLO, ORG_SOLO, 'assistant', JSON.stringify({ gratuit: 3, artisan: -1, equipe: -1 }));
  verifier(assistant.autorise === true && assistant.utilise === 1, '107 : le quota de l\'assistant est indépendant de celui de la dictée');
  const sansQuota = await reserver(SOLO, ORG_SOLO, 'resume', JSON.stringify({ artisan: -1 }));
  verifier(sansQuota.autorise === false && sansQuota.limite === 0, '107 : un plan absent des limites ne permet rien (limite 0)');

  // Un refus du modèle ou une réponse illisible (provoqués par la dictée) décomptent ; une panne de notre côté, non
  await q(`UPDATE usage_ia_log SET mois = (date_trunc('month', now() AT TIME ZONE 'Europe/Paris') - interval '1 month')::date
    WHERE organization_id = $1 AND fonction = 'dictee'`, [ORG_SOLO]);
  const a = await reserver(SOLO, ORG_SOLO); const b = await reserver(SOLO, ORG_SOLO); const c = await reserver(SOLO, ORG_SOLO);
  await terminer(a.id, 'echec', 'refus'); await terminer(b.id, 'echec', 'illisible'); await terminer(c.id, 'echec', 'surcharge');
  const apresEchecs = await reserver(SOLO, ORG_SOLO);
  verifier(apresEchecs.utilise === 3, `107 : refus et réponse illisible décomptent, pas une surcharge de l'API (${apresEchecs.utilise} = 2 + celle-ci)`);

  // Le mois précédent ne compte pas (mois de Paris)
  await q(`UPDATE usage_ia_log SET mois = (date_trunc('month', now() AT TIME ZONE 'Europe/Paris') - interval '1 month')::date
    WHERE organization_id = $1 AND fonction = 'dictee'`, [ORG_SOLO]);
  const nouveauMois = await reserver(SOLO, ORG_SOLO);
  verifier(nouveauMois.autorise === true && nouveauMois.utilise === 1, '107 : au mois suivant, le compteur repart de zéro');

  // ── Le plan de l'organisation : le patron est en Équipe, son salarié dicte sans limite dans l'entreprise ──
  const salarie = await reserver(SALARIE, ORG_PATRON);
  verifier(salarie.autorise === true && salarie.plan === 'equipe' && salarie.limite === null,
    `107 : un salarié dicte au plan de l'entreprise (${salarie.plan}, limite ${salarie.limite})`);
  const payeur = await reserver(PAYEUR, null);
  verifier(payeur.autorise === true && payeur.plan === 'artisan' && payeur.limite === null
    && (await compte('SELECT count(*) AS n FROM usage_ia_log WHERE id = $1 AND organization_id = $2', [payeur.id, ORG_PAYEUR])) === 1,
  '107 : sans organisation demandée, la sienne ; plan Artisan illimité');
  const testeur = await reserver(TESTEUR, ORG_TESTEUR);
  verifier(testeur.plan === 'gratuit' && testeur.limite === 10, `107 : une offre testeur échue vaut le plan gratuit (${testeur.plan})`);

  // ── Plan gratuit : une nouvelle organisation ne rouvre pas le quota (relecture gardien-securite H1) ──
  const ORG_NEUVE = '10700000-0000-4000-8000-0000000000a3';
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Neuve 107', 'neuve-107', $2)`, [ORG_NEUVE, SOLO]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_NEUVE, SOLO]);
  await q(`UPDATE usage_ia_log SET mois = (date_trunc('month', now() AT TIME ZONE 'Europe/Paris'))::date WHERE organization_id = $1`, [ORG_SOLO]);
  const pleinSolo = await reserver(SOLO, ORG_SOLO);
  const neuve = await reserver(SOLO, ORG_NEUVE);
  verifier(pleinSolo.autorise === false && neuve.autorise === false && neuve.utilise >= 10,
    `107 : au plan gratuit, créer une autre organisation ne rouvre pas de dictées (${JSON.stringify(neuve)})`);

  // Ce qu'un salarié dicte dans l'entreprise payante de son patron n'entame pas son quota gratuit personnel
  const ORG_PERSO_SAL = '10700000-0000-4000-8000-0000000000a5';
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Perso salarié 107', 'perso-sal-107', $2)`, [ORG_PERSO_SAL, SALARIE]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_PERSO_SAL, SALARIE]);
  await q(`DELETE FROM subscriptions WHERE user_id = $1`, [SALARIE]);
  await reserver(SALARIE, ORG_PATRON);
  const perso = await reserver(SALARIE, ORG_PERSO_SAL);
  verifier(perso.plan === 'gratuit' && perso.utilise === 1,
    `107 : les dictées d'un salarié dans l'entreprise payante n'entament pas son quota gratuit personnel (${JSON.stringify(perso)})`);

  // ── Plafond anti-abus : 5 par minute et par compte, même au plan illimité ──
  const rafale = [];
  for (let i = 0; i < 6; i++) rafale.push(await reserverBrut(PAYEUR, ORG_PAYEUR));
  verifier(rafale.slice(0, 5).every((r) => r.autorise === true) && rafale[5].autorise === false && rafale[5].motif === 'plafond',
    `107 : la 6e analyse dans la minute est refusée (plafond), même au plan Artisan (${rafale.map((r) => r.autorise).join(',')})`);
  await q(`UPDATE usage_ia_log SET created_at = now() - interval '2 hours' WHERE user_id = $1`, [PAYEUR]);
  verifier((await reserverBrut(PAYEUR, ORG_PAYEUR)).autorise === true, '107 : une minute plus tard, le compte peut de nouveau dicter');
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut, created_at)
    SELECT $1, $2, 'dictee', (now() AT TIME ZONE 'Europe/Paris')::date, 'reussi', now() - interval '3 hours' FROM generate_series(1, 100)`, [ORG_PAYEUR, PAYEUR]);
  const jour = await reserverBrut(PAYEUR, ORG_PAYEUR);
  verifier(jour.autorise === false && jour.motif === 'plafond', '107 : au-delà de 100 analyses dans la journée, refus (plafond)');
  await q(`DELETE FROM usage_ia_log WHERE user_id = $1`, [PAYEUR]);

  // ── Abonnement inactif : il ne donne pas son plan (B3) ──
  const INACTIF = '10700000-0000-4000-8000-000000000002';
  const ORG_INACTIF = '10700000-0000-4000-8000-0000000000a4';
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'inactif@107.fr')`, [INACTIF]);
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Inactif 107', 'inactif-107', $2)`, [ORG_INACTIF, INACTIF]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_INACTIF, INACTIF]);
  await q(`INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id) VALUES ($1, 'equipe', 'canceled', 'sub_107')`, [INACTIF]);
  verifier((await reserver(INACTIF, ORG_INACTIF)).plan === 'gratuit', '107 : un abonnement Équipe résilié vaut le plan gratuit');

  // ── Conservation : 12 mois ──
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut) VALUES ($1, $2, 'dictee', (now() - interval '14 months')::date, 'reussi')`, [ORG_PATRON, PATRON]);
  await reserver(SOLO, ORG_SOLO);
  verifier(await compte(`SELECT count(*) AS n FROM usage_ia_log WHERE mois < (now() - interval '13 months')::date`) === 0,
    '107 : les lignes de plus de 12 mois sont supprimées');

  // ── Départ d'un membre (105) : son journal n'est pas réattribué au patron (B1) ──
  await q(`DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2`, [ORG_PATRON, SALARIE]);
  verifier(await compte('SELECT count(*) AS n FROM usage_ia_log WHERE id = $1 AND user_id = $2', [salarie.id, SALARIE]) === 1,
    '107 : au départ d\'un membre, ses lignes du journal restent à son nom');
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'ouvrier')`, [ORG_PATRON, SALARIE]);

  // ── Refus pour une autre organisation ──
  const chezPatron = await lignes(ORG_PATRON);
  const horsOrg = await erreurDe(() => reserver(SOLO, ORG_PATRON));
  verifier(/HORS_ORGANISATION/.test(horsOrg || ''), `107 : réserver sur l'organisation d'un autre est refusé (${horsOrg})`);
  verifier(await lignes(ORG_PATRON) === chezPatron, '107 : … et rien n\'est compté chez lui');
  const inconnu = await erreurDe(() => reserver('10700000-0000-4000-8000-0000000000ff', null));
  verifier(/HORS_ORGANISATION/.test(inconnu || ''), '107 : un compte sans organisation est refusé');
  verifier(!!(await erreurDe(() => reserver(null, ORG_SOLO))) && !!(await erreurDe(() => reserver(SOLO, ORG_SOLO, 'Pas Valide')))
    && !!(await erreurDe(() => reserver(SOLO, ORG_SOLO, 'dictee', 'null'))) && !!(await erreurDe(() => terminer(apresEchec.id, 'reserve'))),
  '107 : utilisateur absent, nom de fonction invalide, limites absentes ou statut final invalide → erreur');

  // ── Fermé aux utilisateurs et aux visiteurs ──
  const avant = await lignes(ORG_SOLO);
  const echecsAvant = await compte(`SELECT count(*) AS n FROM usage_ia_log WHERE organization_id = $1 AND statut = 'echec'`, [ORG_SOLO]);
  verifier(!!(await erreurDe(() => en(SOLO, () => q(RESERVER, [SOLO, ORG_SOLO, 'dictee', JSON.stringify({ gratuit: 1000 })])))),
    '107 : un utilisateur connecté ne peut pas réserver lui-même (il choisirait sa limite)');
  verifier(!!(await erreurDe(() => en(SOLO, () => q(RESERVER, [PATRON, ORG_PATRON, 'dictee', LIMITES])))),
    '107 : un utilisateur ne peut pas épuiser le quota d\'une autre entreprise');
  verifier(!!(await erreurDe(() => commeAnonyme(() => q(RESERVER, [SOLO, ORG_SOLO, 'dictee', LIMITES])))),
    '107 : un visiteur (clé publique) ne peut pas réserver');
  verifier(!!(await erreurDe(() => en(SOLO, () => q(TERMINER, [premieres[2].id, 'echec', null, 0, 0, 0, null])))),
    '107 : un utilisateur ne peut pas clore ses usages en échec pour se rendre des dictées');
  verifier(!!(await erreurDe(() => commeAnonyme(() => q(TERMINER, [premieres[2].id, 'echec', null, 0, 0, 0, null])))),
    '107 : un visiteur ne peut pas clore un usage');
  verifier(!!(await erreurDe(() => en(SOLO, () => q('SELECT plan_pour_usage_ia($1, $2) AS p', [PATRON, ORG_PATRON])))),
    '107 : un utilisateur ne peut pas lire le plan d\'un autre');

  const luParSolo = await en(SOLO, () => q('SELECT count(*) AS n FROM usage_ia_log')).catch(() => ({ rows: [{ n: 0 }] }));
  verifier(Number(luParSolo.rows[0].n) === 0, '107 : un utilisateur ne lit aucune ligne, même les siennes');
  const luParVisiteur = await commeAnonyme(() => q('SELECT count(*) AS n FROM usage_ia_log')).catch(() => ({ rows: [{ n: 0 }] }));
  verifier(Number(luParVisiteur.rows[0].n) === 0, '107 : un visiteur ne lit rien');
  verifier(!!(await erreurDe(() => en(SOLO, () => q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois) VALUES ($1, $2, 'dictee', now()::date)`, [ORG_SOLO, SOLO])))),
    '107 : un utilisateur ne peut pas écrire dans le journal');
  await en(SOLO, () => q('DELETE FROM usage_ia_log WHERE organization_id = $1', [ORG_SOLO])).catch(() => null);
  await en(SOLO, () => q(`UPDATE usage_ia_log SET statut = 'echec' WHERE organization_id = $1`, [ORG_SOLO])).catch(() => null);
  verifier((await lignes(ORG_SOLO)) === avant
    && (await compte(`SELECT count(*) AS n FROM usage_ia_log WHERE organization_id = $1 AND statut = 'echec'`, [ORG_SOLO])) === echecsAvant,
  '107 : un utilisateur ne peut ni effacer ni modifier ses usages pour remettre son compteur à zéro');
}
