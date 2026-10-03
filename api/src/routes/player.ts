import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

router.get('/profile', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { data } = await supabase.from('users').select('*').eq('telegram_id', req.telegramUser!.id.toString()).single();
  if (!data) { res.status(404).json({ error: 'Player not found' }); return; }
  res.json({ player: data });
});
// Fetch a support contact (worker first, fallback to admin)
router.get('/support-contact', validateTelegramAuth, async (req: AuthRequest, res) => {
  // Try to find a worker
  let { data } = await supabase
    .from('users')
    .select('username')
    .eq('role', 'worker')
    .not('username', 'is', null)
    .limit(1)
    .single();

  // If no worker, fallback to admin
  if (!data) {
    const adminRes = await supabase
      .from('users')
      .select('username')
      .eq('role', 'admin')
      .not('username', 'is', null)
      .limit(1)
      .single();
    data = adminRes.data;
  }

  res.json({ username: data?.username || null });
});

export default router;
