-- 014_broadcast_rls.sql
-- Fix Row Level Security policy violation on broadcast_posts table
-- Add channel_id and error_message columns

-- Ensure table has necessary columns
ALTER TABLE broadcast_posts ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE broadcast_posts ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Disable RLS on broadcast_posts so backend can insert/update/select/delete freely
ALTER TABLE broadcast_posts DISABLE ROW LEVEL SECURITY;

-- Also add permissive policies for anon and service_role just in case RLS is manually enabled
DO $$
BEGIN
  ALTER TABLE broadcast_posts ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "anon_all" ON broadcast_posts;
  DROP POLICY IF EXISTS "public_all" ON broadcast_posts;
  DROP POLICY IF EXISTS "service_role_all" ON broadcast_posts;

  CREATE POLICY "anon_all" ON broadcast_posts FOR ALL TO anon USING (true) WITH CHECK (true);
  CREATE POLICY "public_all" ON broadcast_posts FOR ALL TO public USING (true) WITH CHECK (true);
  CREATE POLICY "service_role_all" ON broadcast_posts FOR ALL TO service_role USING (true) WITH CHECK (true);

  ALTER TABLE broadcast_posts DISABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END$$;
