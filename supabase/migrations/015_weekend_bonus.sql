-- 015_weekend_bonus.sql
-- Weekend Deposit Bonus Settings
INSERT INTO settings (key, value)
VALUES
  ('weekend_bonus_enabled', 'false'),
  ('weekend_bonus_days',    '[0,6]'),
  ('weekend_bonus_pct',     '10')
ON CONFLICT (key) DO NOTHING;
