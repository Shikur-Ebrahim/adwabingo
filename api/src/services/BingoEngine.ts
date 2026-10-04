/**
 * BingoEngine — fully automated, server-side bingo game loop.
 *
 * States:
 *  waiting  → Players join (60 s countdown from start_at)
 *  calling  → Numbers drawn every CALL_INTERVAL ms. Server checks winners after each draw.
 *  finished → Winner paid. Next game auto-created after NEXT_GAME_DELAY ms.
 *
 * Card: standard 5×5 B-I-N-G-O layout, numbers from pool 1-75.
 * Cartela: 1-150 seat numbers. Players pick their seat → get a card.
 * The 1-150 grid shown to users is just the seat picker / called-number display.
 */

import { supabase } from './supabase';

// ─── Config ──────────────────────────────────────────────────────────────────
const WAITING_SECS     = 60;      // How long to wait for players before starting
const MIN_PLAYERS      = 1;       // Min players needed to start (set 1 for testing; use 2+ in prod)
const CALL_INTERVAL_MS = 5000;    // Draw a number every 5 s
const EXTEND_BY_SECS   = 30;      // Extend wait if no players yet
const NEXT_GAME_DELAY  = 15_000;  // ms before auto-creating next game after finish
const TICK_MS          = 2_000;   // Engine heartbeat

// ─── Card generation (server-side, never trusted from client) ─────────────────
export function generateBingoCard(): number[][] {
  // Standard BINGO columns: B=1-15, I=16-30, N=31-45, G=46-60, O=61-75
  const zones: [number, number][] = [[1,15],[16,30],[31,45],[46,60],[61,75]];
  const card: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));

  for (let col = 0; col < 5; col++) {
    const [lo, hi] = zones[col];
    const chosen = new Set<number>();
    while (chosen.size < 5) {
      chosen.add(Math.floor(Math.random() * (hi - lo + 1)) + lo);
    }
    const nums = Array.from(chosen);
    for (let row = 0; row < 5; row++) {
      card[row][col] = nums[row];
    }
  }
  card[2][2] = 0; // FREE center
  return card;
}

// ─── Bingo check (server-side, never trusted from client) ─────────────────────
export function checkBingo(card: number[][], called: number[]): boolean {
  const m = (r: number, c: number) => card[r][c] === 0 || called.includes(card[r][c]);
  for (let r = 0; r < 5; r++) if ([0,1,2,3,4].every(c => m(r,c))) return true;
  for (let c = 0; c < 5; c++) if ([0,1,2,3,4].every(r => m(r,c))) return true;
  if ([0,1,2,3,4].every(i => m(i,i))) return true;
  if ([0,1,2,3,4].every(i => m(i,4-i))) return true;
  return false;
}

// ─── Engine ───────────────────────────────────────────────────────────────────
class BingoEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    console.log('🎱 BingoEngine running — auto-game loop active');
  }

  private async tick() {
    if (this.busy) return;
    this.busy = true;
    try { await this.step(); }
    catch (e) { console.error('[BingoEngine]', e); }
    finally { this.busy = false; }
  }

  private async step() {
    // Fetch the most recent non-finished game
    const { data: game } = await supabase
      .from('bingo_games')
      .select('*')
      .neq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!game) {
      await this.createGame();
      return;
    }

    if (game.status === 'waiting') {
      await this.handleWaiting(game);
    } else if (game.status === 'calling') {
      await this.handleCalling(game);
    }
  }

  private async handleWaiting(game: any) {
    if (Date.now() < new Date(game.start_at).getTime()) return; // Not time yet

    // Check if any players joined
    const { count } = await supabase
      .from('bingo_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id);

    if ((count ?? 0) < MIN_PLAYERS) {
      // Extend wait
      await supabase.from('bingo_games').update({
        start_at: new Date(Date.now() + EXTEND_BY_SECS * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', game.id);
      console.log(`🎱 No players yet — extending game #${game.game_id} by ${EXTEND_BY_SECS}s`);
      return;
    }

    // Start calling!
    await supabase.from('bingo_games').update({
      status: 'calling',
      called_numbers: [],
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);
    console.log(`🎱 Game #${game.game_id} started with ${count} player(s)!`);
  }

  private async handleCalling(game: any) {
    // Throttle: only call if CALL_INTERVAL has elapsed since last update
    const lastUpdate = new Date(game.updated_at).getTime();
    if (Date.now() - lastUpdate < CALL_INTERVAL_MS) return;

    const called: number[] = game.called_numbers || [];

    // Draw from standard pool 1-75
    const pool = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !called.includes(n));

    if (pool.length === 0) {
      // All numbers drawn, no winner — end game
      await supabase.from('bingo_games').update({
        status: 'finished',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', game.id);
      console.log(`🎱 Game #${game.game_id} ended — all numbers drawn, no winner.`);
      setTimeout(() => this.createGame(), NEXT_GAME_DELAY);
      return;
    }

    // Pick a random number
    const num = pool[Math.floor(Math.random() * pool.length)];
    const newCalled = [...called, num];

    await supabase.from('bingo_games').update({
      called_numbers: newCalled,
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);

    console.log(`🎱 Game #${game.game_id} — called ${num} (${newCalled.length}/75)`);

    // Server-side winner check
    await this.checkWinners(game.id, game.game_id, newCalled, game.prize_pool);
  }

  private async checkWinners(gameId: string, gameLabel: string, called: number[], prizePool: number) {
    const { data: players } = await supabase
      .from('bingo_players')
      .select('id, telegram_id, cartela_number, card_matrix')
      .eq('game_id', gameId);

    if (!players || players.length === 0) return;

    for (const player of players) {
      if (checkBingo(player.card_matrix as number[][], called)) {
        const prize = Number(prizePool);

        // Mark game finished with winner
        await supabase.from('bingo_games').update({
          status: 'finished',
          winner_telegram_id: player.telegram_id,
          winner_cartela: player.cartela_number,
          winner_prize: prize,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', gameId);

        // Pay the winner
        const { data: u } = await supabase.from('users').select('main_balance, total_wins').eq('telegram_id', player.telegram_id).single();
        if (u) {
          await supabase.from('users').update({
            main_balance: Number(u.main_balance) + prize,
            total_wins: Number(u.total_wins) + 1,
          }).eq('telegram_id', player.telegram_id);
        }

        // Bot notification
        try {
          const token = process.env.BOT_TOKEN;
          if (token) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: player.telegram_id,
                text: `🎉 *BINGO! You WON!*\n\n🏆 Cartela #${player.cartela_number}\n💰 Prize: *${prize} ETB* added to your wallet!\n\nGame #${gameLabel}`,
                parse_mode: 'Markdown',
              }),
            });
          }
        } catch { /* ignore */ }

        console.log(`🏆 Game #${gameLabel} — Winner: Cartela #${player.cartela_number} (${player.telegram_id}) — Prize: ${prize} ETB`);

        // Schedule next game
        setTimeout(() => this.createGame(), NEXT_GAME_DELAY);
        return; // Only one winner
      }
    }
  }

  private async createGame() {
    const game_id = String(Math.floor(100 + Math.random() * 900));
    const start_at = new Date(Date.now() + WAITING_SECS * 1000).toISOString();

    const { error } = await supabase.from('bingo_games').insert({
      game_id,
      stake: 10,
      prize_pool: 0,
      status: 'waiting',
      called_numbers: [],
      start_at,
    });

    if (error) console.error('[BingoEngine] createGame error:', error.message);
    else console.log(`🎱 New game #${game_id} — opens in ${WAITING_SECS}s`);
  }
}

export const bingoEngine = new BingoEngine();
