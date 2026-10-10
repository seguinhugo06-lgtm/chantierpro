-- ============================================================
-- Migration 084: aucune ligne dans l'organisation d'un autre
-- ============================================================
-- Pourquoi : relecture gardien-securite du 10 oct. 2026 (ÉLEVÉE, constat en production en lecture seule) :
--   sur les tables métier, les policies INSERT/UPDATE « Users can … own … » ne contrôlent que user_id. Un compte
--   qui connaît l'identifiant d'une organisation y crée ou y déplace ses propres lignes, visibles de ses membres.
--   Le pire : une fiche `entreprise` injectée dans l'organisation d'un artisan remonte dans sa liste
--   (loadEntreprises, triée par `ordre` puis `created_at`, deux valeurs que l'auteur choisit) et peut mettre un
--   autre IBAN sur ses documents. Et sur `entreprise` : « Org members can update entreprise » n'a pas de
--   WITH CHECK et est ouverte à tout membre (un ouvrier change l'IBAN du patron) ; « Org admins can delete
--   entreprise » est ouverte à tout membre malgré son nom.
-- Effet :
--   - un compte connecté ne peut plus écrire une ligne dans une organisation dont il n'est pas membre (insertion,
--     ou changement d'organisation) : refus « Organisation interdite » ; une ligne sans organisation reçoit
--     toujours la sienne (079) ; le serveur (rôle de service, fonctions SECURITY DEFINER sans jeton) n'est pas
--     concerné ; un visiteur n'écrit pas dans ces tables ;
--   - la fiche entreprise d'une organisation ne s'ajoute, ne se modifie et ne se supprime que par son propriétaire
--     ou un administrateur (chacun garde la main sur sa propre fiche par « Users can update own entreprise »).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT count(*) AS tables_gardees FROM pg_trigger WHERE tgname = 'trg_garder_organisation';
--   → le nombre de tables de la liste présentes en production (45 le 10 oct. 2026).
--   SELECT policyname, cmd, qual, with_check FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'entreprise' AND policyname LIKE 'Org %' ORDER BY 1;
--   → delete et update : mon_role_organisation(organization_id) IN ('owner','admin'), update avec WITH CHECK.
-- ============================================================

-- 1. Le contrôle : l'organisation écrite doit être une des miennes
CREATE OR REPLACE FUNCTION public.garder_organisation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Compte connecté seulement (le serveur et les migrations n'ont pas d'auth.uid()) ; à l'insertion, ou quand
  -- l'organisation d'une ligne change
  IF auth.uid() IS NOT NULL
     AND NEW.organization_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.organization_id IS DISTINCT FROM OLD.organization_id)
     AND public.mon_role_organisation(NEW.organization_id) IS NULL THEN
    RAISE EXCEPTION 'Organisation interdite' USING ERRCODE = '42501';
  END IF;
  -- Fiche entreprise (IBAN, mentions) : ajoutée à une organisation par son propriétaire ou un administrateur
  -- seulement (relecture gardien-securite du 10 oct. 2026 : un ouvrier pouvait en ajouter une, servie ensuite
  -- sur les devis sans fiche désignée)
  IF TG_TABLE_NAME = 'entreprise' AND TG_OP = 'INSERT' AND auth.uid() IS NOT NULL AND NEW.organization_id IS NOT NULL
     AND NOT COALESCE(public.mon_role_organisation(NEW.organization_id) IN ('owner', 'admin'), false) THEN
    RAISE EXCEPTION 'Seul un gérant ajoute une fiche entreprise' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_organisation() FROM PUBLIC, anon, authenticated;

-- 2. Sur chaque table métier qui porte user_id et organization_id (liste relevée en production le 10 oct. 2026 ;
--    organization_members et invitations ont leurs propres règles, 078 ; comptes_supprimes est écrit par
--    supprimer_mon_compte au moment où l'adhésion disparaît)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activity_log', 'ai_suggestions', 'ajustements', 'audit_logs', 'bank_reconciliation_log', 'bank_transactions',
    'campagnes_email', 'catalogue', 'catalogue_coefficients', 'chantier_photos', 'chantiers', 'chat_channels',
    'client_communications', 'clients', 'contrats', 'depenses', 'devis', 'devis_templates', 'echanges', 'entreprise',
    'equipe', 'equipes', 'events', 'events_log', 'form_templates', 'fournisseur_articles', 'fournisseurs', 'garanties',
    'ia_analyses', 'memos', 'notifications_client', 'ouvrages', 'pack_items', 'packs', 'paiements', 'parrainages',
    'planning_events', 'pointages', 'reglements', 'relance_exclusions', 'relance_executions', 'retours',
    'situations_travaux', 'stock_mouvements', 'stripe_config', 'subscriptions', 'template_usages',
    'tresorerie_mouvements', 'tresorerie_previsions', 'tresorerie_settings'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id') THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS trg_garder_organisation ON public.%I', t);
    -- « garder » s'exécute avant « renseigner » (ordre alphabétique) : une ligne sans organisation passe, puis la
    -- reçoit ; une organisation fournie est contrôlée
    EXECUTE format('CREATE TRIGGER trg_garder_organisation BEFORE INSERT OR UPDATE OF organization_id ON public.%I '
                   'FOR EACH ROW EXECUTE FUNCTION public.garder_organisation()', t);
  END LOOP;
END $$;

-- 3. La fiche entreprise d'une organisation : modifiée ou supprimée par son propriétaire ou un administrateur
DO $$
BEGIN
  IF to_regclass('public.entreprise') IS NULL THEN RETURN; END IF;
  DROP POLICY IF EXISTS "Org members can update entreprise" ON public.entreprise;
  CREATE POLICY "Org members can update entreprise" ON public.entreprise FOR UPDATE TO authenticated
    USING (public.mon_role_organisation(organization_id) IN ('owner', 'admin'))
    WITH CHECK (public.mon_role_organisation(organization_id) IN ('owner', 'admin'));
  DROP POLICY IF EXISTS "Org admins can delete entreprise" ON public.entreprise;
  CREATE POLICY "Org admins can delete entreprise" ON public.entreprise FOR DELETE TO authenticated
    USING (public.mon_role_organisation(organization_id) IN ('owner', 'admin'));
END $$;
