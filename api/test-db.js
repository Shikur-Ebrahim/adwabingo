import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function test() {
  const { data, error: err1 } = await supabase.from('bingo_games').insert({ game_id: 'test', stake: 10, prize_pool: 0, status: 'calling', called_numbers: [], start_at: new Date().toISOString() }).select('id').single();
  if (err1) { console.error('Insert error:', err1); return; }
  console.log('Inserted game:', data.id);
  
  const { data: u, error } = await supabase.from('bingo_games').update({ status: 'resolving' }).eq('id', data.id).eq('status', 'calling').select('id');
  console.log('Update result:', u, 'Error:', error);
}
test();
