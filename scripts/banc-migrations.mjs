/**
 * Banc d'essai des migrations sur un vrai PostgreSQL (PGlite, compilé en WebAssembly) — sans
 * Docker, sans toucher à la production.
 *
 * Pourquoi : les migrations s'appliquent à la main dans l'éditeur SQL Supabase. Une erreur de
 * syntaxe, ou une policy qui n'a pas l'effet voulu, ne se voyait qu'en production. Ce banc
 * reconstruit un socle Supabase simulé (auth.users, auth.uid(), rôles anon / authenticated,
 * tables et policies de production telles que décrites par les migrations historiques), applique
 * les migrations, les REJOUE (idempotence), puis vérifie leur effet en se faisant passer pour des
 * utilisateurs (jeton JWT simulé, rôle authenticated ou anon).
 *
 * Usage : npm run banc:migrations      (code de sortie ≠ 0 au moindre échec)
 * Nouvelle migration : l'ajouter à MIGRATIONS et écrire ses vérifications en bas du fichier.
 */
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEPOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/migrations');
const MIGRATIONS = ['071', '072', '073', '074', '075'];
const db = new PGlite();
let echecs = 0;
const ok = (m) => console.log('  ✓', m);
const ko = (m, e) => { echecs++; console.log('  ✗', m, e ? `→ ${e.message || e}` : ''); };
const verifier = (cond, m) => (cond ? ok(m) : ko(m));
const q = (sql, p) => db.query(sql, p);
const en = async (uid, fn) => {
  // Simule une requête PostgREST : rôle authenticated + jeton JWT de l'utilisateur.
  await db.exec('BEGIN');
  try {
    await q(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    await db.exec('SET LOCAL ROLE authenticated');
    const r = await fn();
    await db.exec('COMMIT');
    return r;
  } catch (e) { await db.exec('ROLLBACK'); throw e; }
};

// ── Socle Supabase simulé (état de la production supposé avant 071) ─────────────
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT);
  CREATE TABLE auth.identities (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE);
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
    $$ SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

  CREATE TYPE org_role AS ENUM ('owner','admin','comptable','chef_chantier','ouvrier','readonly');
  CREATE TABLE organizations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE organization_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, role org_role NOT NULL DEFAULT 'readonly',
    invited_by UUID REFERENCES auth.users(id));
  CREATE TABLE invitations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT, invited_by UUID REFERENCES auth.users(id) NOT NULL);
  CREATE TABLE activity_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id), action TEXT);

  CREATE TABLE subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users UNIQUE NOT NULL, stripe_customer_id TEXT, stripe_subscription_id TEXT,
    plan TEXT DEFAULT 'gratuit', status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    CONSTRAINT valid_plan CHECK (plan IN ('gratuit','artisan','equipe')),
    CONSTRAINT valid_status CHECK (status IN ('active','canceled','past_due','trialing','incomplete')));
  ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users view own subscription" ON subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
  CREATE POLICY "Users insert own subscription" ON subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users update own subscription" ON subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE FUNCTION get_org_subscription(p_org_id UUID, p_user_id UUID) RETURNS JSON LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::json $$;
  GRANT EXECUTE ON FUNCTION get_org_subscription TO authenticated;

  CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), nom TEXT);
  CREATE TABLE chantiers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), client_id UUID REFERENCES clients(id), nom TEXT);
  -- devis → clients et chantiers SANS cascade : l'ordre de suppression compte
  CREATE TABLE devis (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), client_id UUID REFERENCES clients(id), chantier_id UUID REFERENCES chantiers(id), numero TEXT);
  CREATE TABLE entreprise (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id), nom TEXT);
  CREATE TABLE payment_links (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id), token TEXT);
  ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own payment_links" ON payment_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Anon read payment_links by token" ON payment_links FOR SELECT TO anon USING (true);
  CREATE TABLE portal_access_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID REFERENCES clients(id) ON DELETE CASCADE, ip_address TEXT);
  ALTER TABLE portal_access_logs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Service role can manage portal logs" ON portal_access_logs FOR ALL USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
`);
console.log('Socle simulé prêt.');

// ── Application des migrations ─────────────────────────────────────────────────
for (const n of MIGRATIONS) {
  const f = fs.readdirSync(DEPOT).find((x) => x.startsWith(n + '_'));
  try { await db.exec(fs.readFileSync(`${DEPOT}/${f}`, 'utf8')); ok(`migration ${f} appliquée`); }
  catch (e) { ko(`migration ${f}`, e); }
}
// Idempotence : tout rejouer
for (const n of MIGRATIONS) {
  const f = fs.readdirSync(DEPOT).find((x) => x.startsWith(n + '_'));
  try { await db.exec(fs.readFileSync(`${DEPOT}/${f}`, 'utf8')); ok(`migration ${f} rejouée sans erreur`); }
  catch (e) { ko(`migration ${f} rejouée`, e); }
}
await db.exec('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;');

// ── Données ────────────────────────────────────────────────────────────────────
const PATRON = '11111111-1111-4111-8111-111111111111';
const SALARIE = '22222222-2222-4222-8222-222222222222';
const SOLO = '33333333-3333-4333-8333-333333333333';
const PAYEUR = '44444444-4444-4444-8444-444444444444';
await db.exec(`
  INSERT INTO auth.users VALUES ('${PATRON}','patron@x.fr'),('${SALARIE}','salarie@x.fr'),('${SOLO}','solo@x.fr'),('${PAYEUR}','payeur@x.fr');
  INSERT INTO auth.identities (user_id) VALUES ('${SOLO}');
  INSERT INTO organizations (id, name, slug, owner_id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Patron SARL','patron','${PATRON}');
  INSERT INTO organizations (id, name, slug, owner_id) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Solo','solo','${SOLO}');
  INSERT INTO organization_members (organization_id, user_id, role) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${PATRON}','owner'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${SALARIE}','ouvrier'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','${SOLO}','owner');
  INSERT INTO invitations (organization_id, email, invited_by) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','x@y.fr','${SALARIE}');
  INSERT INTO activity_log (organization_id, user_id, action) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${SALARIE}','devis créé');
`);
await q(`INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id, stripe_customer_id) VALUES ($1,'equipe','active','sub_patron','cus_p')`, [PATRON]);
await q(`INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id, stripe_customer_id) VALUES ($1,'artisan','active','sub_payeur','cus_q')`, [PAYEUR]);
// Ligne gratuite d'un collaborateur rattachée À TORT à l'organisation du patron (bug corrigé par 073)
await q(`INSERT INTO subscriptions (user_id, plan, organization_id) VALUES ($1,'gratuit','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')`, [SALARIE]);
const s = await q(`SELECT user_id, organization_id FROM subscriptions ORDER BY user_id`);
verifier(s.rows.find((r) => r.user_id === SALARIE).organization_id === null, '073 : la ligne gratuite d\'un collaborateur n\'est pas rattachée à l\'organisation');
verifier(s.rows.find((r) => r.user_id === PATRON).organization_id === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '073 : la ligne du patron est rattachée à son organisation (déclencheur)');

// ── 073 : faille d'auto-surclassement fermée ───────────────────────────────────
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

// ── 075 : tables publiques fermées ─────────────────────────────────────────────
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

// ── 074 : codes testeurs et retours ────────────────────────────────────────────
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

// ── 072 : suppression de compte ────────────────────────────────────────────────
await db.exec(`
  INSERT INTO clients (id, user_id, organization_id, nom) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '${SOLO}', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Client du solo');
  INSERT INTO chantiers (id, user_id, organization_id, client_id, nom) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '${SOLO}', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Chantier');
  INSERT INTO devis (user_id, organization_id, client_id, chantier_id, numero) VALUES ('${SOLO}', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'DEV-1');
  INSERT INTO entreprise (user_id, nom) VALUES ('${SOLO}', 'Élec Solo');
  INSERT INTO devis (user_id, organization_id, client_id, numero) VALUES ('${SALARIE}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'DEV-SALARIE');
`);
const compte = async (sql, p) => Number((await q(sql, p)).rows[0].n);

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

console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.');
process.exit(echecs ? 1 : 0);
