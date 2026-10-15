import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();
router.use(validateTelegramAuth);

// GET /api/leaderboard/players?period=all|daily|weekly|monthly
router.get('/players', async (req: AuthRequest, res) => {
  const period = (req.query.period as string) || 'all';
  const telegramId = req.telegramUser!.id.toString();

  // Build date filter using UTC so server timezone doesn't skew results
  let fromDate: string | null = null;
  const now = new Date();
  if (period === 'daily') {
    // Today only: from today's midnight UTC
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    fromDate = d.toISOString();
  } else if (period === 'weekly') {
    // Last 7 days including today: from midnight of (today - 6 days) UTC
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - 6);
    fromDate = d.toISOString();
  } else if (period === 'monthly') {
    // Last 30 days including today: from midnight of (today - 29 days) UTC
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - 29);
    fromDate = d.toISOString();
  }

  let topPlayers: any[] = [];

  if (period === 'all') {
    // Use aggregated total_wins column from users table (always accurate)
    const { data } = await supabase
      .from('users')
      .select('telegram_id, first_name, username, total_wins')
      .gt('total_wins', 0)
      .order('total_wins', { ascending: false })
      .limit(50);
    topPlayers = (data || []).map((u, i) => ({
      rank: i + 1,
      telegram_id: u.telegram_id,
      first_name: u.first_name || 'User',
      username: u.username || '',
      wins: u.total_wins || 0,
      games: 0,
    }));
  } else {
    // Step 1: Get all finished games in the period (no null filter — we handle below)
    let q = supabase
      .from('bingo_games')
      .select('id, winner_telegram_id, winner_first_name, winner_prize, finished_at')
      .eq('status', 'finished');
    if (fromDate) q = q.gte('finished_at', fromDate);
    const { data: games } = await q;

    // Step 2: Count wins per player from winner_telegram_id
    // Handles single winner and 2-way tie (winner1 stored in winner_telegram_id)
    const map: Record<string, { wins: number; total_prize: number }> = {};
    const tieGameIds: string[] = [];

    for (const g of games || []) {
      if (!g.winner_telegram_id) continue; // skip rematch/ghost games
      if (!map[g.winner_telegram_id]) {
        map[g.winner_telegram_id] = { wins: 0, total_prize: 0 };
      }
      map[g.winner_telegram_id].wins++;
      map[g.winner_telegram_id].total_prize += g.winner_prize || 0;

      // Track 2-way tie games (winner_first_name contains " & ")
      if (g.winner_first_name && g.winner_first_name.includes(' & ')) {
        tieGameIds.push(g.id);
      }
    }

    // Step 3: For 2-way tie games, also count the second winner via bingo_players
    // BingoEngine only stores winner1 in winner_telegram_id for ties
    if (tieGameIds.length > 0) {
      const { data: tiePlayers } = await supabase
        .from('bingo_players')
        .select('game_id, telegram_id')
        .in('game_id', tieGameIds);

      // Group players by game
      const gamePlayerMap: Record<string, string[]> = {};
      for (const p of tiePlayers || []) {
        if (!gamePlayerMap[p.game_id]) gamePlayerMap[p.game_id] = [];
        gamePlayerMap[p.game_id].push(p.telegram_id);
      }

      // For each tie game, count the second winner (not already counted winner1)
      const tieGames = (games || []).filter(g => tieGameIds.includes(g.id));
      for (const tg of tieGames) {
        const players = gamePlayerMap[tg.id] || [];
        for (const pid of players) {
          if (pid !== tg.winner_telegram_id) {
            // Second winner — add their win
            if (!map[pid]) map[pid] = { wins: 0, total_prize: 0 };
            map[pid].wins++;
            map[pid].total_prize += tg.winner_prize || 0;
          }
        }
      }
    }

    // Step 4: Fetch accurate first_names from users table
    const allIds = Object.keys(map);
    const nameMap: Record<string, string> = {};
    if (allIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('telegram_id, first_name')
        .in('telegram_id', allIds);
      for (const u of usersData || []) {
        nameMap[u.telegram_id] = u.first_name || 'User';
      }
    }

    topPlayers = Object.entries(map)
      .sort((a, b) => b[1].wins - a[1].wins)
      .slice(0, 50)
      .map(([tid, v], i) => ({
        rank: i + 1,
        telegram_id: tid,
        first_name: nameMap[tid] || 'User',
        username: '',
        wins: v.wins,
        total_prize: v.total_prize,
      }));
  }

  // Find current user's rank
  const myRank = topPlayers.findIndex(p => p.telegram_id === telegramId) + 1;

  res.json({ players: topPlayers, my_rank: myRank || null });
});

// GET /api/leaderboard/inviters — top users by number of invited users who deposited
router.get('/inviters', async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();

  // Get all users with inviter_id set
  const { data: invited } = await supabase
    .from('users')
    .select('inviter_id')
    .not('inviter_id', 'is', null);

  // Count invites per inviter
  const countMap: Record<string, number> = {};
  for (const row of invited || []) {
    if (!row.inviter_id) continue;
    countMap[row.inviter_id] = (countMap[row.inviter_id] || 0) + 1;
  }

  if (Object.keys(countMap).length === 0) {
    res.json({ inviters: [], my_rank: null });
    return;
  }

  // Fetch names for top inviters
  const topIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([id]) => id);

  const { data: users } = await supabase
    .from('users')
    .select('telegram_id, first_name, username')
    .in('telegram_id', topIds);

  const nameMap: Record<string, { first_name: string; username: string }> = {};
  for (const u of users || []) {
    nameMap[u.telegram_id] = { first_name: u.first_name || 'User', username: u.username || '' };
  }

  const inviters = topIds.map((id, i) => ({
    rank: i + 1,
    telegram_id: id,
    first_name: nameMap[id]?.first_name || 'User',
    username: nameMap[id]?.username || '',
    invites: countMap[id] || 0,
  }));

  const myRank = inviters.findIndex(p => p.telegram_id === telegramId) + 1;

  res.json({ inviters, my_rank: myRank || null });
});

export default router;
