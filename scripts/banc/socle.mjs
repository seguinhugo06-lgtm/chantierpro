/**
 * Socle du banc : un Supabase simulé dans l'état supposé de la PRODUCTION AVANT la migration 071
 * (rôles anon / authenticated, auth.users, auth.uid() lu dans le jeton, tables et policies
 * décrites par les migrations historiques), puis des données de base partagées par les vérifications.
 *
 * Quand une migration est appliquée en production, elle reste rejouée ici dans l'ordre : le socle
 * ne décrit que ce qui précède 071. Si la production diverge (table ajoutée à la main…), l'ajouter ici.
 */
export const PATRON = '11111111-1111-4111-8111-111111111111';
export const SALARIE = '22222222-2222-4222-8222-222222222222';
export const SOLO = '33333333-3333-4333-8333-333333333333';
export const PAYEUR = '44444444-4444-4444-8444-444444444444';
export const ORG_PATRON = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const ORG_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export const SCHEMA = `
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

  -- Droits par défaut de Supabase : toute fonction créée dans public est exécutable par les rôles de l'API.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
  -- Paiement en ligne : clés Stripe de l'artisan dans Vault (012, et 029 effacée du dépôt par 227534e).
  CREATE SCHEMA vault;
  CREATE TABLE vault.decrypted_secrets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), decrypted_secret TEXT);
  GRANT USAGE ON SCHEMA vault TO service_role;
  CREATE TABLE stripe_config (user_id UUID PRIMARY KEY REFERENCES auth.users(id), stripe_enabled BOOLEAN DEFAULT false,
    secret_key_vault_id UUID, webhook_secret_vault_id UUID, commission_model TEXT);
  ALTER TABLE stripe_config ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION get_stripe_config_for_user(p_user_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE v stripe_config; s TEXT;
    BEGIN SELECT * INTO v FROM stripe_config WHERE user_id = p_user_id;
      SELECT decrypted_secret INTO s FROM vault.decrypted_secrets WHERE id = v.secret_key_vault_id;
      RETURN jsonb_build_object('enabled', v.stripe_enabled, 'secret_key', s); END $$;
  REVOKE ALL ON FUNCTION get_stripe_config_for_user FROM PUBLIC;  -- tel quel dans 012 : anon garde le droit par défaut
  CREATE FUNCTION get_stripe_secret_for_user(p_user_id UUID) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE s TEXT;
    BEGIN SELECT d.decrypted_secret INTO s FROM stripe_config c JOIN vault.decrypted_secrets d ON d.id = c.secret_key_vault_id
      WHERE c.user_id = p_user_id AND c.stripe_enabled; RETURN s; END $$;
  REVOKE EXECUTE ON FUNCTION get_stripe_secret_for_user(UUID) FROM anon;           -- tel quel dans 029 :
  REVOKE EXECUTE ON FUNCTION get_stripe_secret_for_user(UUID) FROM authenticated;  -- PUBLIC garde le droit
`;

/** Données de base : un patron avec un salarié, un artisan solo, un abonné payant. */
export async function donneesDeBase({ db, q }) {
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
}

/**
 * Outils des vérifications. `en(uid, fn)` simule une requête PostgREST : rôle authenticated et
 * jeton JWT de l'utilisateur, dans une transaction validée (ou annulée si fn lève).
 */
export function outils(db) {
  const etat = { echecs: 0, verifications: 0 };
  const ok = (m) => { etat.verifications++; console.log('  ✓', m); };
  const ko = (m, e) => { etat.verifications++; etat.echecs++; console.log('  ✗', m, e ? `→ ${e.message || e}` : ''); };
  const verifier = (cond, m) => (cond ? ok(m) : ko(m));
  const q = (sql, p) => db.query(sql, p);
  const compte = async (sql, p) => Number((await q(sql, p)).rows[0].n);
  const en = async (uid, fn) => {
    await db.exec('BEGIN');
    try {
      await q(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
      await db.exec('SET LOCAL ROLE authenticated');
      const r = await fn();
      await db.exec('COMMIT');
      return r;
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
  };
  const commeAnonyme = async (fn) => {
    await db.exec('BEGIN; SET LOCAL ROLE anon;');
    try { return await fn(); } finally { await db.exec('ROLLBACK').catch(() => {}); }
  };
  return { db, q, en, commeAnonyme, compte, ok, ko, verifier, etat };
}
