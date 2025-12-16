-- Migration: add index to speed up transaction queries by user and date
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);

-- Additionally consider an index on created_at if you query/order by it frequently
CREATE INDEX IF NOT EXISTS idx_transactions_user_created_at ON transactions (user_id, created_at DESC);
