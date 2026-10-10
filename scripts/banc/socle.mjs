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

/**
 * Organisations, membres et invitations tels qu'en PRODUCTION (constaté par Hugo le 8 oct. 2026 :
 * pg_policies et pg_proc identiques à 035 + 039 + 041, effacées du dépôt par 227534e). Toutes les
 * fonctions sont SECURITY DEFINER et exécutables par anon (droits par défaut de Supabase).
 * Créées après les droits par défaut sur les fonctions, comme en production.
 */
const ORGANISATIONS = `
  CREATE FUNCTION user_org_ids(p_user_id UUID) RETURNS UUID[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT COALESCE(ARRAY_AGG(organization_id), ARRAY[]::UUID[]) FROM organization_members WHERE user_id = p_user_id $$;
  CREATE FUNCTION get_user_org_id(p_user_id UUID) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
    BEGIN RETURN (SELECT organization_id FROM organization_members WHERE user_id = p_user_id ORDER BY joined_at ASC LIMIT 1); END $$;
  CREATE FUNCTION get_user_role(p_user_id UUID, p_org_id UUID) RETURNS org_role LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
    BEGIN RETURN (SELECT role FROM organization_members WHERE user_id = p_user_id AND organization_id = p_org_id); END $$;
  CREATE FUNCTION is_org_member(p_user_id UUID, p_org_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
    BEGIN RETURN EXISTS (SELECT 1 FROM organization_members WHERE user_id = p_user_id AND organization_id = p_org_id); END $$;
  CREATE FUNCTION create_default_org(p_user_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE v_org_id UUID; v_user_email TEXT; v_user_name TEXT; v_slug TEXT;
    BEGIN
      SELECT organization_id INTO v_org_id FROM organization_members WHERE user_id = p_user_id LIMIT 1;
      IF v_org_id IS NOT NULL THEN
        RETURN json_build_object('org_id', v_org_id, 'role', (SELECT role FROM organization_members WHERE user_id = p_user_id AND organization_id = v_org_id), 'already_exists', true);
      END IF;
      SELECT email, COALESCE(raw_user_meta_data->>'nom', raw_user_meta_data->>'name') INTO v_user_email, v_user_name FROM auth.users WHERE id = p_user_id;
      v_slug := LOWER(REGEXP_REPLACE(COALESCE(v_user_name, split_part(v_user_email, '@', 1)), '[^a-z0-9]', '-', 'g')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
      INSERT INTO organizations (name, slug, owner_id) VALUES (COALESCE(v_user_name, split_part(v_user_email, '@', 1)), v_slug, p_user_id) RETURNING id INTO v_org_id;
      INSERT INTO organization_members (organization_id, user_id, role) VALUES (v_org_id, p_user_id, 'owner');
      RETURN json_build_object('org_id', v_org_id, 'role', 'owner', 'already_exists', false);
    END $$;
  GRANT EXECUTE ON FUNCTION user_org_ids, get_user_org_id, get_user_role, is_org_member, create_default_org TO authenticated;

  -- 039 : invitations
  CREATE FUNCTION get_invitation_by_token(p_token UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
    DECLARE v_invitation RECORD; v_org_name TEXT; v_inviter_email TEXT;
    BEGIN
      SELECT * INTO v_invitation FROM invitations WHERE token = p_token AND status = 'pending' AND expires_at > NOW();
      IF NOT FOUND THEN RETURN json_build_object('error', 'Invitation introuvable ou expirée'); END IF;
      SELECT name INTO v_org_name FROM organizations WHERE id = v_invitation.organization_id;
      SELECT email INTO v_inviter_email FROM auth.users WHERE id = v_invitation.invited_by;
      RETURN json_build_object('id', v_invitation.id, 'organization_id', v_invitation.organization_id, 'organization_name', v_org_name,
        'role', v_invitation.role, 'email', v_invitation.email, 'phone', v_invitation.phone, 'invited_by_email', v_inviter_email,
        'created_at', v_invitation.created_at, 'expires_at', v_invitation.expires_at);
    END $$;
  CREATE FUNCTION accept_invitation(p_token UUID, p_user_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE v_invitation RECORD; v_member_count INT; v_already_member BOOLEAN;
    BEGIN
      SELECT * INTO v_invitation FROM invitations WHERE token = p_token AND status = 'pending' AND expires_at > NOW();
      IF NOT FOUND THEN RETURN json_build_object('error', 'Invitation introuvable ou expirée'); END IF;
      SELECT EXISTS(SELECT 1 FROM organization_members WHERE organization_id = v_invitation.organization_id AND user_id = p_user_id) INTO v_already_member;
      IF v_already_member THEN
        UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = v_invitation.id;
        RETURN json_build_object('success', true, 'already_member', true);
      END IF;
      SELECT COUNT(*) INTO v_member_count FROM organization_members WHERE organization_id = v_invitation.organization_id;
      IF v_member_count >= 50 THEN RETURN json_build_object('error', 'Limite de membres atteinte'); END IF;
      INSERT INTO organization_members (organization_id, user_id, role, invited_by) VALUES (v_invitation.organization_id, p_user_id, v_invitation.role, v_invitation.invited_by);
      UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = v_invitation.id;
      INSERT INTO activity_log (organization_id, user_id, action, entity_type, metadata)
        VALUES (v_invitation.organization_id, p_user_id, 'member_joined', 'organization_member', json_build_object('role', v_invitation.role, 'invitation_id', v_invitation.id));
      RETURN json_build_object('success', true, 'organization_id', v_invitation.organization_id, 'role', v_invitation.role);
    END $$;
  CREATE FUNCTION revoke_invitation(p_invitation_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      UPDATE invitations SET status = 'revoked' WHERE id = p_invitation_id AND status = 'pending';
      IF NOT FOUND THEN RETURN json_build_object('error', 'Invitation introuvable'); END IF;
      RETURN json_build_object('success', true);
    END $$;
  GRANT EXECUTE ON FUNCTION get_invitation_by_token TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION accept_invitation, revoke_invitation TO authenticated;

  -- 035 (organizations, invitations « by token ») et 041 (le reste) : policies constatées en production
  ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
  ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Org members can view org" ON organizations FOR SELECT TO authenticated
    USING (id = ANY (user_org_ids(auth.uid())) OR owner_id = auth.uid());
  CREATE POLICY "Owner can update org" ON organizations FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  CREATE POLICY "Authenticated can insert org" ON organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
  CREATE POLICY "Members can view co-members" ON organization_members FOR SELECT TO authenticated
    USING (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Admins can insert members" ON organization_members FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Admins can update members" ON organization_members FOR UPDATE TO authenticated
    USING (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Admins can delete members" ON organization_members FOR DELETE TO authenticated
    USING (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Org admins can manage invitations" ON invitations FOR ALL TO authenticated
    USING (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Anyone can read pending invitations by token" ON invitations FOR SELECT TO anon, authenticated
    USING (status = 'pending' AND expires_at > NOW());
  CREATE POLICY "Members can view org activity" ON activity_log FOR SELECT TO authenticated
    USING (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Members can insert activity" ON activity_log FOR INSERT TO authenticated
    WITH CHECK (organization_id = ANY (user_org_ids(auth.uid())));
`;

export const SCHEMA = `
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}');
  CREATE TABLE auth.identities (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE);
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
    $$ SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

  -- Organisations : tables de 035 (effacée du dépôt par 227534e) ; leurs fonctions et policies plus bas.
  CREATE TYPE org_role AS ENUM ('owner','admin','comptable','chef_chantier','ouvrier','readonly');
  CREATE TYPE invitation_status AS ENUM ('pending','accepted','expired','revoked');
  CREATE TABLE organizations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE organization_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, role org_role NOT NULL DEFAULT 'readonly',
    invited_by UUID REFERENCES auth.users(id), joined_at TIMESTAMPTZ DEFAULT now(), equipe_member_id UUID,
    UNIQUE (organization_id, user_id));
  CREATE TABLE invitations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT, phone TEXT, role org_role NOT NULL DEFAULT 'ouvrier', token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    status invitation_status DEFAULT 'pending', invited_by UUID REFERENCES auth.users(id) NOT NULL, created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'), accepted_at TIMESTAMPTZ,
    CONSTRAINT has_contact CHECK (email IS NOT NULL OR phone IS NOT NULL));
  CREATE TABLE activity_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id), action TEXT NOT NULL, entity_type TEXT, entity_id UUID, metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now());

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
  -- Tables de production où des lignes étaient enregistrées sans organisation (relevé du 8 oct. 2026, 079).
  CREATE TABLE catalogue (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), nom TEXT);
  CREATE TABLE echanges (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), objet TEXT);
  CREATE TABLE entreprise (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id), nom TEXT);
  -- Pointages et équipe, colonnes de production relevées le 10 oct. 2026 (080 y ajoute validation, verrou, assureur).
  CREATE TABLE equipe (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), nom TEXT NOT NULL, type TEXT, siret TEXT, decennale_numero TEXT);
  CREATE TABLE pointages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), employe_id UUID, chantier_id UUID, date DATE, heures NUMERIC NOT NULL, description TEXT);
  -- Colonnes de production lues par la page de paiement (get_facture_for_payment, 067 puis 081), relevées le 10 oct. 2026.
  ALTER TABLE devis ADD COLUMN type TEXT, ADD COLUMN facture_type TEXT, ADD COLUMN statut TEXT, ADD COLUMN date DATE,
    ADD COLUMN date_echeance DATE, ADD COLUMN objet TEXT, ADD COLUMN total_ht NUMERIC, ADD COLUMN total_tva NUMERIC,
    ADD COLUMN total_ttc NUMERIC, ADD COLUMN montant_paye NUMERIC, ADD COLUMN payment_token TEXT,
    ADD COLUMN payment_token_expires_at TIMESTAMPTZ, ADD COLUMN payment_status TEXT, ADD COLUMN payment_completed_at TIMESTAMPTZ,
    ADD COLUMN stripe_session_id TEXT, ADD COLUMN lignes JSONB;
  ALTER TABLE clients ADD COLUMN prenom TEXT, ADD COLUMN email TEXT;
  ALTER TABLE entreprise ADD COLUMN adresse TEXT, ADD COLUMN ville TEXT, ADD COLUMN code_postal TEXT, ADD COLUMN telephone TEXT,
    ADD COLUMN email TEXT, ADD COLUMN siret TEXT, ADD COLUMN logo_url TEXT, ADD COLUMN couleur_principale TEXT, ADD COLUMN iban TEXT, ADD COLUMN bic TEXT;
  CREATE TABLE paiements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), devis_id UUID, montant NUMERIC, date DATE, mode TEXT);
  -- Portail client (007), tel qu'en production le 10 oct. 2026 : jeton UUID permanent sur la fiche client, deux
  -- fonctions SECURITY DEFINER exécutables par un visiteur (082 les ferme), sans search_path.
  ALTER TABLE clients ADD COLUMN portal_access_token UUID;
  ALTER TABLE devis ADD COLUMN updated_at TIMESTAMPTZ;
  CREATE FUNCTION portal_accept_devis(p_token UUID, p_devis_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE v_client_id UUID; v_devis_client_id UUID;
  BEGIN
    SELECT id INTO v_client_id FROM clients WHERE portal_access_token = p_token;
    IF v_client_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid token'); END IF;
    SELECT client_id INTO v_devis_client_id FROM devis WHERE id = p_devis_id;
    IF v_devis_client_id != v_client_id THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
    UPDATE devis SET statut = 'accepte', updated_at = now() WHERE id = p_devis_id AND statut = 'envoye';
    RETURN json_build_object('success', true);
  END; $$;
  CREATE FUNCTION portal_refuse_devis(p_token UUID, p_devis_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE v_client_id UUID; v_devis_client_id UUID;
  BEGIN
    SELECT id INTO v_client_id FROM clients WHERE portal_access_token = p_token;
    IF v_client_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid token'); END IF;
    SELECT client_id INTO v_devis_client_id FROM devis WHERE id = p_devis_id;
    IF v_devis_client_id != v_client_id THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
    UPDATE devis SET statut = 'refuse', updated_at = now() WHERE id = p_devis_id AND statut = 'envoye';
    RETURN json_build_object('success', true);
  END; $$;
  CREATE FUNCTION get_client_by_portal_token(p_token UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN RETURN (SELECT json_build_object('id', c.id, 'nom', c.nom) FROM clients c WHERE c.portal_access_token = p_token); END; $$;
  GRANT EXECUTE ON FUNCTION get_client_by_portal_token, portal_accept_devis, portal_refuse_devis TO anon;
  CREATE TABLE payment_links (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id), token TEXT);
  ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own payment_links" ON payment_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Anon read payment_links by token" ON payment_links FOR SELECT TO anon USING (true);
  CREATE TABLE portal_access_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID REFERENCES clients(id) ON DELETE CASCADE, ip_address TEXT);
  ALTER TABLE portal_access_logs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Service role can manage portal logs" ON portal_access_logs FOR ALL USING (true) WITH CHECK (true);
  -- Signature en ligne (011, modifiée hors dépôt), telle qu'en production le 10 oct. 2026 (pg_get_functiondef) :
  -- trois fonctions SECURITY DEFINER sans search_path, exécutables par PUBLIC et anon ; colonnes relevées le même
  -- jour (information_schema). 083 les réécrit.
  ALTER TABLE devis ADD COLUMN validite_jours INTEGER, ADD COLUMN date_validite DATE, ADD COLUMN sections JSONB,
    ADD COLUMN conditions TEXT, ADD COLUMN remise_globale NUMERIC, ADD COLUMN tva_rate NUMERIC, ADD COLUMN acompte_percent NUMERIC,
    ADD COLUMN acompte_montant NUMERIC, ADD COLUMN acompte_pct NUMERIC, ADD COLUMN entreprise_id UUID, ADD COLUMN signature TEXT,
    ADD COLUMN signataire TEXT, ADD COLUMN signature_date TIMESTAMPTZ, ADD COLUMN signature_token UUID UNIQUE,
    ADD COLUMN signature_expires_at TIMESTAMPTZ, ADD COLUMN signature_data TEXT, ADD COLUMN signature_ip TEXT,
    ADD COLUMN signature_user_agent TEXT, ADD COLUMN signataire_nom TEXT, ADD COLUMN signature_cgv_accepted BOOLEAN;
  ALTER TABLE clients ADD COLUMN telephone TEXT, ADD COLUMN adresse TEXT, ADD COLUMN entreprise TEXT, ADD COLUMN categorie TEXT;
  ALTER TABLE chantiers ADD COLUMN adresse TEXT, ADD COLUMN ville TEXT, ADD COLUMN code_postal TEXT;
  ALTER TABLE entreprise ADD COLUMN tva_intra TEXT, ADD COLUMN site_web TEXT, ADD COLUMN conditions_paiement TEXT,
    ADD COLUMN mentions_legales TEXT, ADD COLUMN settings_json JSONB, ADD COLUMN forme_juridique TEXT, ADD COLUMN capital TEXT,
    ADD COLUMN code_ape TEXT, ADD COLUMN rcs TEXT, ADD COLUMN rcs_ville TEXT, ADD COLUMN couleur TEXT, ADD COLUMN cgv TEXT,
    ADD COLUMN delai_paiement INTEGER, ADD COLUMN validite_devis INTEGER, ADD COLUMN is_default BOOLEAN, ADD COLUMN archived_at TIMESTAMPTZ,
    ADD COLUMN created_at TIMESTAMPTZ DEFAULT now(), ADD COLUMN rc_pro_assureur TEXT, ADD COLUMN rc_pro_numero TEXT,
    ADD COLUMN rc_pro_validite DATE, ADD COLUMN rc_pro_montant_garantie NUMERIC, ADD COLUMN rc_pro_zone TEXT,
    ADD COLUMN decennale_assureur TEXT, ADD COLUMN decennale_numero TEXT, ADD COLUMN decennale_validite DATE,
    ADD COLUMN decennale_activites TEXT, ADD COLUMN assurance_decennale_compagnie TEXT, ADD COLUMN assurance_rc_pro_compagnie TEXT;
  ALTER TABLE portal_access_logs ADD COLUMN action TEXT, ADD COLUMN user_agent TEXT;
  CREATE FUNCTION generate_signature_token(p_devis_id uuid, p_expiry_days integer DEFAULT 30) RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE v_token UUID;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM devis WHERE id = p_devis_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Devis non trouve ou non autorise';
    END IF;
    v_token := gen_random_uuid();
    UPDATE devis SET signature_token = v_token, signature_expires_at = NOW() + (p_expiry_days || ' days')::INTERVAL, updated_at = NOW()
    WHERE id = p_devis_id;
    RETURN v_token;
  END; $$;
  CREATE FUNCTION get_devis_for_signature(p_token uuid) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE result JSON; v_devis RECORD;
  BEGIN
    SELECT d.id, d.statut, d.signature_expires_at, d.signature_data, (d.signature_data IS NOT NULL) as already_signed
    INTO v_devis FROM devis d WHERE d.signature_token = p_token;
    IF v_devis IS NULL THEN RETURN NULL; END IF;
    IF v_devis.already_signed THEN RETURN json_build_object('devis', json_build_object('already_signed', true)); END IF;
    IF v_devis.signature_expires_at <= NOW() THEN RETURN NULL; END IF;
    IF v_devis.statut NOT IN ('envoye', 'en_attente', 'accepte') THEN
      RETURN json_build_object('devis', json_build_object('already_signed', true));
    END IF;
    SELECT json_build_object(
      'devis', json_build_object('id', d.id, 'numero', d.numero, 'type', d.type, 'statut', d.statut, 'date', d.date,
        'date_validite', d.date_validite, 'objet', d.objet, 'lignes', d.lignes, 'sections', d.sections, 'conditions', d.conditions,
        'remise_globale', d.remise_globale, 'tva_rate', d.tva_rate, 'total_ht', d.total_ht, 'total_tva', d.total_tva,
        'total_ttc', d.total_ttc, 'acompte_percent', d.acompte_percent, 'acompte_montant', d.acompte_montant, 'already_signed', false),
      'client', json_build_object('nom', c.nom, 'prenom', c.prenom, 'email', c.email, 'telephone', c.telephone, 'adresse', c.adresse,
        'entreprise', c.entreprise),
      'entreprise', json_build_object('nom', e.nom, 'siret', e.siret, 'tva_intra', e.tva_intra, 'adresse', e.adresse, 'ville', e.ville,
        'code_postal', e.code_postal, 'telephone', e.telephone, 'email', e.email, 'site_web', e.site_web, 'logo', e.logo_url,
        'couleur', e.couleur_principale, 'iban', e.iban, 'bic', e.bic, 'conditions_paiement', e.conditions_paiement,
        'mentions_legales', e.mentions_legales)
    ) INTO result
    FROM devis d LEFT JOIN clients c ON d.client_id = c.id LEFT JOIN entreprise e ON e.user_id = d.user_id
    WHERE d.id = v_devis.id;
    RETURN result;
  END; $$;
  CREATE FUNCTION sign_devis(p_token uuid, p_signature_data text, p_signataire_nom text, p_ip text DEFAULT NULL::text,
    p_user_agent text DEFAULT NULL::text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE v_devis_id UUID; v_client_id UUID;
  BEGIN
    SELECT d.id, d.client_id INTO v_devis_id, v_client_id FROM devis d
    WHERE d.signature_token = p_token AND d.signature_expires_at > NOW() AND d.statut IN ('envoye', 'en_attente', 'accepte')
      AND d.signature_data IS NULL;
    IF v_devis_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Lien de signature invalide, expire ou devis deja signe');
    END IF;
    UPDATE devis SET signature_data = p_signature_data, signature_date = NOW(), signature_ip = p_ip, signature_user_agent = p_user_agent,
      signataire_nom = p_signataire_nom, signature_cgv_accepted = true, statut = 'signe', updated_at = NOW() WHERE id = v_devis_id;
    INSERT INTO portal_access_logs (client_id, action, ip_address, user_agent) VALUES (v_client_id, 'signature', p_ip, p_user_agent);
    RETURN json_build_object('success', true, 'devis_id', v_devis_id);
  END; $$;
  GRANT EXECUTE ON FUNCTION generate_signature_token, get_devis_for_signature, sign_devis TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

  -- Droits par défaut de Supabase : toute fonction créée dans public est exécutable par les rôles de l'API.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
  -- Paiement en ligne : clés Stripe de l'artisan dans Vault (012, et 029 effacée du dépôt par 227534e).
  CREATE SCHEMA vault;
  CREATE TABLE vault.decrypted_secrets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), decrypted_secret TEXT);
  GRANT USAGE ON SCHEMA vault TO service_role;
  -- organization_id : ajoutée par 036 (effacée du dépôt par 227534e) à stripe_config comme aux autres tables de données.
  CREATE TABLE stripe_config (user_id UUID PRIMARY KEY REFERENCES auth.users(id), organization_id UUID REFERENCES organizations(id), stripe_enabled BOOLEAN DEFAULT false,
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
${ORGANISATIONS}`;

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
    // Comme Supabase : un visiteur porte le rôle anon dans son jeton, sans identifiant (auth.uid() nul).
    await db.exec('BEGIN');
    await q(`SELECT set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    await db.exec('SET LOCAL ROLE anon');
    try { return await fn(); } finally { await db.exec('ROLLBACK').catch(() => {}); }
  };
  return { db, q, en, commeAnonyme, compte, ok, ko, verifier, etat };
}
