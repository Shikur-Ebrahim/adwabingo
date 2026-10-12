-- 013_broadcast_posts.sql (updated to support image and video)
-- Admin broadcast posts system

CREATE TABLE IF NOT EXISTS broadcast_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL,
  media_url     TEXT,           -- Cloudflare R2 public URL (image or video)
  media_key     TEXT,           -- R2 object key for deletion
  media_type    TEXT,           -- 'image' | 'video' | null
  send_to       TEXT NOT NULL DEFAULT 'bot',  -- 'bot' | 'channel' | 'both'
  status        TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduled_at  TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  sent_count    INT DEFAULT 0,
  failed_count  INT DEFAULT 0,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists from a previous migration, add missing columns
ALTER TABLE broadcast_posts ADD COLUMN IF NOT EXISTS media_url   TEXT;
ALTER TABLE broadcast_posts ADD COLUMN IF NOT EXISTS media_key   TEXT;
ALTER TABLE broadcast_posts ADD COLUMN IF NOT EXISTS media_type  TEXT;

-- Rename old columns if they exist (safe to run even if already renamed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='broadcast_posts' AND column_name='image_url') THEN
    ALTER TABLE broadcast_posts RENAME COLUMN image_url TO media_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='broadcast_posts' AND column_name='image_key') THEN
    ALTER TABLE broadcast_posts RENAME COLUMN image_key TO media_key;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_broadcast_posts_status ON broadcast_posts(status, scheduled_at);
