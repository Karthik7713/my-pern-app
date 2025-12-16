-- Migration: Add `user_userid` column to `book_members` and copy values from legacy `user_id`.
-- Safe / idempotent: can be run multiple times without harming existing data.

BEGIN;

-- 1) Add the new column if it doesn't exist.
ALTER TABLE IF EXISTS book_members
  ADD COLUMN IF NOT EXISTS user_userid VARCHAR(128);

-- 2) Populate `user_userid` from existing `user_id` where empty/null.
-- Use a conservative update: only copy where `user_userid` is NULL or empty.
UPDATE book_members
SET user_userid = user_id::text
WHERE (user_userid IS NULL OR user_userid = '')
  AND (user_id IS NOT NULL);

-- 3) Create unique index on (book_id, user_userid) if not exists. Note: If there are duplicates
-- when casting user_id to text this will fail; address duplicates manually before adding unique constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'ux_book_members_bookid_user_userid'
  ) THEN
    CREATE UNIQUE INDEX ux_book_members_bookid_user_userid ON book_members(book_id, user_userid);
  END IF;
END$$;

-- 4) Add helpful index on user_userid for lookups (non-unique)
CREATE INDEX IF NOT EXISTS idx_book_members_user_userid ON book_members(user_userid);

COMMIT;

-- Down / rollback (manual): uncomment and run if you need to revert.
-- BEGIN;
-- DROP INDEX IF EXISTS idx_book_members_user_userid;
-- DROP INDEX IF EXISTS ux_book_members_bookid_user_userid;
-- ALTER TABLE IF EXISTS book_members DROP COLUMN IF EXISTS user_userid;
-- COMMIT;

-- Notes:
-- - If the DB already contains duplicate (book_id, user_id) pairs after casting to text then the
--   unique index step will fail. In that case run a query to detect duplicates and resolve them first:
--     SELECT book_id, user_id::text AS uid, COUNT(*) FROM book_members GROUP BY book_id, uid HAVING COUNT(*) > 1;
-- - After running this migration across all environments and verifying the app using `user_userid`,
--   you may consider cleaning up the legacy `user_id` column.
