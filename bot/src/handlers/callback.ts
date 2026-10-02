import { Context } from 'grammy';
import { callNumber, getCalledNumbers, getRoomPlayers, claimBingo } from '../services/game';
import { supabase } from '../services/supabase';
import { getNumberLetter } from '../services/bingo';

export async function handleCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data || '';
  const user = ctx.from!;

  if (data === 'btn_newgame') {
    await ctx.answerCallbackQuery();
    const { newGameCommand } = await import('../commands/newgame');
    await newGameCommand(ctx);
    return;
  }

  if (data === 'btn_help') {
    await ctx.answerCallbackQuery();
    const { helpCommand } = await import('../commands/help');
    await helpCommand(ctx);
    return;
  }

  if (data.startsWith('showcode_')) {
    const code = data.replace('showcode_', '');
    await ctx.answerCallbackQuery({ text: `Room Code: ${code} — Share with friends!`, show_alert: true });
    return;
  }

  if (data.startsWith('start_')) {
    await ctx.answerCallbackQuery();
    const code = data.replace('start_', '');
    try {
      const { startGame, getRoomPlayers } = await import('../services/game');
      const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single();
      if (!room) { await ctx.answerCallbackQuery({ text: 'Room not found!', show_alert: true }); return; }
      await startGame(code, user.id.toString());
      const players = await getRoomPlayers(room.id);
      const playerList = players.map(p => `• ${p.username}`).join('\n');
      await ctx.editMessageText(
        `🎉 *BINGO STARTED!*\n\nRoom: \`${code}\`\n👥 Players (${players.length}):\n${playerList}\n\n🎲 Calling numbers now!`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [
            [{ text: '🎲 Call Next Number', callback_data: `call_${room.id}` }],
            [{ text: '📋 Called Numbers', callback_data: `called_${room.id}` }],
            [{ text: '🏆 BINGO!', callback_data: `bingo_${room.id}` }],
            [{ text: '🎮 Open My Card', web_app: { url: `${process.env.MINI_APP_URL}?room=${code}` } }],
          ]},
        }
      );
    } catch (err: any) {
      await ctx.answerCallbackQuery({ text: `❌ ${err.message}`, show_alert: true });
    }
    return;
  }

  if (data.startsWith('players_')) {
    const id = data.replace('players_', '');
    // Try room code first, then room id
    let players;
    if (id.length === 6 && id === id.toUpperCase()) {
      const { data: room } = await supabase.from('rooms').select('id').eq('code', id).single();
      if (room) players = await getRoomPlayers(room.id);
    } else {
      players = await getRoomPlayers(id);
    }
    if (!players || players.length === 0) {
      await ctx.answerCallbackQuery({ text: 'No players found!', show_alert: true });
      return;
    }
    const list = players.map((p, i) => `${i+1}. ${p.username}${p.has_bingo ? ' 🏆' : ''}`).join('\n');
    await ctx.answerCallbackQuery({ text: `Players (${players.length}):\n${list}`, show_alert: true });
    return;
  }

  if (data.startsWith('call_')) {
    const roomId = data.replace('call_', '');
    try {
      const { data: room } = await supabase.from('rooms').select('*, users!rooms_host_id_fkey(telegram_id)').eq('id', roomId).single();
      if (!room || room.status !== 'playing') {
        await ctx.answerCallbackQuery({ text: 'Game is not active!', show_alert: true }); return;
      }
      // Check host
      const hostTelegramId = room.users?.telegram_id;
      if (hostTelegramId !== user.id.toString()) {
        await ctx.answerCallbackQuery({ text: '❌ Only the host can call numbers!', show_alert: true }); return;
      }
      await ctx.answerCallbackQuery();
      const number = await callNumber(roomId);
      const calledNums = await getCalledNumbers(roomId);
      const letter = getNumberLetter(number);
      const last5 = calledNums.slice(-5).reverse().map(n => `${getNumberLetter(n)}${n}`).join(' · ');

      await ctx.editMessageText(
        `🎲 *${letter}${number}!*\n\n` +
        `📊 Called: ${calledNums.length}/75\n` +
        `🕐 Recent: ${last5}\n\n` +
        `Mark your card! First to complete a line wins! 🏆`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [
            [{ text: '🎲 Call Next Number', callback_data: `call_${roomId}` }],
            [{ text: '📋 All Numbers', callback_data: `called_${roomId}` }, { text: '👥 Players', callback_data: `players_${roomId}` }],
            [{ text: '🏆 Claim BINGO!', callback_data: `bingo_${roomId}` }],
            [{ text: '🎮 Open My Card', web_app: { url: `${process.env.MINI_APP_URL}?room=${room.code}` } }],
          ]},
        }
      );
    } catch (err: any) {
      await ctx.answerCallbackQuery({ text: `❌ ${err.message}`, show_alert: true });
    }
    return;
  }

  if (data.startsWith('called_')) {
    const roomId = data.replace('called_', '');
    const calledNums = await getCalledNumbers(roomId);
    if (calledNums.length === 0) {
      await ctx.answerCallbackQuery({ text: 'No numbers called yet!', show_alert: true }); return;
    }
    const formatted = calledNums.map(n => `${getNumberLetter(n)}${n}`).join(' ');
    await ctx.answerCallbackQuery({ text: `Called (${calledNums.length}/75):\n${formatted}`, show_alert: true });
    return;
  }

  if (data.startsWith('bingo_')) {
    const roomId = data.replace('bingo_', '');
    try {
      await ctx.answerCallbackQuery();
      const winner = await claimBingo(roomId, user.id.toString());
      await ctx.editMessageText(
        `🎉🎊 *BINGO!!!* 🎊🎉\n\n` +
        `🏆 *Winner: ${user.first_name}*\n` +
        `👤 @${user.username || user.first_name}\n\n` +
        `Congratulations! 🥳\nStart a new game: /newgame`,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      await ctx.answerCallbackQuery({ text: `❌ ${err.message}`, show_alert: true });
    }
    return;
  }

  await ctx.answerCallbackQuery();
}
