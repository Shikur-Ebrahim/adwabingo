import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
  const { data: g } = await supabase.from('bingo_games').select('*').order('created_at', { ascending: false }).limit(1).single();
  console.log('Latest game status:', g.status, 'winner_cartela:', g.winner_cartela);
}
test();
