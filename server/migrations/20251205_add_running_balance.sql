-- Migration: add running_balance column to transactions for historical balances
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS running_balance numeric(12,2);

-- NOTE: After running this migration, existing rows will have NULL running_balance.
-- You may want to backfill running balances with a script if desired.
