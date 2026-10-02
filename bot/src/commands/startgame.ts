import { Context } from 'grammy';
import { startGame, getRoomPlayers, getHostRoom } from '../services/game';

export async function startGameCommand(ctx: Context) {
  const user = ctx.from!;
  const chatId = ctx.chat!.id.toString();

  try {
    const room = await getHostRoom(user.id.toString(), chatId);
    if (!room || room.status !== 'waiting') {
      await ctx.reply('❌ No waiting room found. Create one with /newgame');
      return;
    }
    await startGame(room.code, user.id.toString());
    const players = await getRoomPlayers(room.id);
    const playerList = players.map(p => `• ${p.username}`).join('\n');

    await ctx.reply(
      `🎉 *BINGO GAME STARTED!*\n\n` +
      `Room: \`${room.code}\`\n` +
      `👥 Players (${players.length}):\n${playerList}\n\n` +
      `🎲 Host, press Call Number to begin!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎲 Call Next Number', callback_data: `call_${room.id}` }],
            [{ text: '📋 Called Numbers', callback_data: `called_${room.id}` }, { text: '👥 Players', callback_data: `players_${room.id}` }],
            [{ text: '🎮 Open My Card', web_app: { url: `${process.env.MINI_APP_URL}?room=${room.code}` } }],
          ],
        },
      }
    );
  } catch (error: any) {
    await ctx.reply(`❌ ${error.message}`);
  }
}
