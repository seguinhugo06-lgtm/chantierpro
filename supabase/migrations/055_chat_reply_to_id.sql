-- ============================================================
-- Migration 055: Add reply_to_id to chat_messages + populate member names
-- ============================================================

-- 1. Add reply_to_id column (enables replies and threads)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL;

-- 2. Populate chat_members with user info from auth.users
UPDATE chat_members cm
SET
  user_name = COALESCE(u.raw_user_meta_data->>'nom', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  user_email = u.email
FROM auth.users u
WHERE cm.user_id = u.id
AND (cm.user_name IS NULL OR cm.user_name = '');

-- 3. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
