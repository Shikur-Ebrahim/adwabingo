import { Context } from 'grammy';

export async function handleCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data || '';

  if (data === 'btn_deposit') {
    await ctx.answerCallbackQuery({ text: '💰 Deposit system coming soon!', show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery();
}
