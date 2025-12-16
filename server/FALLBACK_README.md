Runtime fallbacks for `book_members` column
===========================================

Background
----------
The app was updated to introduce a `book_members.user_userid` column in the intended schema. Some existing developer databases (including the one used during development) still have a legacy `book_members.user_id` column. Running the new migration against those DBs would fail because the expected column name is missing.

What we did
-----------
- Server queries that reference `book_members` now attempt the newer `user_userid` column first and fall back to `user_id` when the newer column is absent. This avoids 500 errors in development and allows the feature to work without forcing an immediate DB migration.

Next steps (recommended cleanup)
--------------------------------
1. Prepare and run a migration in the target environment to add `user_userid` and copy values from `user_id` (safe, idempotent). Example steps:
   - ALTER TABLE book_members ADD COLUMN IF NOT EXISTS user_userid VARCHAR(128);
   - UPDATE book_members SET user_userid = user_id::text WHERE user_userid IS NULL AND user_id IS NOT NULL;
   - Add UNIQUE/index constraints as required.
   - (Optional) Drop `user_id` only after verifying the app and all environments use `user_userid`.
2. After migration completes across environments, remove the runtime fallback logic to simplify queries.

If you want, I can prepare the exact migration SQL and a rollback plan for you to run against the database.

File created: server/FALLBACK_README.md
