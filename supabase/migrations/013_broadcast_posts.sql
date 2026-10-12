-- 013_broadcast_posts.sql
-- Admin broadcast posts system: image+text posts sent to all users and/or channel via Telegram bot

CREATE TABLE IF NOT EXISTS broadcast_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL,
  image_url     TEXT,           -- Cloudflare R2 public URL (optional)
  image_key     TEXT,           -- R2 object key for deletion
  send_to       TEXT NOT NULL DEFAULT 'bot',  -- 'bot' | 'channel' | 'both'
  status        TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduled_at  TIMESTAMPTZ,    -- NULL = send immediately on publish
  sent_at       TIMESTAMPTZ,    -- when actually sent
  sent_count    INT DEFAULT 0,  -- how many users received it
  failed_count  INT DEFAULT 0,
  created_by    TEXT NOT NULL,  -- telegram_id of admin
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for scheduler to pick up pending scheduled posts
CREATE INDEX IF NOT EXISTS idx_broadcast_posts_status ON broadcast_posts(status, scheduled_at);
