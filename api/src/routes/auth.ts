import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

router.post('/verify', validateTelegramAuth, async (req: AuthRequest, res) => {
  const user = req.telegramUser!;
  
  // Check if user exists and is inactive
  const { data: existing } = await supabase.from('users').select('status').eq('telegram_id', user.id.toString()).single();
  if (existing && existing.status === 'inactive') {
    res.status(403).json({ error: 'Your account has been deactivated.' });
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .upsert({ telegram_id: user.id.toString(), username: user.username || user.first_name, first_name: user.first_name }, { onConflict: 'telegram_id' })
    .select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ user: data });
});

export default router;
