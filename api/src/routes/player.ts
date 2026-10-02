import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

router.get('/profile', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { data } = await supabase.from('users').select('*').eq('telegram_id', req.telegramUser!.id.toString()).single();
  if (!data) { res.status(404).json({ error: 'Player not found' }); return; }
  res.json({ player: data });
});

router.get('/history', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { data } = await supabase
    .from('room_players')
    .select('has_bingo, joined_at, rooms(code, status, created_at)')
    .eq('telegram_id', req.telegramUser!.id.toString())
    .order('joined_at', { ascending: false })
    .limit(10);
  res.json({ history: data || [] });
});

export default router;
