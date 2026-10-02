import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

router.post('/verify', validateTelegramAuth, async (req: AuthRequest, res) => {
  const user = req.telegramUser!;
  const { data, error } = await supabase
    .from('users')
    .upsert({ telegram_id: user.id.toString(), username: user.username || user.first_name, first_name: user.first_name, last_name: user.last_name }, { onConflict: 'telegram_id' })
    .select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ user: data });
});

export default router;
