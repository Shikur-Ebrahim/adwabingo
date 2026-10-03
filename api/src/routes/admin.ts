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

// Get all pending deposits with user + method info
router.get('/deposits', async (req, res) => {
  const { data, error } = await supabase
    .from('deposits')
    .select('*, deposit_methods(type, name, logo_url), users!deposits_telegram_id_fkey(first_name, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Approve deposit → add to user balance + mark approved
router.post('/deposits/:id/approve', async (req, res) => {
  const { data: deposit, error: fetchErr } = await supabase
    .from('deposits').select('*').eq('id', req.params.id).single();
  if (fetchErr || !deposit) { res.status(404).json({ error: 'Deposit not found' }); return; }

  // Atomic balance increment
  const { error: balErr } = await supabase.rpc('increment_user_balance', {
    p_telegram_id: deposit.telegram_id,
    p_amount: deposit.amount,
  });
  if (balErr) { res.status(500).json({ error: balErr.message }); return; }

  // Mark deposit as approved
  await supabase.from('deposits').update({ status: 'approved', updated_at: new Date() }).eq('id', req.params.id);

  res.json({ success: true });
});

// Reject deposit → permanently delete from DB
router.delete('/deposits/:id/reject', async (req, res) => {
  const { error } = await supabase.from('deposits').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

export default router;
