-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR CHANTIERPRO
-- Ensures complete data isolation between users
-- ============================================================================
--
-- SECURITY AUDIT CHECKLIST:
-- [x] All tables have RLS enabled
-- [x] All operations (SELECT, INSERT, UPDATE, DELETE) are protected
-- [x] user_id column exists on all tables for ownership
-- [x] Policies use auth.uid() for user identification
-- [x] No cross-user data access possible
-- [x] Service role bypass documented
--
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chantier_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointages ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE entreprise ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if re-running migration)
-- ============================================================================

-- Clients
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can create own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

-- Devis
DROP POLICY IF EXISTS "Users can view own devis" ON devis;
DROP POLICY IF EXISTS "Users can create own devis" ON devis;
DROP POLICY IF EXISTS "Users can update own devis" ON devis;
DROP POLICY IF EXISTS "Users can delete own devis" ON devis;

-- Chantiers
DROP POLICY IF EXISTS "Users can view own chantiers" ON chantiers;
DROP POLICY IF EXISTS "Users can create own chantiers" ON chantiers;
DROP POLICY IF EXISTS "Users can update own chantiers" ON chantiers;
DROP POLICY IF EXISTS "Users can delete own chantiers" ON chantiers;

-- Chantier Photos
DROP POLICY IF EXISTS "Users can view own photos" ON chantier_photos;
DROP POLICY IF EXISTS "Users can upload own photos" ON chantier_photos;
DROP POLICY IF EXISTS "Users can update own photos" ON chantier_photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON chantier_photos;

-- AI Suggestions
DROP POLICY IF EXISTS "Users can view own suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can create own suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can update own suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can delete own suggestions" ON ai_suggestions;

-- Depenses
DROP POLICY IF EXISTS "Users can view own depenses" ON depenses;
DROP POLICY IF EXISTS "Users can create own depenses" ON depenses;
DROP POLICY IF EXISTS "Users can update own depenses" ON depenses;
DROP POLICY IF EXISTS "Users can delete own depenses" ON depenses;

-- Pointages
DROP POLICY IF EXISTS "Users can view own pointages" ON pointages;
DROP POLICY IF EXISTS "Users can create own pointages" ON pointages;
DROP POLICY IF EXISTS "Users can update own pointages" ON pointages;
DROP POLICY IF EXISTS "Users can delete own pointages" ON pointages;

-- Equipe
DROP POLICY IF EXISTS "Users can view own equipe" ON equipe;
DROP POLICY IF EXISTS "Users can create own equipe" ON equipe;
DROP POLICY IF EXISTS "Users can update own equipe" ON equipe;
DROP POLICY IF EXISTS "Users can delete own equipe" ON equipe;

-- Catalogue
DROP POLICY IF EXISTS "Users can view own catalogue" ON catalogue;
DROP POLICY IF EXISTS "Users can create own catalogue" ON catalogue;
DROP POLICY IF EXISTS "Users can update own catalogue" ON catalogue;
DROP POLICY IF EXISTS "Users can delete own catalogue" ON catalogue;

-- Entreprise
DROP POLICY IF EXISTS "Users can view own entreprise" ON entreprise;
DROP POLICY IF EXISTS "Users can create own entreprise" ON entreprise;
DROP POLICY IF EXISTS "Users can update own entreprise" ON entreprise;

-- Events
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can create own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

-- ============================================================================
-- CLIENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own clients"
ON clients FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own clients"
ON clients FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own clients"
ON clients FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own clients"
ON clients FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- DEVIS (Quotes/Invoices) TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own devis"
ON devis FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own devis"
ON devis FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own devis"
ON devis FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own devis"
ON devis FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- CHANTIERS (Job Sites) TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own chantiers"
ON chantiers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own chantiers"
ON chantiers FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chantiers"
ON chantiers FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chantiers"
ON chantiers FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- CHANTIER_PHOTOS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own photos"
ON chantier_photos FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can upload own photos"
ON chantier_photos FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own photos"
ON chantier_photos FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own photos"
ON chantier_photos FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- AI_SUGGESTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own suggestions"
ON ai_suggestions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own suggestions"
ON ai_suggestions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own suggestions"
ON ai_suggestions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own suggestions"
ON ai_suggestions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- DEPENSES (Expenses) TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own depenses"
ON depenses FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own depenses"
ON depenses FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own depenses"
ON depenses FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own depenses"
ON depenses FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- POINTAGES (Time Tracking) TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own pointages"
ON pointages FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own pointages"
ON pointages FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pointages"
ON pointages FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own pointages"
ON pointages FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- EQUIPE (Team Members) TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own equipe"
ON equipe FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own equipe"
ON equipe FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own equipe"
ON equipe FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own equipe"
ON equipe FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- CATALOGUE (Products/Services) TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own catalogue"
ON catalogue FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own catalogue"
ON catalogue FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own catalogue"
ON catalogue FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own catalogue"
ON catalogue FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- ENTREPRISE (Company Settings) TABLE POLICIES
-- One entreprise per user (no delete - soft management)
-- ============================================================================

CREATE POLICY "Users can view own entreprise"
ON entreprise FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own entreprise"
ON entreprise FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own entreprise"
ON entreprise FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- EVENTS (Calendar Events) TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own events"
ON events FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own events"
ON events FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own events"
ON events FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own events"
ON events FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- STORAGE BUCKET POLICIES (chantier-photos)
-- ============================================================================

-- Note: Storage policies are managed separately in Supabase dashboard
-- or via storage.policies table. Here's the recommended setup:

-- Policy: Users can upload to their own folder
-- INSERT: bucket_id = 'chantier-photos' AND (storage.foldername(name))[1] = auth.uid()::text

-- Policy: Users can view their own files
-- SELECT: bucket_id = 'chantier-photos' AND (storage.foldername(name))[1] = auth.uid()::text

-- Policy: Users can delete their own files
-- DELETE: bucket_id = 'chantier-photos' AND (storage.foldername(name))[1] = auth.uid()::text

-- ============================================================================
-- REALTIME POLICIES
-- Enable realtime for tables that need it
-- ============================================================================

-- Grant realtime access for authenticated users (filtered by RLS)
ALTER PUBLICATION supabase_realtime ADD TABLE devis;
ALTER PUBLICATION supabase_realtime ADD TABLE chantiers;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;

-- ============================================================================
-- SECURITY VERIFICATION QUERIES
-- Run these to verify RLS is working correctly
-- ============================================================================

/*
-- 1. Verify RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. List all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Test data isolation (run as different users)
-- This should return 0 rows for any user trying to access another user's data
SELECT * FROM clients WHERE user_id != auth.uid();

-- 4. Verify no bypass
-- This query should fail or return empty for non-service role
SET ROLE authenticated;
SELECT * FROM clients;  -- Should only show current user's clients
RESET ROLE;
*/

-- ============================================================================
-- IMPORTANT SECURITY NOTES
-- ============================================================================
--
-- 1. ALWAYS ensure user_id column exists on all tables
-- 2. NEVER use service role key in client-side code
-- 3. Verify RLS is enabled: SELECT relrowsecurity FROM pg_class WHERE relname = 'table_name';
-- 4. Test policies with different users before deploying
-- 5. Monitor for policy violations in Supabase logs
--
-- POTENTIAL VULNERABILITIES TO WATCH:
-- - Ensure client_id in devis/chantiers references a client owned by the same user
-- - Ensure chantier_id in photos/depenses references a chantier owned by the same user
-- - Consider adding foreign key constraints with user_id checks
--
-- ============================================================================
