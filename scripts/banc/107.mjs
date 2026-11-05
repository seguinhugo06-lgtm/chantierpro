// Vérifications de la migration 107 : quota mensuel de l'IA (par abonnement aux plans payants, par organisation et par compte
// au plan gratuit) et par fonction, journal des jetons, rôles autorisés, coupe-circuit global à deux compteurs.
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
const LIMITES = JSON.stringify({ gratuit: 5, artisan: 100, equipe: -1 });
// Aujourd'hui (jour de Paris, celui du plafond du jour), au moins une minute plus tôt : hors plafond par minute.
const AUJOURDHUI = `GREATEST(now() - interval '2 minutes', date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris')`;
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

  // Le salarié du socle est ouvrier : pour les vérifications du plan de l'entreprise, il passe administrateur (seuls le
  // propriétaire et l'administrateur dictent, décision d'Hugo du 5 nov. 2026, D-37). Le refus des autres rôles est
  // vérifié plus bas.
  await q(`UPDATE organization_members SET role = 'admin' WHERE organization_id = $1 AND user_id = $2`, [ORG_PATRON, SALARIE]);

  // ── Plan gratuit : 5 dictées par mois, partagées entre les utilisateurs de l'entreprise (décisions d'Hugo des 4 et 5 nov. 2026) ──
  const premieres = [];
  for (let i = 0; i < 5; i++) premieres.push(await reserver(SOLO, ORG_SOLO));
  verifier(premieres.every((r) => r.autorise === true && r.id != null && r.plan === 'gratuit' && r.limite === 5),
    `107 : cinq dictées acceptées au plan gratuit (${premieres.map((r) => r.utilise).join(',')})`);
  const sixieme = await reserver(SOLO, ORG_SOLO);
  verifier(sixieme.autorise === false && sixieme.motif === 'quota' && sixieme.utilise === 5 && sixieme.limite === 5 && (await lignes(ORG_SOLO)) === 5,
    `107 : la 6e est refusée (quota), rien n'est compté en plus (${JSON.stringify(sixieme)})`);

  // Un échec (API en panne) rend la dictée ; clore deux fois est sans effet ; un usage réussi reste compté
  verifier(await terminer(premieres[0].id, 'echec', 'credits') === true, '107 : le serveur clôt un usage en échec');
  verifier(await terminer(premieres[0].id, 'reussi') === false, '107 : un usage déjà clos ne se clôt pas deux fois');
  verifier(await terminer(premieres[1].id, 'reussi') === true, '107 : le serveur clôt un usage réussi');
  const ligne = (await q('SELECT statut, modele, jetons_entree, jetons_sortie, duree_ms, motif FROM usage_ia_log WHERE id = $1', [premieres[0].id])).rows[0];
  verifier(ligne.statut === 'echec' && ligne.modele === 'claude-haiku-5-5' && ligne.jetons_entree === 1200 && ligne.jetons_sortie === 400
    && ligne.duree_ms === 1800 && ligne.motif === 'credits', `107 : modèle, jetons, durée et motif journalisés (${JSON.stringify(ligne)})`);
  const apresEchec = await reserver(SOLO, ORG_SOLO);
  verifier(apresEchec.autorise === true && apresEchec.utilise === 5, '107 : une dictée en échec ne décompte pas : une place se libère');
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
  // Une réponse coupée (max_tokens, qu'une dictée très longue provoque) décompte ; un délai, non (gardien du 4 nov., 3)
  await terminer(apresEchecs.id, 'echec', 'coupee');
  const d = await reserver(SOLO, ORG_SOLO);
  await terminer(d.id, 'echec', 'delai');
  const apresCoupee = await reserver(SOLO, ORG_SOLO);
  verifier(apresCoupee.utilise === 4, `107 : une réponse coupée décompte, un délai non (${apresCoupee.utilise} = 3 + celle-ci)`);

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
  verifier(payeur.autorise === true && payeur.plan === 'artisan' && payeur.limite === 100
    && (await compte('SELECT count(*) AS n FROM usage_ia_log WHERE id = $1 AND organization_id = $2', [payeur.id, ORG_PAYEUR])) === 1,
  '107 : sans organisation demandée, la sienne ; plan Artisan : 100 par mois');
  const testeur = await reserver(TESTEUR, ORG_TESTEUR);
  verifier(testeur.plan === 'gratuit' && testeur.limite === 5, `107 : une offre testeur échue vaut le plan gratuit (${testeur.plan})`);

  // ── Tri du plan : une ligne gratuite au statut NULL ne masque pas l'abonnement Équipe du propriétaire ──
  await q(`DELETE FROM subscriptions WHERE user_id = $1`, [SALARIE]);
  await q(`INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, 'gratuit', NULL)`, [SALARIE]);
  const statutNul = await reserver(SALARIE, ORG_PATRON);
  verifier(statutNul.plan === 'equipe', `107 : une ligne gratuite au statut NULL ne masque pas le plan Équipe du patron (${statutNul.plan})`);
  await q(`DELETE FROM subscriptions WHERE user_id = $1 AND status IS NULL`, [SALARIE]);

  // ── Seuls le propriétaire et l'administrateur dictent (D-37) : tout autre rôle est refusé, rien n'est compté ──
  // Le comptable en faisait partie jusqu'au 5 nov. 2026 : il ne pouvait pas retirer son accord (Paramètres lui est fermé).
  const refus = {};
  for (const role of ['comptable', 'chef_chantier', 'ouvrier', 'readonly']) {
    await q(`UPDATE organization_members SET role = $3 WHERE organization_id = $1 AND user_id = $2`, [ORG_PATRON, SALARIE, role]);
    const avant = await lignes(ORG_PATRON);
    const erreur = await erreurDe(() => reserver(SALARIE, ORG_PATRON));
    refus[role] = /SANS_DROIT/.test(erreur || '') && (await lignes(ORG_PATRON)) === avant;
  }
  verifier(refus.comptable === true, '107 : un comptable ne peut pas dicter (SANS_DROIT), et rien n\'est compté');
  verifier(refus.chef_chantier === true && refus.ouvrier === true && refus.readonly === true,
    `107 : ni un chef de chantier, ni un ouvrier, ni la lecture seule ne peuvent dicter, et rien n'est compté (${JSON.stringify(refus)})`);
  // Le refus de rôle vient avant le calcul du quota : dans une entreprise gratuite dont le quota est épuisé, le comptable
  // reçoit SANS_DROIT (et non « quota atteint »), alors que son patron reçoit bien « quota atteint ».
  const ORG_ROLES = '10700000-0000-4000-8000-0000000000b1';
  const PATRON_ROLES = '10700000-0000-4000-8000-000000000011';
  const COMPTABLE_ROLES = '10700000-0000-4000-8000-000000000012';
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'patron-roles@107.fr'), ($2, 'comptable-roles@107.fr')`, [PATRON_ROLES, COMPTABLE_ROLES]);
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Rôles 107', 'roles-107', $2)`, [ORG_ROLES, PATRON_ROLES]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner'), ($1, $3, 'comptable')`, [ORG_ROLES, PATRON_ROLES, COMPTABLE_ROLES]);
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut, plan, created_at)
    SELECT $1, $2, 'dictee', date_trunc('month', now() AT TIME ZONE 'Europe/Paris')::date, 'reussi', 'gratuit', now() - interval '2 days'
      FROM generate_series(1, 5)`, [ORG_ROLES, PATRON_ROLES]);
  const avantComptable = await lignes(ORG_ROLES);
  const comptableQuotaEpuise = await erreurDe(() => reserver(COMPTABLE_ROLES, ORG_ROLES));
  const patronQuotaEpuise = await reserver(PATRON_ROLES, ORG_ROLES);
  verifier(/SANS_DROIT/.test(comptableQuotaEpuise || '') && (await lignes(ORG_ROLES)) === avantComptable
    && patronQuotaEpuise.autorise === false && patronQuotaEpuise.motif === 'quota',
  `107 : le refus de rôle précède le calcul du quota (comptable : ${comptableQuotaEpuise} ; patron : ${patronQuotaEpuise.motif})`);
  // Contre-épreuve : l'administrateur et le propriétaire de l'entreprise du patron dictent (le comptable seul est exclu)
  await q(`UPDATE organization_members SET role = 'admin' WHERE organization_id = $1 AND user_id = $2`, [ORG_PATRON, SALARIE]);
  const adminDicte = await reserver(SALARIE, ORG_PATRON);
  const proprietaireDicte = await reserver(PATRON, ORG_PATRON);
  verifier(adminDicte.autorise === true && proprietaireDicte.autorise === true,
    `107 : un administrateur et le propriétaire dictent (${adminDicte.autorise}, ${proprietaireDicte.autorise})`);
  await q(`DELETE FROM usage_ia_log WHERE id IN ($1, $2)`, [adminDicte.id, proprietaireDicte.id]);

  // ── Plan gratuit : une nouvelle organisation ne rouvre pas le quota (relecture gardien-securite H1) ──
  const ORG_NEUVE = '10700000-0000-4000-8000-0000000000a3';
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Neuve 107', 'neuve-107', $2)`, [ORG_NEUVE, SOLO]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_NEUVE, SOLO]);
  await q(`UPDATE usage_ia_log SET mois = (date_trunc('month', now() AT TIME ZONE 'Europe/Paris'))::date WHERE organization_id = $1`, [ORG_SOLO]);
  const pleinSolo = await reserver(SOLO, ORG_SOLO);
  const neuve = await reserver(SOLO, ORG_NEUVE);
  verifier(pleinSolo.autorise === false && neuve.autorise === false && neuve.utilise >= 5,
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
    SELECT $1, $2, 'dictee', (now() AT TIME ZONE 'Europe/Paris')::date, 'reussi', ${AUJOURDHUI} FROM generate_series(1, 100)`, [ORG_PAYEUR, PAYEUR]);
  const jour = await reserverBrut(PAYEUR, ORG_PAYEUR);
  verifier(jour.autorise === false && jour.motif === 'plafond_jour' && jour.par_jour === 100,
    `107 : au-delà de 100 analyses dans la journée, refus (plafond_jour) (${JSON.stringify(jour)})`);
  await q(`DELETE FROM usage_ia_log WHERE user_id = $1`, [PAYEUR]);

  // ── Le plafond du jour suit le jour de Paris : la veille à 23 h 59 ne compte pas, minuit passé compte (gardien, B2) ──
  const MINUIT = `(date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris')`;
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut, created_at)
    SELECT $1, $2, 'dictee', (now() AT TIME ZONE 'Europe/Paris')::date, 'reussi', ${MINUIT} - interval '1 second' FROM generate_series(1, 100)`, [ORG_PAYEUR, PAYEUR]);
  const veille = await reserverBrut(PAYEUR, ORG_PAYEUR);
  await q(`DELETE FROM usage_ia_log WHERE user_id = $1`, [PAYEUR]);
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut, created_at)
    SELECT $1, $2, 'dictee', (now() AT TIME ZONE 'Europe/Paris')::date, 'reussi', LEAST(${MINUIT} + interval '1 second', now() - interval '2 minutes') FROM generate_series(1, 100)`, [ORG_PAYEUR, PAYEUR]);
  const lendemain = await reserverBrut(PAYEUR, ORG_PAYEUR);
  verifier(veille.autorise === true && lendemain.autorise === false && lendemain.motif === 'plafond_jour',
    `107 : 100 analyses la veille à 23 h 59 (Paris) ne comptent pas ; 100 depuis minuit, si (${veille.autorise}, ${lendemain.motif})`);
  await q(`DELETE FROM usage_ia_log WHERE user_id = $1`, [PAYEUR]);

  // ── Le serveur (service_role) ne fait que lire le journal : seules les fonctions écrivent (gardien, B1) ──
  const journalEcrit = (await q(`SELECT has_table_privilege('service_role', 'public.usage_ia_log', 'INSERT') OR has_table_privilege('service_role', 'public.usage_ia_log', 'UPDATE')
      OR has_table_privilege('service_role', 'public.usage_ia_log', 'DELETE') AS ecrit`)).rows[0].ecrit;
  verifier(journalEcrit === false, '107 : service_role ne peut ni écrire ni effacer le journal directement');

  // ── Plan Artisan : 100 dictées par mois par abonnement (décisions d'Hugo des 4 et 5 nov. 2026) ──
  // 99 dictées déjà faites ce mois-ci, datées d'avant-hier (hors plafond du jour) : la 100e passe, la 101e est refusée.
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut, created_at)
    SELECT $1, $2, 'dictee', date_trunc('month', now() AT TIME ZONE 'Europe/Paris')::date, 'reussi', now() - interval '2 days'
      FROM generate_series(1, 99)`, [ORG_PAYEUR, PAYEUR]);
  await q(`UPDATE usage_ia_log SET payeur = $1 WHERE organization_id = $2`, [PAYEUR, ORG_PAYEUR]);
  const centieme = await reserver(PAYEUR, ORG_PAYEUR);
  const centUnieme = await reserver(PAYEUR, ORG_PAYEUR);
  verifier(centieme.autorise === true && centieme.utilise === 100 && centieme.limite === 100
    && centUnieme.autorise === false && centUnieme.motif === 'quota' && centUnieme.limite === 100 && centUnieme.utilise === 100,
  `107 : au plan Artisan, la 100e dictée du mois passe et la 101e est refusée (${JSON.stringify(centUnieme)})`);
  // Une organisation neuve du même abonné ne rouvre pas 100 dictées (quota par abonnement, gardien du 4 nov., 2) ;
  // contre-essai : sans la colonne payeur, la neuve repartait de 1.
  const ORG_PAYEUR_BIS = '10700000-0000-4000-8000-0000000000a7';
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Payeur bis 107', 'payeur-bis-107', $2)`, [ORG_PAYEUR_BIS, PAYEUR]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_PAYEUR_BIS, PAYEUR]);
  const orgBis = await reserver(PAYEUR, ORG_PAYEUR_BIS);
  verifier(orgBis.autorise === false && orgBis.motif === 'quota' && orgBis.utilise === 100,
    `107 : au plan Artisan, une organisation neuve du même abonné ne rouvre pas 100 dictées (${JSON.stringify(orgBis)})`);
  verifier(await compte('SELECT count(*) AS n FROM usage_ia_log WHERE id = $1 AND payeur = $2', [centieme.id, PAYEUR]) === 1,
    '107 : la réservation d\'un plan payant porte le titulaire de l\'abonnement (payeur)');
  verifier(await compte('SELECT count(*) AS n FROM usage_ia_log WHERE id = $1 AND payeur IS NULL', [premieres[1].id]) === 1,
    '107 : au plan gratuit, pas de payeur');
  // Passé d'Artisan au gratuit en cours de mois : une organisation neuve ne rend pas 5 dictées (gardien du 4 nov., F2)
  const ORG_PAYEUR_TER = '10700000-0000-4000-8000-0000000000a8';
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Payeur ter 107', 'payeur-ter-107', $2)`, [ORG_PAYEUR_TER, PAYEUR]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_PAYEUR_TER, PAYEUR]);
  await q(`UPDATE subscriptions SET status = 'canceled' WHERE user_id = $1`, [PAYEUR]);
  const resilie = await reserver(PAYEUR, ORG_PAYEUR_TER);
  await q(`UPDATE subscriptions SET status = 'active' WHERE user_id = $1`, [PAYEUR]);
  verifier(resilie.plan === 'gratuit' && resilie.autorise === false && resilie.motif === 'quota',
    `107 : passé d'Artisan au gratuit en cours de mois, une organisation neuve ne rouvre pas 5 dictées (${JSON.stringify(resilie)})`);
  await q(`DELETE FROM usage_ia_log WHERE user_id = $1`, [PAYEUR]);

  // ── Plan Équipe : sans limite mensuelle, 100 par jour ET PAR PERSONNE (décision d'Hugo du 4 nov. 2026) ──
  // 500 dictées de l'entreprise ce mois-ci (avant-hier) ne bloquent rien ; un salarié à 99 aujourd'hui fait sa 100e,
  // pas sa 101e ; le patron, dans la même entreprise, dicte encore.
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut, created_at)
    SELECT $1, $2, 'dictee', date_trunc('month', now() AT TIME ZONE 'Europe/Paris')::date, 'reussi', now() - interval '2 days'
      FROM generate_series(1, 500)`, [ORG_PATRON, PATRON]);
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut, created_at)
    SELECT $1, $2, 'dictee', date_trunc('month', now() AT TIME ZONE 'Europe/Paris')::date, 'reussi', ${AUJOURDHUI}
      FROM generate_series(1, 99)`, [ORG_PATRON, SALARIE]);
  const sal100 = await reserverBrut(SALARIE, ORG_PATRON);
  await q(`UPDATE usage_ia_log SET created_at = ${AUJOURDHUI} WHERE user_id = $1 AND created_at > now() - interval '1 minute'`, [SALARIE]);
  const sal101 = await reserverBrut(SALARIE, ORG_PATRON);
  const patronMemeJour = await reserverBrut(PATRON, ORG_PATRON);
  verifier(sal100.autorise === true && sal100.plan === 'equipe' && sal100.limite === null && sal100.utilise > 500,
    `107 : au plan Équipe, aucune limite mensuelle, la 100e dictée du jour d'une personne passe (${JSON.stringify(sal100)})`);
  verifier(sal101.autorise === false && sal101.motif === 'plafond_jour' && sal101.par_jour === 100,
    `107 : au plan Équipe, la 101e dictée du jour d'une même personne est refusée (${JSON.stringify(sal101)})`);
  verifier(patronMemeJour.autorise === true,
    '107 : au plan Équipe, le plafond est par personne : un autre membre de l\'entreprise dicte encore');
  await q(`DELETE FROM usage_ia_log WHERE user_id IN ($1, $2) AND created_at > now() - interval '3 days' AND id <> $3`, [PATRON, SALARIE, salarie.id]);

  // Au plan gratuit, le plafond du jour est 20 (délais non décomptés du quota mensuel)
  const ORG_GRATUIT_JOUR = '10700000-0000-4000-8000-0000000000a6';
  const GRATUIT_JOUR = '10700000-0000-4000-8000-000000000003';
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'jour@107.fr')`, [GRATUIT_JOUR]);
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Jour 107', 'jour-107', $2)`, [ORG_GRATUIT_JOUR, GRATUIT_JOUR]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_GRATUIT_JOUR, GRATUIT_JOUR]);
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut, motif, created_at)
    SELECT $1, $2, 'dictee', (now() AT TIME ZONE 'Europe/Paris')::date, 'echec', 'delai', ${AUJOURDHUI} FROM generate_series(1, 19)`, [ORG_GRATUIT_JOUR, GRATUIT_JOUR]);
  const vingtieme = await reserverBrut(GRATUIT_JOUR, ORG_GRATUIT_JOUR);
  await q(`UPDATE usage_ia_log SET created_at = ${AUJOURDHUI} WHERE user_id = $1`, [GRATUIT_JOUR]);
  const vingtEtUnieme = await reserverBrut(GRATUIT_JOUR, ORG_GRATUIT_JOUR);
  verifier(vingtieme.autorise === true && vingtEtUnieme.autorise === false && vingtEtUnieme.motif === 'plafond_jour',
    `107 : au plan gratuit, la 21e analyse du jour est refusée (${vingtieme.autorise},${vingtEtUnieme.motif})`);
  await q(`DELETE FROM usage_ia_log WHERE user_id = $1`, [GRATUIT_JOUR]);

  // ── Coupe-circuit global : DEUX compteurs sur 24 heures (D-37, décision d'Hugo du 5 nov. 2026) ──
  // 1 000 analyses pour l'ensemble des comptes au plan gratuit, 3 000 pour l'ensemble des plans payants. Un appel n'est
  // regardé que contre le compteur de son plan : un abus de comptes gratuits ne coupe pas les payants, et l'inverse.
  // Lignes de remplissage : sans compte (user_id NULL), datées de 5 h (hors plafonds par minute et par jour).
  const GLOBAL_GRATUIT = '10700000-0000-4000-8000-000000000005';
  const ORG_GLOBAL_GRATUIT = '10700000-0000-4000-8000-0000000000a9';
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'global@107.fr')`, [GLOBAL_GRATUIT]);
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Global 107', 'global-107', $2)`, [ORG_GLOBAL_GRATUIT, GLOBAL_GRATUIT]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG_GLOBAL_GRATUIT, GLOBAL_GRATUIT]);
  const remplir = (n, plan, age = '5 hours') => q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut, plan, created_at)
    SELECT $1, NULL, 'dictee', date_trunc('month', now() AT TIME ZONE 'Europe/Paris')::date, 'reussi', $2, now() - interval '${age}'
      FROM generate_series(1, $3::int)`, [ORG_PATRON, plan, n]);
  const viderRemplissage = () => q(`DELETE FROM usage_ia_log WHERE user_id IS NULL AND organization_id = $1`, [ORG_PATRON]);
  const effacerAppels = (...comptes) => q(`DELETE FROM usage_ia_log WHERE user_id = ANY($1::uuid[])`, [comptes]);

  // Au-delà de 24 heures, rien ne compte
  await remplir(1000, 'gratuit', '25 hours');
  const vieilles = await reserverBrut(GLOBAL_GRATUIT, ORG_GLOBAL_GRATUIT);
  verifier(vieilles.autorise === true, `107 : 1 000 analyses gratuites vieilles de plus de 24 h ne coupent rien (${JSON.stringify(vieilles)})`);
  await viderRemplissage(); await effacerAppels(GLOBAL_GRATUIT);

  // Compteur des comptes gratuits : 999 déjà faites, la 1 000e passe, la suivante est coupée ; un appel payant passe encore
  await remplir(999, 'gratuit');
  const milliemeGratuite = await reserverBrut(GLOBAL_GRATUIT, ORG_GLOBAL_GRATUIT);
  const avantCoupure = await compte(`SELECT count(*) AS n FROM usage_ia_log WHERE fonction = 'dictee'`);
  const gratuiteCoupee = await reserverBrut(GLOBAL_GRATUIT, ORG_GLOBAL_GRATUIT);
  const apresCoupure = await compte(`SELECT count(*) AS n FROM usage_ia_log WHERE fonction = 'dictee'`);
  // Les plans payants ont déjà fait 2 500 analyses : avec les 1 000 gratuites, le total passe 3 000, mais le seuil des
  // payants (3 000 analyses payantes) n'est pas atteint. Un seul compteur commun couperait ici les payants à cause des gratuits.
  await remplir(2500, 'artisan');
  const payantPendantAbusGratuit = await reserverBrut(PAYEUR, ORG_PAYEUR);
  verifier(milliemeGratuite.autorise === true && gratuiteCoupee.autorise === false && gratuiteCoupee.motif === 'global' && gratuiteCoupee.plan === 'gratuit'
    && apresCoupure === avantCoupure,
  `107 : à 1 000 analyses gratuites en 24 h, un appel gratuit est coupé (global) et rien n'est compté (${JSON.stringify(gratuiteCoupee)})`);
  verifier(payantPendantAbusGratuit.autorise === true && payantPendantAbusGratuit.plan === 'artisan',
    `107 : avec 1 000 gratuites et 2 500 payantes (3 500 au total), un appel payant passe : un abus de comptes gratuits ne coupe pas les payants (${JSON.stringify(payantPendantAbusGratuit)})`);
  await viderRemplissage(); await effacerAppels(GLOBAL_GRATUIT, PAYEUR);

  // Compteur des plans payants : 2 999 déjà faites (Artisan et Équipe confondus), la 3 000e passe, la suivante est coupée ;
  // un appel gratuit passe encore
  await remplir(1500, 'artisan'); await remplir(1499, 'equipe');
  const troismillieme = await reserverBrut(PAYEUR, ORG_PAYEUR);
  const payanteCoupee = await reserverBrut(PAYEUR, ORG_PAYEUR);
  const gratuitPendantAbusPayant = await reserverBrut(GLOBAL_GRATUIT, ORG_GLOBAL_GRATUIT);
  verifier(troismillieme.autorise === true && payanteCoupee.autorise === false && payanteCoupee.motif === 'global' && payanteCoupee.plan === 'artisan',
    `107 : à 3 000 analyses payantes en 24 h, un appel payant est coupé (global) (${JSON.stringify(payanteCoupee)})`);
  verifier(gratuitPendantAbusPayant.autorise === true && gratuitPendantAbusPayant.plan === 'gratuit',
    `107 : pendant ce temps, un appel gratuit passe : les deux compteurs sont indépendants (${JSON.stringify(gratuitPendantAbusPayant)})`);
  await viderRemplissage(); await effacerAppels(GLOBAL_GRATUIT, PAYEUR);

  // Une ligne sans plan (insérée à la main) compte avec les payants, jamais avec les gratuits
  await remplir(3000, null);
  const sansPlanPayant = await reserverBrut(PAYEUR, ORG_PAYEUR);
  const sansPlanGratuit = await reserverBrut(GLOBAL_GRATUIT, ORG_GLOBAL_GRATUIT);
  verifier(sansPlanPayant.autorise === false && sansPlanPayant.motif === 'global' && sansPlanGratuit.autorise === true,
    `107 : 3 000 lignes sans plan comptent avec les payants, pas avec les gratuits (${sansPlanPayant.motif}, ${sansPlanGratuit.autorise})`);
  await viderRemplissage(); await effacerAppels(GLOBAL_GRATUIT, PAYEUR);

  // ── Jetons inconnus : gardés NULL (pas 0) ──
  const inconnue = await reserverBrut(PAYEUR, ORG_PAYEUR);
  await commeServeur(() => q(TERMINER, [inconnue.id, 'echec', 'claude-haiku-5-5', null, null, 15000, 'delai']));
  const jetonsInconnus = (await q('SELECT jetons_entree, jetons_sortie FROM usage_ia_log WHERE id = $1', [inconnue.id])).rows[0];
  verifier(jetonsInconnus.jetons_entree === null && jetonsInconnus.jetons_sortie === null,
    `107 : un échec sans réponse garde des jetons inconnus (NULL), pas 0 (${JSON.stringify(jetonsInconnus)})`);
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

  // ── Suppression d'un compte : ses lignes du journal sont effacées (ON DELETE CASCADE), même chez le patron ──
  const PARTI = '10700000-0000-4000-8000-000000000004';
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'parti@107.fr')`, [PARTI]);
  await q(`INSERT INTO usage_ia_log (organization_id, user_id, fonction, mois, statut) VALUES ($1, $2, 'dictee', now()::date, 'reussi')`, [ORG_PATRON, PARTI]);
  const avantSuppression = await compte('SELECT count(*) AS n FROM usage_ia_log WHERE user_id = $1', [PARTI]);
  await q(`DELETE FROM auth.users WHERE id = $1`, [PARTI]);
  verifier(avantSuppression === 1 && (await compte('SELECT count(*) AS n FROM usage_ia_log WHERE user_id = $1', [PARTI])) === 0
    && (await compte('SELECT count(*) AS n FROM usage_ia_log WHERE user_id IS NULL AND organization_id = $1', [ORG_PATRON])) === 0,
  '107 : à la suppression d\'un compte, ses lignes du journal sont effacées (pas gardées sans nom)');

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
  verifier(!!(await erreurDe(() => en(SOLO, () => q('SELECT * FROM abonnement_pour_usage_ia($1, $2)', [PATRON, ORG_PATRON]))))
    && !!(await erreurDe(() => commeAnonyme(() => q('SELECT * FROM abonnement_pour_usage_ia($1, $2)', [PATRON, ORG_PATRON])))),
  '107 : ni un utilisateur ni un visiteur ne lisent l\'abonnement (et le payeur) d\'un autre');
  verifier(/usage_ia:p:/.test((await q(`SELECT pg_get_functiondef('public.reserver_usage_ia(uuid,uuid,text,jsonb)'::regprocedure) AS d`)).rows[0].d),
    '107 : la réservation prend un verrou par abonnement (quota partagé entre organisations)');
  // La requête de contrôle de l'en-tête (à lancer en production après l'application) rend bien « vrai, vrai » sur ce corps
  const controle = (await q(`SELECT pg_get_functiondef('public.reserver_usage_ia(uuid,uuid,text,jsonb)'::regprocedure) ~ 'v_role NOT IN \\(''owner'', ''admin''\\)' AS roles,
      pg_get_functiondef('public.reserver_usage_ia(uuid,uuid,text,jsonb)'::regprocedure) ~ 'THEN 1000 ELSE 3000' AS seuils`)).rows[0];
  verifier(controle.roles === true && controle.seuils === true,
    `107 : la requête de contrôle de l'en-tête (propriétaire et administrateur, seuils 1 000 / 3 000) rend vrai (${JSON.stringify(controle)})`);

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
