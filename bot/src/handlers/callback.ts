import { Context } from 'grammy';
import { startDeposit, handleMethodSelect, cancelDeposit, handleCopyAccount } from './deposit';

export async function handleCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data || '';

  if (data === 'btn_deposit') {
    await startDeposit(ctx);
    return;
  }

  if (data.startsWith('dep_method_')) {
    const methodId = data.replace('dep_method_', '');
    await handleMethodSelect(ctx, methodId);
    return;
  }

  // Copy account number → show popup
  if (data.startsWith('dep_copy_')) {
    const accountNumber = data.replace('dep_copy_', '');
    await handleCopyAccount(ctx, accountNumber);
    return;
  }

  if (data === 'dep_cancel') {
    await cancelDeposit(ctx);
    return;
  }

  await ctx.answerCallbackQuery();
}
