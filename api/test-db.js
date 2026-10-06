import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
  const { data: game, error: insertErr } = await supabase.from('bingo_games').insert({
    game_id: 'test_claim_3',
    stake: 20,
    prize_pool: 40,
    status: 'calling',
    called_numbers: [],
    start_at: new Date().toISOString()
  }).select('id').single();
  
  const { data: claim, error: claimErr } = await supabase.from('bingo_games').update({
    status:             'finished',
    tie_count:          2,
    finished_at:        new Date().toISOString(),
  }).eq('id', game.id).eq('status', 'calling').select('id');
  
  console.log('Claim Result:', claim, 'Error:', claimErr);
}
test();
