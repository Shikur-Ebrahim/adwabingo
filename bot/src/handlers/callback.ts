import { Context } from 'grammy';
import { startDeposit, handleMethodSelect, cancelDeposit } from './deposit';

export async function handleCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data || '';

  // ── Deposit flow ──────────────────────────────────────────────────────────
  if (data === 'btn_deposit') {
    await startDeposit(ctx);
    return;
  }

  if (data.startsWith('dep_method_')) {
    const methodId = data.replace('dep_method_', '');
    await handleMethodSelect(ctx, methodId);
    return;
  }

  if (data === 'dep_cancel') {
    await cancelDeposit(ctx);
    return;
  }

  await ctx.answerCallbackQuery();
}
