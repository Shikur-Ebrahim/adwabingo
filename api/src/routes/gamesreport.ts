import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();
router.use(validateTelegramAuth);

// GET /api/games-report
// Returns the current user's full bingo game history with stats
router.get('/', async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Games this user joined
  const { data: playerRows } = await supabase
    .from('bingo_players')
    .select('game_id, cartela_number, joined_at')
    .eq('telegram_id', telegramId)
    .order('joined_at', { ascending: false });

  if (!playerRows || playerRows.length === 0) {
    res.json({ games: [], stats: { total: 0, wins: 0, total_wagered: 0, total_won: 0 }, has_more: false });
    return;
  }

  const gameIds = playerRows.map((r: any) => r.game_id);

  // Fetch game details for those IDs
  const { data: games } = await supabase
    .from('bingo_games')
    .select('id, stake, status, prize_pool, winner_telegram_id, winner_first_name, winner_prize, called_numbers, start_at, finished_at, created_at')
    .in('id', gameIds)
    .order('created_at', { ascending: false });

  if (!games) { res.json({ games: [], stats: { total: 0, wins: 0, total_wagered: 0, total_won: 0 }, has_more: false }); return; }

  // Merge player row info into game
  const playerMap: Record<string, any> = {};
  for (const r of playerRows) playerMap[r.game_id] = r;

  // Compute stats (all time, not paginated)
  let totalWins = 0, totalWagered = 0, totalWon = 0;
  for (const g of games) {
    const isWinner = g.winner_telegram_id === telegramId;
    if (isWinner) { totalWins++; totalWon += g.winner_prize || 0; }
    if (g.status === 'finished' || g.status === 'calling' || g.status === 'waiting') {
      totalWagered += g.stake || 0;
    }
  }

  // Paginate
  const paginated = games.slice(offset, offset + limit);
  const enriched = paginated.map((g: any) => {
    const pr = playerMap[g.id];
    const isWinner = g.winner_telegram_id === telegramId;
    return {
      game_id: g.id,
      stake: g.stake,
      status: g.status,
      prize_pool: g.prize_pool,
      cartela_number: pr?.cartela_number,
      joined_at: pr?.joined_at,
      finished_at: g.finished_at,
      start_at: g.start_at,
      is_winner: isWinner,
      winner_name: g.winner_first_name,
      winner_prize: g.winner_prize,
      total_calls: (g.called_numbers || []).length,
    };
  });

  res.json({
    games: enriched,
    stats: {
      total: games.length,
      wins: totalWins,
      total_wagered: totalWagered,
      total_won: totalWon,
      win_rate: games.length > 0 ? Math.round((totalWins / games.filter((g:any) => g.status === 'finished').length) * 100) : 0,
    },
    has_more: offset + limit < games.length,
    page,
  });
});

export default router;
