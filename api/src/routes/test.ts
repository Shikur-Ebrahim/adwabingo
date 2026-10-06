import { Router } from 'express';
import { supabase } from '../services/supabase';
const router = Router();
router.get('/test', async (req, res) => {
  const { data: rows } = await supabase.from('bingo_players').select('*');
  res.json({ rows });
});
export default router;
