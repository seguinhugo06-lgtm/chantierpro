-- ============================================================================
-- 032: Enforce NOT NULL on devis.client_id
-- BUG-001: Prevent ghost devis without client
-- ============================================================================

-- Step 1: Remove ghost devis (brouillon without client)
DELETE FROM devis
WHERE client_id IS NULL
  AND statut = 'brouillon';

-- Step 2: For any remaining devis with NULL client_id (non-brouillon),
-- we archive them rather than delete to preserve data
UPDATE devis
SET statut = 'annule',
    notes = COALESCE(notes, '') || E'\n[Auto] Archivé: client_id manquant (migration 032)'
WHERE client_id IS NULL
  AND statut != 'brouillon';

-- Step 3: Now safe to add NOT NULL constraint
-- Use a DO block to be idempotent
DO $$
BEGIN
  -- Verify no NULLs remain
  IF EXISTS (SELECT 1 FROM devis WHERE client_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot add NOT NULL: devis with NULL client_id still exist';
  END IF;

  -- Add NOT NULL constraint if not already set
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis'
      AND column_name = 'client_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE devis ALTER COLUMN client_id SET NOT NULL;
    RAISE NOTICE 'NOT NULL constraint added to devis.client_id';
  ELSE
    RAISE NOTICE 'devis.client_id already NOT NULL, skipping';
  END IF;
END $$;

-- Step 4: Keep ON DELETE SET NULL behavior but with a trigger to archive
-- When a client is deleted, archive their devis instead of nullifying
CREATE OR REPLACE FUNCTION archive_devis_on_client_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devis
  SET statut = 'annule',
      notes = COALESCE(notes, '') || E'\n[Auto] Client supprimé le ' || NOW()::date
  WHERE client_id = OLD.id
    AND statut NOT IN ('annule', 'refuse');
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_archive_devis_on_client_delete ON clients;
CREATE TRIGGER trg_archive_devis_on_client_delete
  BEFORE DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION archive_devis_on_client_delete();

-- Now change from SET NULL to RESTRICT (client can't be deleted while active devis exist)
-- First drop the old FK, then re-add with proper behavior
ALTER TABLE devis DROP CONSTRAINT IF EXISTS devis_client_id_fkey;
ALTER TABLE devis
  ADD CONSTRAINT devis_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id)
  ON DELETE RESTRICT;
