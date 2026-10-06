import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function clean() {
  const { error } = await supabase.from('bingo_games').delete().like('game_id', 'test_claim%');
  console.log('Deleted test games. Error:', error);
}
clean();
