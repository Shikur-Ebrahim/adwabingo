import { supabase } from './supabase';
import { User } from '../types';

export async function upsertUser(telegramId: string, username: string, firstName: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .upsert({ telegram_id: telegramId, username, first_name: firstName }, { onConflict: 'telegram_id' })
    .select().single();
  if (error) throw error;
  return data as User;
}
