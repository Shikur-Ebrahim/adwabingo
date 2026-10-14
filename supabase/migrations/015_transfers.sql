-- 015_transfers.sql
-- Table to track player-to-player balance transfers

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_telegram_id TEXT NOT NULL,
  sender_username TEXT,
  sender_name TEXT,
  recipient_telegram_id TEXT NOT NULL,
  recipient_username TEXT,
  recipient_name TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfers_sender ON transfers (sender_telegram_id);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON transfers (recipient_telegram_id);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers (created_at DESC);
