import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { generateBingoCard } from '../services/BingoEngine';
import { getSettings } from './adminSettings';

const router = Router();

// ── GET /api/bingo/current ──────────────────────────────────────────────────
router.get('/current', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const stake = Number(req.query.stake) || 10;

  const { data: game } = await supabase
    .from('bingo_games')
    .select('*')
    .eq('stake', stake)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!game) { res.json({ game: null, taken_cartelas: [], my_card: null, my_cartelas: [], max_players: 150, max_cartelas_per_user: 2 }); return; }

  const { data: rows } = await supabase
    .from('bingo_players')
    .select('cartela_number, telegram_id, card_matrix')
    .eq('game_id', game.id);

  const taken_cartelas = (rows || []).map((p: any) => Number(p.cartela_number));
  const unique_players = new Set((rows || []).map((p: any) => p.telegram_id)).size;
  
  const myRows = (rows || []).filter((p: any) => p.telegram_id === telegramId);
  const my_cartelas = myRows.map((p: any) => ({ cartela_number: p.cartela_number, card_matrix: p.card_matrix }));
  // Backward compat: my_card = first cartela
  const my_card = my_cartelas.length > 0 ? my_cartelas[0] : null;

  const cfg = await getSettings();
  res.json({ game, taken_cartelas, unique_players, my_card, my_cartelas, max_players: cfg.max_players, max_cartelas_per_user: cfg.max_cartelas_per_user });
});

// ── POST /api/bingo/join ────────────────────────────────────────────────────
router.post('/join', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const { cartela_number } = req.body;
  const seat = Number(cartela_number);
  const cfg = await getSettings();

  if (!seat || seat < 1 || seat > cfg.max_players) {
    res.status(400).json({ error: `Pick a cartela between 1 and ${cfg.max_players}` }); return;
  }

  const requestedStake = req.body.stake || 10;

  let query = supabase
    .from('bingo_games')
    .select('id, game_id, stake, status, start_at')
    .eq('status', 'waiting')
    .eq('stake', Number(requestedStake))
    .order('created_at', { ascending: false });
  
  const { data: gamesData } = await query.limit(1);
  const game = gamesData?.[0];

  if (!game) {
    res.status(400).json({ error: 'No game accepting players for this stake right now.' }); return;
  }

  const { data: existing } = await supabase
    .from('bingo_players')
    .select('id')
    .eq('game_id', game.id)
    .eq('telegram_id', telegramId);
  const existingCount = existing?.length || 0;
  if (existingCount >= cfg.max_cartelas_per_user) {
    res.status(400).json({ error: `You can only pick ${cfg.max_cartelas_per_user} cartela${cfg.max_cartelas_per_user > 1 ? 's' : ''} per game` }); return;
  }

  const { data: user } = await supabase.from('users').select('main_balance, bonus_balance, first_name').eq('telegram_id', telegramId).single();
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  
  const stakeAmt = Number(game.stake);
  const mainBal = Number(user.main_balance || 0);
  const bonusBal = Number(user.bonus_balance || 0);
  
  if (mainBal + bonusBal < stakeAmt) {
    res.status(400).json({ error: `Insufficient balance — need ${stakeAmt} ETB` }); return;
  }

  let toDeduct = stakeAmt;
  let newBonus = bonusBal;
  let newMain = mainBal;

  if (newBonus >= toDeduct) {
    newBonus -= toDeduct;
    toDeduct = 0;
  } else {
    toDeduct -= newBonus;
    newBonus = 0;
    newMain -= toDeduct;
  }

  const { error: deductErr } = await supabase
    .from('users')
    .update({ main_balance: newMain, bonus_balance: newBonus })
    .eq('telegram_id', telegramId);

  if (deductErr) { res.status(400).json({ error: 'Payment failed — please try again' }); return; }

  const card_matrix = generateBingoCard();

  const { error: insertErr } = await supabase.from('bingo_players').insert({
    game_id: game.id,
    telegram_id: telegramId,
    first_name: user.first_name || 'User',
    cartela_number: seat,
    card_matrix,
  });

  if (insertErr) {
    await supabase.from('users').update({ main_balance: mainBal, bonus_balance: bonusBal }).eq('telegram_id', telegramId);
    res.status(400).json({ error: `Insert error: ${insertErr.message}` }); return;
  }

  const { count } = await supabase.from('bingo_players').select('*', { count: 'exact', head: true }).eq('game_id', game.id);
  const playersCount = count || 1;
  
  // Use dynamic prize_percent from settings (0% commission for <3 players, dynamic% for 3+)
  const prizePool = playersCount < 3
    ? playersCount * stakeAmt
    : Math.floor(playersCount * stakeAmt * cfg.prize_percent / 100);

  const { data: pRows } = await supabase.from('bingo_players').select('telegram_id').eq('game_id', game.id);
  const unique_players = new Set((pRows || []).map(r => r.telegram_id)).size;

  let newStartAt = game.start_at;
  // Trigger countdown from settings waiting_period_s when first player joins
  if (new Date(game.start_at).getTime() > Date.now() + 86400000) {
    newStartAt = new Date(Date.now() + cfg.waiting_period_s * 1000).toISOString();
  }

  await supabase.from('bingo_games').update({
    prize_pool: prizePool,
    start_at: newStartAt,
    updated_at: new Date().toISOString()
  }).eq('id', game.id);

  res.json({ success: true, cartela_number: seat, card_matrix, unique_players });
});

router.get('/card', validateTelegramAuth, async (req, res) => {
  const { game_id, cartela } = req.query;
  const { data } = await supabase.from('bingo_players').select('card_matrix').eq('game_id', game_id).eq('cartela_number', cartela).maybeSingle();
  res.json({ matrix: data?.card_matrix || null });
});
router.get('/tts', async (req, res) => {
  try {
    const text = req.query.text;
    if (!text) { res.status(400).send('No text'); return; }
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=am&client=tw-ob&q=' + encodeURIComponent(String(text));
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!r.ok) throw new Error('TTS failed');
    const buffer = await r.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=864000');
    res.send(Buffer.from(buffer));
  } catch (e) {
    console.error('[TTS Proxy Error]', e);
    res.status(500).send('Error');
  }
});
export default router;
