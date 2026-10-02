import { Context } from 'grammy';
import { upsertUser } from '../services/game';

export async function startCommand(ctx: Context) {
  const user = ctx.from!;
  try {
    await upsertUser(user.id.toString(), user.username || user.first_name, user.first_name, user.last_name);
  } catch (e) { console.error('Upsert user error:', e); }

  const miniAppUrl = process.env.MINI_APP_URL || 'https://adwabingo.vercel.app';
  const channelUrl = process.env.CHANNEL_URL || 'https://t.me/adwabingo';
  const supportUrl = process.env.SUPPORT_URL || 'https://t.me/adwabingo_support';
  const botUsername = 'adwabingo_bot';
  const inviteLink = `https://t.me/${botUsername}?start=ref_${user.id}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🎱 START PLAYING!', web_app: { url: miniAppUrl } }],
      [
        { text: '💬 Get Support', url: supportUrl },
        { text: '📢 Join Channel', url: channelUrl },
      ],
      [
        { text: '👥 Invite Friend', url: inviteLink },
        { text: '💰 Deposit', callback_data: 'btn_deposit' },
      ],
    ],
  };

  const caption =
    `🎉 *እንኳን በደህና መጡ, ${user.first_name}!*\n\n` +
    `🎱 *ADWA Bingo* ላይ እንኳን ደህና መጡ!\n\n` +
    `ከጓደኞችዎ ጋር ቢንጎ ይጫወቱ፣ ታላላቅ ሸልማቶችን ያሸንፉ! 🏆\n\n` +
    `*Victory in Every Ball • Ethiopia 🇪🇹*`;

  try {
    // Send banner image with caption and buttons
    await ctx.replyWithPhoto(
      'https://i.ibb.co/placeholder/adwabingo.jpg', // replace with your image URL
      {
        caption,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard.inline_keyboard },
      }
    );
  } catch {
    // Fallback: text only if image fails
    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard.inline_keyboard },
    });
  }
}
