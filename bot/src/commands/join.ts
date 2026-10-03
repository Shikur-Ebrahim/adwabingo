import { Context } from 'grammy';
import { joinRoom, upsertUser } from '../services/game';
import { supabase } from '../services/supabase';

export async function joinCommand(ctx: Context) {
  const user = ctx.from!;
  const text = ctx.message?.text || '';
  const parts = text.trim().split(/\s+/);

  if (parts.length < 2) {
    await ctx.reply('❌ Please provide a room code.\nExample: /join ABC123');
    return;
  }
  const code = parts[1].toUpperCase();

  try {
    await upsertUser(user.id.toString(), user.username || user.first_name, user.first_name);
    const { room } = await joinRoom(code, user.id.toString(), user.username || user.first_name);
    const { data: players } = await supabase.from('room_players').select('username').eq('room_id', room.id);
    const playerList = (players || []).map((p: any) => `• ${p.username}`).join('\n');

    await ctx.reply(
      `✅ *Joined Room ${code}!*\n\n` +
      `👥 *Players (${players?.length || 1}):*\n${playerList}\n\n` +
      `⏳ Waiting for host to start...\nOpen the Mini App to see your card!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 View My Card', web_app: { url: `${process.env.MINI_APP_URL}?room=${code}` } }],
          ],
        },
      }
    );
  } catch (error: any) {
    await ctx.reply(`❌ ${error.message}`);
  }
}
