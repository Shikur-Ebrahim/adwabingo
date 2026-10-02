import { Context } from 'grammy';
import { upsertUser } from '../services/game';

export async function startCommand(ctx: Context) {
  const user = ctx.from!;
  try {
    await upsertUser(user.id.toString(), user.username || user.first_name, user.first_name, user.last_name);
  } catch (e) { console.error('Upsert user error:', e); }

  const miniAppUrl = process.env.MINI_APP_URL!;
  await ctx.reply(
    `🎱 *Welcome to ADWA Bingo, ${user.first_name}!*\n\n` +
    `Play Bingo with your friends right here on Telegram!\n\n` +
    `*📋 Commands:*\n` +
    `🆕 /newgame — Create a bingo room\n` +
    `🎮 /join CODE — Join a room\n` +
    `▶️ /startgame — Start (host only)\n` +
    `❓ /help — Help & rules\n\n` +
    `Ready to play? 🎲`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Open Bingo App', web_app: { url: miniAppUrl } }],
          [{ text: '🆕 Create New Game', callback_data: 'btn_newgame' }, { text: '❓ Help', callback_data: 'btn_help' }],
        ],
      },
    }
  );
}
