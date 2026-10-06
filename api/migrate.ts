import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

async function run() {
  console.log('Updating existing rows...');
  const { data: games } = await supabase.from('bingo_games').select('id');
  if (games) {
    for (const g of games) {
      const { data: pRows } = await supabase.from('bingo_players').select('telegram_id').eq('game_id', g.id);
      const unique = new Set((pRows || []).map(r => r.telegram_id)).size;
      await supabase.from('bingo_games').update({ unique_players: unique }).eq('id', g.id);
    }
  }
  console.log('Done.');
}
run();
