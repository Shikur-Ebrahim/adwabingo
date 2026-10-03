import { Router, Request, Response, NextFunction } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

// Middleware to ensure user is an admin
const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const telegramId = req.telegramUser!.id.toString();
  const { data } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();
  
  if (!data || data.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Admin only.' });
    return;
  }
  next();
};

router.use(validateTelegramAuth);
router.use(requireAdmin);

// Get all deposit methods
router.get('/deposit-methods', async (req, res) => {
  const { data, error } = await supabase
    .from('deposit_methods')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Create a deposit method
router.post('/deposit-methods', async (req, res) => {
  const { type, name, account_number, logo_url, min_deposit } = req.body;
  const { data, error } = await supabase
    .from('deposit_methods')
    .insert([{ type, name, account_number, logo_url, min_deposit }])
    .select().single();
    
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Update a deposit method
router.put('/deposit-methods/:id', async (req, res) => {
  const { type, name, account_number, logo_url, min_deposit, is_active } = req.body;
  const { data, error } = await supabase
    .from('deposit_methods')
    .update({ type, name, account_number, logo_url, min_deposit, is_active, updated_at: new Date() })
    .eq('id', req.params.id)
    .select().single();
    
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Delete a deposit method
router.delete('/deposit-methods/:id', async (req, res) => {
  const { error } = await supabase.from('deposit_methods').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ─── WITHDRAWAL METHODS ───────────────────────────────────────────────────────

// Get all withdrawal methods
router.get('/withdrawal-methods', async (req, res) => {
  const { data, error } = await supabase
    .from('withdrawal_methods')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Create a withdrawal method
router.post('/withdrawal-methods', async (req, res) => {
  const { type, logo_url, min_withdrawal } = req.body;
  const { data, error } = await supabase
    .from('withdrawal_methods')
    .insert([{ type, logo_url, min_withdrawal }])
    .select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Update a withdrawal method
router.put('/withdrawal-methods/:id', async (req, res) => {
  const { type, logo_url, min_withdrawal, is_active } = req.body;
  const { data, error } = await supabase
    .from('withdrawal_methods')
    .update({ type, logo_url, min_withdrawal, is_active, updated_at: new Date() })
    .eq('id', req.params.id)
    .select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Delete a withdrawal method
router.delete('/withdrawal-methods/:id', async (req, res) => {
  const { error } = await supabase.from('withdrawal_methods').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ─── DEPOSIT VERIFICATION ─────────────────────────────────────────────────────

// Get all deposits with user + method info (pending and approved)
router.get('/deposits', async (req, res) => {
  const { data, error } = await supabase
    .from('deposits')
    .select('*, deposit_methods(type, name, logo_url), users!deposits_telegram_id_fkey(first_name, username)')
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Approve deposit → add to user balance + mark approved + apply bonus + notify user
router.post('/deposits/:id/approve', async (req, res) => {
  const { data: deposit, error: fetchErr } = await supabase
    .from('deposits').select('*').eq('id', req.params.id).single();
  if (fetchErr || !deposit) { res.status(404).json({ error: 'Deposit not found' }); return; }

  // Check if this is their first approved deposit
  const { count: approvedCount } = await supabase
    .from('deposits')
    .select('*', { count: 'exact', head: true })
    .eq('telegram_id', deposit.telegram_id)
    .eq('status', 'approved');

  const isFirstDeposit = approvedCount === 0;

  // Atomic balance increment for the depositor
  const { error: balErr } = await supabase.rpc('increment_user_balance', {
    p_telegram_id: deposit.telegram_id,
    p_amount: deposit.amount,
  });
  if (balErr) { res.status(500).json({ error: balErr.message }); return; }

  // Check if first deposit to apply bonuses
  let depositorBonus = 0;
  let inviterBonus = 0;
  let inviterId = null;
  
  if (isFirstDeposit) {
    // Load bonus settings from DB (fallback to defaults if not set)
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'first_deposit_bonus_pct')
      .single();
    const { data: invSettingsRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'invitation_reward_pct')
      .single();

    const firstDepositPct = settingsRow ? parseFloat(settingsRow.value) / 100 : 0.20;
    const invitationPct   = invSettingsRow ? parseFloat(invSettingsRow.value) / 100 : 0.10;

    // 1. Give configurable% bonus to the DEPOSITOR
    depositorBonus = deposit.amount * firstDepositPct;
    const { data: depRecord } = await supabase.from('users').select('bonus_balance, inviter_id').eq('telegram_id', deposit.telegram_id).single();
    
    if (depRecord) {
      const currentDepBonus = Number(depRecord.bonus_balance || 0);
      await supabase.from('users').update({ bonus_balance: currentDepBonus + depositorBonus }).eq('telegram_id', deposit.telegram_id);
      
      // 2. Give 10% bonus to the INVITER (if they exist)
      if (depRecord.inviter_id) {
        inviterId = depRecord.inviter_id;
        inviterBonus = deposit.amount * invitationPct;
        
        const { data: invRecord } = await supabase.from('users').select('bonus_balance').eq('telegram_id', inviterId).single();
        if (invRecord) {
          const currentInvBonus = Number(invRecord.bonus_balance || 0);
          await supabase.from('users').update({ bonus_balance: currentInvBonus + inviterBonus }).eq('telegram_id', inviterId);
        }
      }
    }
  }

  // Mark deposit as approved
  await supabase.from('deposits').update({ status: 'approved', updated_at: new Date() }).eq('id', req.params.id);

  // Send Telegram Notification to the depositor
  try {
    let msgText = `✅ *Deposit Approved!*\n\n💰 Amount: *${Number(deposit.amount).toLocaleString('en-US')} ETB* has been added to your balance.`;
    if (isFirstDeposit) {
      msgText += `\n\n🎁 *First Deposit Bonus!* You received an extra *${Number(depositorBonus).toLocaleString('en-US')} ETB* in your bonus balance!`;
    }
    msgText += `\n\n🎮 Open the Mini App to start playing!`;

    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: deposit.telegram_id,
        text: msgText,
        parse_mode: 'Markdown',
      })
    });
  } catch (err) {
    console.error('Failed to notify user on Telegram:', err);
  }

  // Send Telegram Notification to the Inviter
  if (inviterId && inviterBonus > 0) {
    try {
      const inviterMsg = `🎉 *Referral Bonus Received!*\n\nYour invited friend made their first deposit! You have received *${Number(inviterBonus).toLocaleString('en-US')} ETB* in your bonus balance. Keep inviting friends for more rewards! 🎁`;
      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: inviterId,
          text: inviterMsg,
          parse_mode: 'Markdown',
        })
      });
    } catch (err) {
      console.error('Failed to notify inviter on Telegram:', err);
    }
  }

  res.json({ success: true, isFirstDeposit, depositorBonus, inviterBonus });
});

// Reject deposit → permanently delete from DB
router.delete('/deposits/:id/reject', async (req, res) => {
  const { error } = await supabase.from('deposits').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// Get admin stats (pending counts)
router.get('/stats', async (req, res) => {
  const { count: depCount } = await supabase
    .from('deposits')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
    
  const { count: withCount } = await supabase
    .from('withdrawals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
    
  res.json({ 
    pendingDeposits: depCount || 0,
    pendingWithdrawals: withCount || 0 
  });
});

// ─── WITHDRAWAL MANAGEMENT ───────────────────────────────────────────────────

// Get all withdrawals with user + method info
router.get('/withdrawals', async (req, res) => {
  const { data: withdrawals, error } = await supabase
    .from('withdrawals')
    .select('*, withdrawal_methods(type, logo_url)')
    .order('created_at', { ascending: false });
    
  if (error) { res.status(500).json({ error: error.message }); return; }

  // Manually fetch user data to avoid missing foreign key issues
  if (withdrawals && withdrawals.length > 0) {
    const telegramIds = [...new Set(withdrawals.map(w => w.telegram_id))];
    const { data: users } = await supabase
      .from('users')
      .select('telegram_id, first_name, username')
      .in('telegram_id', telegramIds);
      
    if (users) {
      const userMap = Object.fromEntries(users.map(u => [u.telegram_id, u]));
      for (const w of withdrawals) {
        (w as any).users = userMap[w.telegram_id] || null;
      }
    }
  }

  res.json(withdrawals);
});

// Approve withdrawal → mark as approved and notify user
router.post('/withdrawals/:id/approve', async (req, res) => {
  const { data: withdrawal, error: fetchErr } = await supabase
    .from('withdrawals').select('*').eq('id', req.params.id).single();
  if (fetchErr || !withdrawal) { res.status(404).json({ error: 'Withdrawal not found' }); return; }

  await supabase.from('withdrawals').update({ status: 'approved', updated_at: new Date() }).eq('id', req.params.id);

  // Notify user
  try {
    const msg = `✅ *Withdrawal Approved!*\n\n💸 Amount: *${Number(withdrawal.amount).toLocaleString('en-US')} ETB* has been sent to your account.\n\n⏳ Funds will arrive within a few minutes.`;
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: withdrawal.telegram_id, text: msg, parse_mode: 'Markdown' })
    });
  } catch (err) { console.error('Failed to notify user:', err); }

  res.json({ success: true });
});

// Reject withdrawal → refund main_balance + delete record + notify user
router.delete('/withdrawals/:id/reject', async (req, res) => {
  const { data: withdrawal, error: fetchErr } = await supabase
    .from('withdrawals').select('*').eq('id', req.params.id).single();
  if (fetchErr || !withdrawal) { res.status(404).json({ error: 'Withdrawal not found' }); return; }

  // Refund main_balance
  const { data: user } = await supabase.from('users').select('main_balance').eq('telegram_id', withdrawal.telegram_id).single();
  if (user) {
    await supabase.from('users').update({ main_balance: Number(user.main_balance) + Number(withdrawal.amount) }).eq('telegram_id', withdrawal.telegram_id);
  }

  // Delete the record
  await supabase.from('withdrawals').delete().eq('id', req.params.id);

  // Notify user
  try {
    const msg = `❌ *Withdrawal Rejected*\n\n💸 Your withdrawal of *${Number(withdrawal.amount).toLocaleString('en-US')} ETB* has been rejected.\n\n💰 Your balance has been refunded. Please contact support for more info.`;
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: withdrawal.telegram_id, text: msg, parse_mode: 'Markdown' })
    });
  } catch (err) { console.error('Failed to notify user:', err); }

  res.json({ success: true });
});

// ─── TRANSACTION REPORT ────────────────────────────────────────────────────────
router.get('/tx-report', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  
  let dQuery = supabase.from('deposits').select('*, users!inner(username, inviter_id)');
  let wQuery = supabase.from('withdrawals').select('*, users!inner(username)');

  if (from) {
    dQuery = dQuery.gte('created_at', from);
    wQuery = wQuery.gte('created_at', from);
  }
  if (to) {
    // Add 1 day to 'to' to include the whole day if it's just a YYYY-MM-DD
    const toDate = new Date(to as string);
    toDate.setUTCHours(23, 59, 59, 999);
    dQuery = dQuery.lte('created_at', toDate.toISOString());
    wQuery = wQuery.lte('created_at', toDate.toISOString());
  }

  const [dRes, wRes] = await Promise.all([dQuery, wQuery]);
  const deposits = dRes.data || [];
  const withdrawals = wRes.data || [];

  // To calculate bonuses accurately, we need to know which deposits were the "first"
  const { data: allApproved } = await supabase
    .from('deposits')
    .select('id, telegram_id, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: true });

  const firstDepositIds = new Set();
  const seenUsers = new Set();
  if (allApproved) {
    for (const d of allApproved) {
      if (!seenUsers.has(d.telegram_id)) {
        seenUsers.add(d.telegram_id);
        firstDepositIds.add(d.id);
      }
    }
  }

  // Current settings for bonuses (fallback to historical defaults)
  const { data: setDep } = await supabase.from('settings').select('value').eq('key', 'first_deposit_bonus_pct').single();
  const { data: setInv } = await supabase.from('settings').select('value').eq('key', 'invitation_reward_pct').single();
  const depPct = setDep ? parseFloat(setDep.value) / 100 : 0.20;
  const invPct = setInv ? parseFloat(setInv.value) / 100 : 0.10;

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalDepBonus = 0;
  let totalInvBonus = 0;

  const txList: any[] = [];

  deposits.forEach((d: any) => {
    if (d.status === 'approved') totalDeposits += Number(d.amount);
    txList.push({ id: d.id, type: 'deposit', amount: Number(d.amount), status: d.status, created_at: d.created_at, username: d.users.username, telegram_id: d.telegram_id });

    if (d.status === 'approved' && firstDepositIds.has(d.id)) {
      const db = Number(d.amount) * depPct;
      totalDepBonus += db;
      txList.push({ id: d.id + '_db', type: 'deposit_bonus', amount: db, status: 'approved', created_at: d.created_at, username: d.users.username, telegram_id: d.telegram_id });

      if (d.users.inviter_id) {
        const ib = Number(d.amount) * invPct;
        totalInvBonus += ib;
        txList.push({ id: d.id + '_ib', type: 'invitation_reward', amount: ib, status: 'approved', created_at: d.created_at, username: 'Inviter of ' + d.users.username, telegram_id: d.users.inviter_id });
      }
    }
  });

  withdrawals.forEach((w: any) => {
    if (w.status === 'approved') totalWithdrawals += Number(w.amount);
    txList.push({ id: w.id, type: 'withdrawal', amount: Number(w.amount), status: w.status, created_at: w.created_at, username: w.users.username, telegram_id: w.telegram_id });
  });

  txList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    stats: { totalDeposits, totalWithdrawals, totalDepBonus, totalInvBonus },
    transactions: txList
  });
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

// GET /admin/settings — return all key/value settings
router.get('/settings', validateTelegramAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from('settings').select('key, value, label, description');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ settings: data || [] });
});

// PUT /admin/settings — upsert a single setting by key
router.put('/settings', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) { res.status(400).json({ error: 'key and value are required' }); return; }

  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(value) }, { onConflict: 'key' });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

export default router;
