-- ============================================================
-- Migration 055: Add reply_to_id to chat_messages + populate member names
-- ============================================================

-- 1. Add reply_to_id column (enables replies and threads)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL;

-- 2. Add missing columns to chat_messages (if not present from initial migration)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_avatar TEXT;

-- 3. Populate chat_members with user info from auth.users
-- Handles both nested JSON (raw_user_meta_data.nom = {nom, prenom}) and simple string formats
UPDATE chat_members cm
SET user_name = CASE
  WHEN jsonb_typeof(u.raw_user_meta_data->'nom') = 'object' THEN
    TRIM(COALESCE(u.raw_user_meta_data->'nom'->>'prenom', '') || ' ' || COALESCE(u.raw_user_meta_data->'nom'->>'nom', ''))
  WHEN (u.raw_user_meta_data->>'nom') IS NOT NULL THEN
    TRIM(COALESCE(u.raw_user_meta_data->>'prenom', '') || ' ' || COALESCE(u.raw_user_meta_data->>'nom', ''))
  ELSE split_part(u.email, '@', 1)
END,
user_email = u.email
FROM auth.users u
WHERE cm.user_id = u.id;

-- 3. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
