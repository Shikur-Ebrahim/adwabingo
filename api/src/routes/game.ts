import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

function checkBingo(card: number[][], marked: boolean[][], calledNumbers: number[]): boolean {
  const m = card.map((row, r) => row.map((cell, c) => cell === 0 || calledNumbers.includes(cell) ? true : marked[r][c]));
  for (let r = 0; r < 5; r++) { if (m[r].every(Boolean)) return true; }
  for (let c = 0; c < 5; c++) { if (m.every((row: boolean[]) => row[c])) return true; }
  if ([0,1,2,3,4].every(i => m[i][i])) return true;
  if ([0,1,2,3,4].every(i => m[i][4-i])) return true;
  return false;
}

router.get('/room/:code', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { data: room } = await supabase.from('rooms').select('*').eq('code', req.params.code.toUpperCase()).single();
  if (!room) { res.status(404).json({ error: 'Room not found' }); return; }
  const { data: players } = await supabase.from('room_players').select('telegram_id,username,has_bingo').eq('room_id', room.id);
  const { data: calledNums } = await supabase.from('called_numbers').select('number').eq('room_id', room.id).order('called_at', { ascending: true });
  res.json({ room, players: players || [], calledNumbers: (calledNums || []).map((c: any) => c.number) });
});

router.get('/room/:code/mycard', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const { data: room } = await supabase.from('rooms').select('id').eq('code', req.params.code.toUpperCase()).single();
  if (!room) { res.status(404).json({ error: 'Room not found' }); return; }
  const { data: player } = await supabase.from('room_players').select('*').eq('room_id', room.id).eq('telegram_id', telegramId).single();
  if (!player) { res.status(404).json({ error: 'Not in this room' }); return; }
  res.json({ player });
});

router.post('/room/:code/mark', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { row, col } = req.body;
  const telegramId = req.telegramUser!.id.toString();
  const { data: room } = await supabase.from('rooms').select('id,status').eq('code', req.params.code.toUpperCase()).single();
  if (!room || room.status !== 'playing') { res.status(400).json({ error: 'Game not active' }); return; }
  const { data: player } = await supabase.from('room_players').select('*').eq('room_id', room.id).eq('telegram_id', telegramId).single();
  if (!player) { res.status(404).json({ error: 'Player not found' }); return; }
  const { data: calledNums } = await supabase.from('called_numbers').select('number').eq('room_id', room.id);
  const calledNumbers = (calledNums || []).map((c: any) => c.number);
  const cellNumber = player.bingo_card[row][col];
  if (cellNumber !== 0 && !calledNumbers.includes(cellNumber)) { res.status(400).json({ error: 'Number not called yet!' }); return; }
  const newMarked = player.marked_cells.map((r: boolean[], ri: number) => r.map((c: boolean, ci: number) => (ri === row && ci === col) ? true : c));
  await supabase.from('room_players').update({ marked_cells: newMarked }).eq('id', player.id);
  res.json({ success: true, markedCells: newMarked });
});

router.post('/room/:code/bingo', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const { data: room } = await supabase.from('rooms').select('*').eq('code', req.params.code.toUpperCase()).single();
  if (!room || room.status !== 'playing') { res.status(400).json({ error: 'Game not active' }); return; }
  const { data: player } = await supabase.from('room_players').select('*').eq('room_id', room.id).eq('telegram_id', telegramId).single();
  if (!player) { res.status(404).json({ error: 'Player not found' }); return; }
  const { data: calledNums } = await supabase.from('called_numbers').select('number').eq('room_id', room.id);
  const calledNumbers = (calledNums || []).map((c: any) => c.number);
  if (!checkBingo(player.bingo_card, player.marked_cells, calledNumbers)) { res.status(400).json({ error: 'No valid BINGO!' }); return; }
  await supabase.from('room_players').update({ has_bingo: true }).eq('id', player.id);
  await supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id);
  await supabase.rpc('increment_wins', { player_telegram_id: telegramId });
  res.json({ success: true, winner: player.username });
});

router.get('/leaderboard', validateTelegramAuth, async (_req, res) => {
  const { data } = await supabase.from('users').select('username,first_name,total_wins,total_games').order('total_wins', { ascending: false }).limit(20);
  res.json({ leaderboard: data || [] });
});

export default router;
