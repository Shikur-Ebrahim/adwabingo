import { supabase } from './supabase';
import { User } from '../types';

export async function upsertUser(telegramId: string, username: string, firstName: string, inviterId?: string): Promise<User> {
  const { data: existing } = await supabase.from('users').select('*').eq('telegram_id', telegramId).single();
  
  if (existing) {
    if (existing.status === 'inactive') {
      throw new Error('ACCOUNT_INACTIVE');
    }

    const { data, error } = await supabase
      .from('users')
      .update({ username, first_name: firstName })
      .eq('telegram_id', telegramId)
      .select().single();
    if (error) throw error;
    return data as User;
  } else {
    const { data, error } = await supabase
      .from('users')
      .insert({ telegram_id: telegramId, username, first_name: firstName, inviter_id: inviterId || null })
      .select().single();
    if (error) throw error;
    return data as User;
  }
}
