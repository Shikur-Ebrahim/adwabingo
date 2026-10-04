import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { generateBingoCard } from '../services/BingoEngine';

const router = Router();

// ── GET /api/bingo/current ────────────────────────────────────────────────────
// Returns current game state + taken cartela list + caller's card (if joined)
router.get('/current', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();

  const { data: game } = await supabase
    .from('bingo_games')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!game) { res.json({ game: null, taken_cartelas: [], my_card: null }); return; }

  const { data: rows } = await supabase
    .from('bingo_players')
    .select('cartela_number, telegram_id, card_matrix')
    .eq('game_id', game.id);

  const taken_cartelas = (rows || []).map((p: any) => Number(p.cartela_number));
  const mine = (rows || []).find((p: any) => p.telegram_id === telegramId);
  const my_card = mine
    ? { cartela_number: mine.cartela_number, card_matrix: mine.card_matrix }
    : null;

  res.json({ game, taken_cartelas, my_card });
});

// ── POST /api/bingo/join ──────────────────────────────────────────────────────
// Buy a cartela seat. Deducts stake, generates 5×5 card server-side.
router.post('/join', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const { cartela_number } = req.body;
  const seat = Number(cartela_number);

  if (!seat || seat < 1 || seat > 150) {
    res.status(400).json({ error: 'Pick a cartela between 1 and 150' }); return;
  }

  // Must be a 'waiting' game
  const { data: game } = await supabase
    .from('bingo_games')
    .select('id, game_id, stake, status')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!game) {
    res.status(400).json({ error: 'No game accepting players right now. Wait for the next one.' }); return;
  }

  // Already in this game?
  const { data: existing } = await supabase
    .from('bingo_players')
    .select('id')
    .eq('game_id', game.id)
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (existing) { res.status(400).json({ error: 'You already joined this game' }); return; }

  // Check & deduct balance
  const { data: user } = await supabase.from('users').select('main_balance, first_name').eq('telegram_id', telegramId).single();
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (Number(user.main_balance) < Number(game.stake)) {
    res.status(400).json({ error: `Insufficient balance — need ${game.stake} ETB` }); return;
  }

  const { error: deductErr } = await supabase
    .from('users')
    .update({ main_balance: Number(user.main_balance) - Number(game.stake) })
    .eq('telegram_id', telegramId)
    .gte('main_balance', Number(game.stake));

  if (deductErr) { res.status(400).json({ error: 'Payment failed — please try again' }); return; }

  // Generate card server-side
  const card_matrix = generateBingoCard();

  // Insert player row
  const { error: insertErr } = await supabase.from('bingo_players').insert({
    game_id: game.id,
    telegram_id: telegramId,
    first_name: user.first_name || 'User',
    cartela_number: seat,
    card_matrix,
  });

  if (insertErr) {
    // Refund on duplicate seat
    await supabase.from('users').update({ main_balance: Number(user.main_balance) }).eq('telegram_id', telegramId);
    res.status(400).json({ error: 'That cartela was just taken — pick another!' }); return;
  }

  // Add 80 % of stake to prize pool atomically
  await supabase.rpc('bingo_add_to_prize', { p_game_id: game.id, p_amount: Number(game.stake) * 0.8 });

  res.json({ success: true, cartela_number: seat, card_matrix });
});

export default router;
