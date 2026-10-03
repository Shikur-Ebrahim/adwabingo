-- Settings table for global application config (e.g., bonus percentages)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if they don't exist
INSERT INTO settings (key, value, label, description)
VALUES 
  ('first_deposit_bonus_pct', '20', 'First Deposit Bonus', 'Bonus % added to depositor''s bonus balance on their very first approved deposit.'),
  ('invitation_reward_pct', '10', 'Invitation Reward', 'Bonus % added to the inviter''s bonus balance when their invited friend makes a first deposit.')
ON CONFLICT (key) DO NOTHING;
