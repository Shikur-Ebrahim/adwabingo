import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();
router.use(validateTelegramAuth);

// Default fallback settings
export const DEFAULT_SETTINGS = {
  call_interval_ms:  5000,
  waiting_period_s:  60,
  min_players:       2,
  max_players:       150,
  prize_percent:     80,   // % of total stakes (for 3+ players)
};

// Cache so BingoEngine doesn't hammer DB every tick
let _cached: typeof DEFAULT_SETTINGS | null = null;
let _cachedAt = 0;
const CACHE_TTL = 10_000; // 10 seconds

export async function getSettings(): Promise<typeof DEFAULT_SETTINGS> {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL) return _cached;
  const { data } = await supabase.from('game_settings').select('*').limit(1).maybeSingle();
  if (data) {
    _cached = {
      call_interval_ms: data.call_interval_ms ?? DEFAULT_SETTINGS.call_interval_ms,
      waiting_period_s: data.waiting_period_s ?? DEFAULT_SETTINGS.waiting_period_s,
      min_players:      data.min_players      ?? DEFAULT_SETTINGS.min_players,
      max_players:      data.max_players      ?? DEFAULT_SETTINGS.max_players,
      prize_percent:    data.prize_percent     ?? DEFAULT_SETTINGS.prize_percent,
    };
  } else {
    _cached = { ...DEFAULT_SETTINGS };
  }
  _cachedAt = Date.now();
  return _cached!;
}

export function invalidateSettingsCache() { _cached = null; }

// Helper: check if requester is admin via DB
async function isAdmin(telegramId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();
  return data?.role === 'admin';
}

// GET /api/admin/settings
router.get('/', async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Forbidden' });
  const s = await getSettings();
  res.json(s);
});

// PUT /api/admin/settings
router.put('/', async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Forbidden' });

  const { call_interval_ms, waiting_period_s, min_players, max_players, prize_percent } = req.body;

  // Validate ranges
  const ci  = Math.max(1000,  Math.min(30000, Number(call_interval_ms)  || DEFAULT_SETTINGS.call_interval_ms));
  const wp  = Math.max(10,    Math.min(3600,  Number(waiting_period_s)  || DEFAULT_SETTINGS.waiting_period_s));
  const mnp = Math.max(2,     Math.min(50,    Number(min_players)       || DEFAULT_SETTINGS.min_players));
  const mxp = Math.max(10,    Math.min(500,   Number(max_players)       || DEFAULT_SETTINGS.max_players));
  const pp  = Math.max(50,    Math.min(100,   Number(prize_percent)     || DEFAULT_SETTINGS.prize_percent));

  const payload = {
    call_interval_ms: ci,
    waiting_period_s: wp,
    min_players:      mnp,
    max_players:      mxp,
    prize_percent:    pp,
    updated_at:       new Date().toISOString(),
  };

  // Try UPDATE first, INSERT if no row exists
  const { data: existing } = await supabase.from('game_settings').select('id').eq('id', 1).maybeSingle();

  let error;
  if (existing) {
    ({ error } = await supabase.from('game_settings').update(payload).eq('id', 1));
  } else {
    ({ error } = await supabase.from('game_settings').insert({ id: 1, ...payload }));
  }

  if (error) return res.status(500).json({ error: error.message });

  invalidateSettingsCache();
  res.json({ ok: true, settings: { ...payload } });
});

export default router;
