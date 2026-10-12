-- Welcome Bonus Settings and Default Migration
-- 1. Insert default welcome bonus setting into settings table (10 ETB)
INSERT INTO settings (key, value, label, description)
VALUES ('welcome_bonus_amount', '10', 'Welcome / Signup Bonus', 'Default bonus balance (ETB) granted to new users upon registration.')
ON CONFLICT (key) DO NOTHING;

-- 2. Set default value for bonus_balance column on users table to 10
ALTER TABLE users ALTER COLUMN bonus_balance SET DEFAULT 10;
