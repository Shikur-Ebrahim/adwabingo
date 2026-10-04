import { supabase } from './supabase';

const CALL_INTERVAL_MS = 5000;
const TICK_MS          = 2000;
const STAKES           = [10, 20, 50, 100];

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
    // Wait indefinitely until first player joins
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
    const startTime = new Date(game.start_at).getTime();
    if (startTime > Date.now() + 86400000) return; // Indefinite wait state
    if (Date.now() < startTime) return; // Still counting down 60s

    // Time is up! Check player count.
    const { count } = await supabase
      .from('bingo_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id);

    if ((count ?? 0) < 2) {
      // Less than 2 players, cannot start! Extend timer by 30 seconds
      await supabase.from('bingo_games').update({
        start_at: new Date(Date.now() + 30_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', game.id);
      console.log(`🎰 Game #${game.game_id} extended (only ${count} player)`);
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
    const lastUpdate = new Date(game.updated_at).getTime();
    if (Date.now() - lastUpdate < CALL_INTERVAL_MS) return;

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

    await this.checkWinners(game.id, game.game_id, newCalled, game.prize_pool);
  }

  private async checkWinners(gameId: string, gameLabel: string, called: number[], prizePool: number) {
    const { data: players } = await supabase
      .from('bingo_players')
      .select('id, telegram_id, cartela_number, card_matrix, first_name')
      .eq('game_id', gameId);

    if (!players || players.length === 0) return;

    for (const player of players) {
      if (checkBingo(player.card_matrix as number[][], called)) {
        const prize = Number(prizePool);
        await supabase.from('bingo_games').update({
          status: 'finished',
          winner_telegram_id: player.telegram_id,
          winner_first_name: player.first_name,
          winner_cartela: player.cartela_number,
          winner_prize: prize,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', gameId);

        const { data: u } = await supabase.from('users').select('main_balance, total_wins').eq('telegram_id', player.telegram_id).single();
        if (u) {
          await supabase.from('users').update({
            main_balance: Number(u.main_balance) + prize,
            total_wins: Number(u.total_wins) + 1,
          }).eq('telegram_id', player.telegram_id);
        }

        try {
          const token = process.env.BOT_TOKEN;
          if (token) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: player.telegram_id,
                text: `🎉 BINGO! You won ${prize} ETB on Cartela #${player.cartela_number}!`
              })
            });
          }
        } catch { /* ignore */ }
        break; // Only one winner gets the prize pool
      }
    }
  }
}

export const engine = new BingoEngine();
