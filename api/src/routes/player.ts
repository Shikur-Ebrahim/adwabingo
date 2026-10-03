import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

router.get('/profile', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { data } = await supabase.from('users').select('*').eq('telegram_id', req.telegramUser!.id.toString()).single();
  if (!data) { res.status(404).json({ error: 'Player not found' }); return; }
  res.json({ player: data });
});
// Fetch a support contact (worker first, fallback to admin)
router.get('/support-contact', validateTelegramAuth, async (req: AuthRequest, res) => {
  // Try to find a worker
  let { data } = await supabase
    .from('users')
    .select('username')
    .eq('role', 'worker')
    .not('username', 'is', null)
    .limit(1)
    .single();

  // If no worker, fallback to admin
  if (!data) {
    const adminRes = await supabase
      .from('users')
      .select('username')
      .eq('role', 'admin')
      .not('username', 'is', null)
      .limit(1)
      .single();
    data = adminRes.data;
  }

  res.json({ username: data?.username || null });
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

  // Notify recipient via Telegram bot
  try {
    const botToken = process.env.BOT_TOKEN;
    const safeSender = (sender.username || sender.first_name || 'Someone').replace(/[_*[\]]/g, '\\$&');
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient_telegram_id,
          text: `💸 *You received a transfer!*\n\n👤 From: @${safeSender}\n💰 Amount: *${transferAmount.toLocaleString('en-US')} ETB*\n\n✅ Added to your Main Balance.`,
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
