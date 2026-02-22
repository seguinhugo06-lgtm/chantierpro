-- ============================================================================
-- 033: Server-side account deletion RPC
-- LEGAL-002: RGPD right to erasure — delete all user data from Supabase
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
BEGIN
  -- Get the calling user's ID from the JWT
  uid := auth.uid();

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete in dependency order (children before parents)
  -- 1. Delete planning events
  DELETE FROM planning_events WHERE user_id = uid;

  -- 2. Delete memos
  DELETE FROM memos WHERE user_id = uid;

  -- 3. Delete stock movements (if table exists)
  BEGIN
    EXECUTE 'DELETE FROM stock_mouvements WHERE user_id = $1' USING uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 4. Delete catalogue articles
  DELETE FROM articles WHERE user_id = uid;

  -- 5. Delete echanges/communications
  BEGIN
    EXECUTE 'DELETE FROM echanges WHERE user_id = $1' USING uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 6. Delete depenses
  BEGIN
    EXECUTE 'DELETE FROM depenses WHERE user_id = $1' USING uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 7. Delete devis/factures (depends on clients + chantiers)
  DELETE FROM devis WHERE user_id = uid;

  -- 8. Delete chantiers (depends on clients)
  DELETE FROM chantiers WHERE user_id = uid;

  -- 9. Delete clients
  DELETE FROM clients WHERE user_id = uid;

  -- 10. Delete entreprise settings
  DELETE FROM entreprise WHERE user_id = uid;

  -- 11. Delete subscriptions
  BEGIN
    EXECUTE 'DELETE FROM subscriptions WHERE user_id = $1' USING uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 12. Delete equipe members
  BEGIN
    EXECUTE 'DELETE FROM equipe WHERE user_id = $1' USING uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 13. Delete events log
  BEGIN
    EXECUTE 'DELETE FROM events_log WHERE user_id = $1' USING uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 14. Delete offline pending mutations
  BEGIN
    EXECUTE 'DELETE FROM pending_mutations WHERE user_id = $1' USING uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Log the deletion for audit (optional — RGPD requires proof of deletion)
  RAISE NOTICE 'All data deleted for user %', uid;
END;
$$;

-- Grant execute to authenticated users (they can only delete their own data via auth.uid())
GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;
