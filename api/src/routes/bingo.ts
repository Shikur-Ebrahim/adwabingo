import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { generateBingoCard } from '../services/BingoEngine';

const router = Router();

// ── GET /api/bingo/current ──────────────────────────────────────────────────
// Returns current game state + taken cartela list + caller's card (if joined)
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

// ── POST /api/bingo/join ────────────────────────────────────────────────────
// Buy a cartela seat. Deducts stake, generates 5×5 card server-side.
router.post('/join', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const { cartela_number } = req.body;
  const seat = Number(cartela_number);

  if (!seat || seat < 1 || seat > 150) {
    res.status(400).json({ error: 'Pick a cartela between 1 and 150' }); return;
  }

  // Also, allow specifying a stake room
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

  // Already in this game?
  const { data: existing } = await supabase
    .from('bingo_players')
    .select('id')
    .eq('game_id', game.id)
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (existing) { res.status(400).json({ error: 'You already joined this game' }); return; }

  // Check & deduct balance
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
    // Refund
    await supabase.from('users').update({ main_balance: mainBal, bonus_balance: bonusBal }).eq('telegram_id', telegramId);
    res.status(400).json({ error: 'Seat taken or error' }); return;
  }

  // Calculate prize pool dynamically in Node.js (no RPC needed)
  const { count } = await supabase.from('bingo_players').select('*', { count: 'exact', head: true }).eq('game_id', game.id);
  const playersCount = count || 1;
  
  // 0% commission for 1-2 players, 20% commission for 3+ players
  const prizePool = playersCount < 3 
    ? playersCount * stakeAmt 
    : playersCount * stakeAmt * 0.8;

  let newStartAt = game.start_at;
  // TRIGGER 60s COUNTDOWN IF FIRST PLAYER
  if (new Date(game.start_at).getTime() > Date.now() + 86400000) {
    newStartAt = new Date(Date.now() + 60_000).toISOString();
  }

  await supabase.from('bingo_games').update({
    prize_pool: prizePool,
    start_at: newStartAt,
    updated_at: new Date().toISOString()
  }).eq('id', game.id);

  res.json({ success: true, cartela_number: seat, card_matrix });
});

export default router;
