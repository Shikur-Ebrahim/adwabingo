import { Context } from 'grammy';
import { createRoom, upsertUser, joinRoom } from '../services/game';

export async function newGameCommand(ctx: Context) {
  const user = ctx.from!;
  const chatId = ctx.chat!.id.toString();
  try {
    await upsertUser(user.id.toString(), user.username || user.first_name, user.first_name);
    const room = await createRoom(user.id.toString(), chatId);
    await joinRoom(room.code, user.id.toString(), user.username || user.first_name);

    await ctx.reply(
      `🎱 *New Bingo Room Created!*\n\n` +
      `🔑 Room Code: \`${room.code}\`\n` +
      `👤 Host: ${user.first_name}\n` +
      `👥 Players: 1/20\n\n` +
      `📢 Share this code with friends!\n` +
      `➡️ They join with: /join ${room.code}\n\n` +
      `When ready, press ▶️ Start Game below!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📋 Room Code: ${room.code}`, callback_data: `showcode_${room.code}` }],
            [{ text: '▶️ Start Game', callback_data: `start_${room.code}` }, { text: '👥 Players', callback_data: `players_${room.code}` }],
            [{ text: '🎮 Open Mini App', web_app: { url: `${process.env.MINI_APP_URL}?room=${room.code}` } }],
          ],
        },
      }
    );
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}
