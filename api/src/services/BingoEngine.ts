import { supabase } from './supabase';
import { getSettings } from '../routes/adminSettings';

const TICK_MS = 2000;
const STAKES  = [10, 20, 50, 100];

export function generateBingoCard(): number[][] {
  const zones: [number, number][] = [[1,15],[16,30],[31,45],[46,60],[61,75]];
  const card: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let col = 0; col < 5; col++) {
    const [lo, hi] = zones[col];
    const chosen = new Set<number>();
    while (chosen.size < 5) chosen.add(Math.floor(Math.random() * (hi - lo + 1)) + lo);
    const nums = Array.from(chosen);
    for (let row = 0; row < 5; row++) card[row][col] = nums[row];
  }
  card[2][2] = 0; // FREE center
  return card;
}

export function checkBingo(card: number[][], called: number[]): boolean {
  const m = (r: number, c: number) => card[r][c] === 0 || called.includes(card[r][c]);
  for (let r = 0; r < 5; r++) if ([0,1,2,3,4].every(c => m(r,c))) return true;
  for (let c = 0; c < 5; c++) if ([0,1,2,3,4].every(r => m(r,c))) return true;
  if ([0,1,2,3,4].every(i => m(i,i))) return true;
  if ([0,1,2,3,4].every(i => m(i,4-i))) return true;
  return false;
}

class BingoEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    console.log('🎰 BingoEngine running — auto-game loop active');
  }

  private async tick() {
    if (this.busy) return;
    this.busy = true;
    try { await this.step(); }
    catch (e) { console.error('[BingoEngine]', e); }
    finally { this.busy = false; }
  }

  private async step() {
    for (const stake of STAKES) {
      const { data: game } = await supabase
        .from('bingo_games')
        .select('*')
        .eq('stake', stake)
        .neq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!game) {
        await this.createGame(stake);
      } else if (game.status === 'waiting') {
        await this.handleWaiting(game);
      } else if (game.status === 'calling') {
        await this.handleCalling(game);
      }
    }
  }

  private async createGame(stake: number) {
    const game_id = Math.floor(100 + Math.random() * 900).toString();
    const start_at = new Date(Date.now() + 86400000 * 365).toISOString();

    await supabase.from('bingo_games').insert({
      game_id,
      stake,
      prize_pool: 0,
      status: 'waiting',
      called_numbers: [],
      start_at,
    });
    console.log(`🎰 Game #${game_id} (Stake: ${stake}) created, waiting for first player`);
  }

  private async handleWaiting(game: any) {
    const cfg = await getSettings();
    const startTime = new Date(game.start_at).getTime();
    if (startTime > Date.now() + 86400000) return;
    if (Date.now() < startTime) return;

    const { count } = await supabase
      .from('bingo_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id);

    if ((count ?? 0) < cfg.min_players) {
      await supabase.from('bingo_games').update({
        start_at: new Date(Date.now() + cfg.waiting_period_s * 1000 / 2).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', game.id);
      console.log(`🎰 Game #${game.game_id} extended (only ${count} player, need ${cfg.min_players})`);
      return;
    }

    await supabase.from('bingo_games').update({
      status: 'calling',
      called_numbers: [],
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);
    console.log(`🎰 Game #${game.game_id} started with ${count} players!`);
  }

  private async handleCalling(game: any) {
    const cfg = await getSettings();
    const lastUpdate = new Date(game.updated_at).getTime();
    if (Date.now() - lastUpdate < cfg.call_interval_ms) return;

    const called: number[] = game.called_numbers || [];
    const pool = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !called.includes(n));

    if (pool.length === 0) {
      await supabase.from('bingo_games').update({
        status: 'finished',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', game.id);
      return;
    }

    const num = pool[Math.floor(Math.random() * pool.length)];
    const newCalled = [...called, num];

    await supabase.from('bingo_games').update({
      called_numbers: newCalled,
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);

    await this.checkWinners(game.id, game.game_id, newCalled, game.prize_pool, game.stake);
  }

  private async checkWinners(
    gameId: string,
    gameLabel: string,
    called: number[],
    prizePool: number,
    stake: number,
  ) {
    const { data: players } = await supabase
      .from('bingo_players')
      .select('id, telegram_id, cartela_number, card_matrix, first_name')
      .eq('game_id', gameId);

    if (!players || players.length === 0) return;

    // ── Find ALL simultaneous winners ─────────────────────────────────────────
    const winners = players.filter(p => checkBingo(p.card_matrix as number[][], called));
    if (winners.length === 0) return;

    const prize = Number(prizePool);
    const token = process.env.BOT_TOKEN;

    // ── Helper: send Telegram notification ────────────────────────────────────
    const notify = async (chatId: string, text: string) => {
      try {
        if (token) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
          });
        }
      } catch { /* ignore */ }
    };

    // ── CASE 1: Single winner ──────────────────────────────────────────────────
    if (winners.length === 1) {
      const w = winners[0];
      const cfg = await getSettings();
      let finalPrize = prize;
      let isEarlyCall = false;

      // Check 8-call
      if (cfg.early_call_8_enabled && called.length <= 8) {
        const rewards8 = cfg.early_call_8_rewards as Record<string, number>;
        const rew = rewards8[String(stake)] || rewards8[stake.toString()];
        if (rew) {
          finalPrize = Number(rew);
          isEarlyCall = true;
          console.log(`🎰 8-CALL BINGO! Reward: ${finalPrize}`);
        }
      }
      // Check 10-call (only if not already an 8-call win)
      else if (cfg.early_call_10_enabled && called.length <= 10) {
        const rewards10 = cfg.early_call_10_rewards as Record<string, number>;
        const rew = rewards10[String(stake)] || rewards10[stake.toString()];
        if (rew) {
          finalPrize = Number(rew);
          isEarlyCall = true;
          console.log(`🎰 10-CALL BINGO! Reward: ${finalPrize}`);
        }
      }

      await supabase.from('bingo_games').update({
        status:             'finished',
        winner_telegram_id: w.telegram_id,
        winner_first_name:  isEarlyCall ? `🚀 EARLY BINGO: ${w.first_name}` : w.first_name,
        winner_cartela:     w.cartela_number,
        winner_prize:       finalPrize,
        finished_at:        new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      }).eq('id', gameId);

      const { data: u } = await supabase.from('users')
        .select('main_balance, total_wins')
        .eq('telegram_id', w.telegram_id)
        .single();
      if (u) {
        await supabase.from('users').update({
          main_balance: Number(u.main_balance) + finalPrize,
          total_wins:   Number(u.total_wins) + 1,
        }).eq('telegram_id', w.telegram_id);
      }

      const msg = isEarlyCall 
        ? `🚀 EARLY CALL BINGO (${called.length} calls)! You won ${finalPrize} ETB on Cartela #${w.cartela_number}!`
        : `🎉 BINGO! You won ${finalPrize} ETB on Cartela #${w.cartela_number}!`;
        
      await notify(w.telegram_id, msg);
      console.log(`🏆 Game #${gameLabel}: Single winner ${w.first_name} — ${finalPrize} ETB`);
      return;
    }

    // ── CASE 2: Exactly 2 winners — split prize ───────────────────────────────
    if (winners.length === 2) {
      const splitPrize = Math.floor(prize / 2);
      const w1 = winners[0];
      const w2 = winners[1];

      await supabase.from('bingo_games').update({
        status:             'finished',
        winner_telegram_id: w1.telegram_id,
        winner_first_name:  `${w1.first_name} & ${w2.first_name}`,
        winner_cartela:     w1.cartela_number,
        winner_prize:       splitPrize,         // prize shown per winner
        tie_count:          2,                  // optional metadata
        finished_at:        new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      }).eq('id', gameId);

      for (const w of winners) {
        const { data: u } = await supabase.from('users')
          .select('main_balance, total_wins')
          .eq('telegram_id', w.telegram_id)
          .single();
        if (u) {
          await supabase.from('users').update({
            main_balance: Number(u.main_balance) + splitPrize,
            total_wins:   Number(u.total_wins) + 1,
          }).eq('telegram_id', w.telegram_id);
        }
        await notify(
          w.telegram_id,
          `🎉 BINGO! You tied with another player! You each won ${splitPrize} ETB (prize split on Cartela #${w.cartela_number})!`
        );
      }
      console.log(`🤝 Game #${gameLabel}: 2-way tie — ${w1.first_name} & ${w2.first_name} — ${splitPrize} ETB each`);
      return;
    }

    // ── CASE 3: 3 or more winners — REMATCH ──────────────────────────────────
    // Refund stake to every player, mark game finished as REMATCH
    console.log(`🔄 Game #${gameLabel}: ${winners.length}-way tie — triggering REMATCH & stake refund`);

    await supabase.from('bingo_games').update({
      status:            'finished',
      winner_first_name: 'REMATCH',
      winner_prize:      0,
      winner_cartela:    null,
      finished_at:       new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    }).eq('id', gameId);

    // Refund ALL players their stake
    for (const p of players) {
      const { data: u } = await supabase.from('users')
        .select('main_balance')
        .eq('telegram_id', p.telegram_id)
        .single();
      if (u) {
        await supabase.from('users').update({
          main_balance: Number(u.main_balance) + Number(stake),
        }).eq('telegram_id', p.telegram_id);
      }
      await notify(
        p.telegram_id,
        `🔄 REMATCH! ${winners.length} players hit BINGO at the same time on Game #${gameLabel}. Your ${stake} ETB stake has been refunded. A new game is starting!`
      );
    }
    // Engine will auto-create a new game for this stake on next tick
  }
}

export const engine = new BingoEngine();
