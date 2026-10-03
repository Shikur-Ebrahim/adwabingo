import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

router.get('/profile', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { data } = await supabase.from('users').select('*').eq('telegram_id', req.telegramUser!.id.toString()).single();
  if (!data) { res.status(404).json({ error: 'Player not found' }); return; }
  res.json({ player: data });
});

// GET /api/player/invited — returns all users invited by the current user
router.get('/invited', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();

  // Fetch all users who have this user as their inviter
  const { data: invitedUsers, error } = await supabase
    .from('users')
    .select('telegram_id, first_name, username, created_at')
    .eq('inviter_id', telegramId)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!invitedUsers || invitedUsers.length === 0) {
    res.json({ invited: [], total_earned: 0 });
    return;
  }

  // For each invited user, check if they made a first approved deposit and calculate reward
  const invitedWithRewards = await Promise.all(
    invitedUsers.map(async (u: any) => {
      const { data: firstDeposit } = await supabase
        .from('deposits')
        .select('amount, created_at')
        .eq('telegram_id', u.telegram_id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      const rewardEarned = firstDeposit ? firstDeposit.amount * 0.10 : 0;
      return {
        telegram_id: u.telegram_id,
        first_name: u.first_name,
        username: u.username,
        joined_at: u.created_at,
        has_deposited: !!firstDeposit,
        first_deposit_amount: firstDeposit?.amount || 0,
        first_deposit_date: firstDeposit?.created_at || null,
        reward_earned: rewardEarned,
      };
    })
  );

  const total_earned = invitedWithRewards.reduce((sum, u) => sum + u.reward_earned, 0);
  res.json({ invited: invitedWithRewards, total_earned });
});
// Fetch support contact and channel link from settings
router.get('/support-contact', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { data: supportData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'support_username')
    .single();

  const { data: channelData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'channel_link')
    .single();

  const username = supportData ? supportData.value : 'adwabingo_admin';
  const channel = channelData ? channelData.value : 'https://t.me/adwabingo';

  res.json({ username, channel });
});

// POST /api/player/transfer — transfer main_balance between users
router.post('/transfer', validateTelegramAuth, async (req: AuthRequest, res) => {
  const senderTelegramId = req.telegramUser!.id.toString();
  const { recipient_telegram_id, amount } = req.body;

  if (!recipient_telegram_id || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: 'Recipient Telegram ID and a valid amount are required.' });
    return;
  }

  if (recipient_telegram_id === senderTelegramId) {
    res.status(400).json({ error: 'You cannot transfer to yourself.' });
    return;
  }

  const transferAmount = Number(amount);

  // Fetch sender balance
  const { data: sender } = await supabase
    .from('users')
    .select('main_balance, first_name, username')
    .eq('telegram_id', senderTelegramId)
    .single();

  if (!sender) { res.status(404).json({ error: 'Sender not found.' }); return; }
  if (sender.main_balance < transferAmount) {
    res.status(400).json({ error: `Insufficient main balance. You have ${sender.main_balance} ETB.` });
    return;
  }

  // Fetch recipient
  const { data: recipient } = await supabase
    .from('users')
    .select('main_balance, first_name, username')
    .eq('telegram_id', recipient_telegram_id)
    .single();

  if (!recipient) {
    res.status(404).json({ error: 'Recipient not found. Make sure the Telegram ID is correct.' });
    return;
  }

  // Deduct from sender
  const { error: senderErr } = await supabase
    .from('users')
    .update({ main_balance: sender.main_balance - transferAmount })
    .eq('telegram_id', senderTelegramId)
    .gte('main_balance', transferAmount);

  if (senderErr) { res.status(500).json({ error: 'Failed to deduct balance. Please try again.' }); return; }

  // Add to recipient
  const { error: recipientErr } = await supabase
    .from('users')
    .update({ main_balance: recipient.main_balance + transferAmount })
    .eq('telegram_id', recipient_telegram_id);

  if (recipientErr) {
    // Rollback sender
    await supabase.from('users').update({ main_balance: sender.main_balance }).eq('telegram_id', senderTelegramId);
    res.status(500).json({ error: 'Failed to credit recipient. Transfer rolled back.' }); return;
  }

  // Notify recipient and sender via Telegram bot
  try {
    const botToken = process.env.BOT_TOKEN;
    const safeSender = (sender.username || sender.first_name || 'Someone').replace(/[_*[\]]/g, '\\$&');
    const safeRecipient = (recipient.username || recipient.first_name || 'User').replace(/[_*[\]]/g, '\\$&');
    
    if (botToken) {
      // Notify Recipient
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient_telegram_id,
          text: `💸 *You received a transfer!*\n\n👤 From: @${safeSender}\n💰 Amount: *${transferAmount.toLocaleString('en-US')} ETB*\n\n✅ Added to your Main Balance.`,
          parse_mode: 'Markdown'
        })
      });

      // Notify Sender
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: senderTelegramId,
          text: `📤 *Transfer Sent Successfully!*\n\n👤 To: @${safeRecipient}\n💰 Amount: *${transferAmount.toLocaleString('en-US')} ETB*\n\n✅ Deducted from your Main Balance.`,
          parse_mode: 'Markdown'
        })
      });
    }
  } catch (e) { console.error('Notify error:', e); }

  res.json({
    success: true,
    recipient_name: recipient.first_name || recipient.username || 'User',
    amount: transferAmount
  });
});

export default router;
