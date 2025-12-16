-- Migration: create books and book_members tables, add book_id to transactions
-- Date: 2025-12-09

BEGIN;

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_userid VARCHAR(128) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_owner ON books(owner_userid);

-- Create book_members table (ACL)
CREATE TABLE IF NOT EXISTS book_members (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_userid VARCHAR(128) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'MEMBER', -- OWNER | MEMBER
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_book_user_unique ON book_members(book_id, user_userid);

-- Add book_id to transactions (if not already present)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS book_id INTEGER REFERENCES books(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_book ON transactions(book_id);

COMMIT;
