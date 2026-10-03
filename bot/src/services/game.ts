import { supabase } from './supabase';
import { generateBingoCard, initMarkedCells, generateRoomCode, checkBingo } from './bingo';
import { Room, Player, User } from '../types';

export async function upsertUser(telegramId: string, username: string, firstName: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .upsert({ telegram_id: telegramId, username, first_name: firstName }, { onConflict: 'telegram_id' })
    .select().single();
  if (error) throw error;
  return data as User;
}

export async function createRoom(hostTelegramId: string, chatId: string): Promise<Room> {
  const { data: userRecord } = await supabase.from('users').select('id').eq('telegram_id', hostTelegramId).single();
  if (!userRecord) throw new Error('User not found');

  let code = generateRoomCode();
  let existing = await supabase.from('rooms').select('id').eq('code', code).eq('status', 'waiting');
  while (existing.data && existing.data.length > 0) {
    code = generateRoomCode();
    existing = await supabase.from('rooms').select('id').eq('code', code).eq('status', 'waiting');
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert({ code, host_id: userRecord.id, status: 'waiting', chat_id: chatId })
    .select().single();
  if (error) throw error;
  return data as Room;
}

export async function joinRoom(code: string, telegramId: string, username: string): Promise<{ room: Room; player: Player }> {
  const { data: room, error: roomError } = await supabase
    .from('rooms').select('*').eq('code', code.toUpperCase()).eq('status', 'waiting').single();
  if (roomError || !room) throw new Error('Room not found or game already started');

  const { data: user } = await supabase.from('users').select('id').eq('telegram_id', telegramId).single();
  if (!user) throw new Error('User not found. Send /start first!');

  const { data: existing } = await supabase.from('room_players').select('*').eq('room_id', room.id).eq('user_id', user.id).single();
  if (existing) throw new Error('You already joined this room!');

  const card = generateBingoCard();
  const markedCells = initMarkedCells();

  const { data: player, error: playerError } = await supabase
    .from('room_players')
    .insert({ room_id: room.id, user_id: user.id, telegram_id: telegramId, username, bingo_card: card, marked_cells: markedCells, has_bingo: false })
    .select().single();
  if (playerError) throw playerError;
  return { room: room as Room, player: player as Player };
}

export async function startGame(roomCode: string, hostTelegramId: string): Promise<Room> {
  const { data: userRecord } = await supabase.from('users').select('id').eq('telegram_id', hostTelegramId).single();
  if (!userRecord) throw new Error('User not found');

  const { data: room } = await supabase.from('rooms').select('*').eq('code', roomCode).eq('status', 'waiting').single();
  if (!room) throw new Error('Room not found or already started');
  if (room.host_id !== userRecord.id) throw new Error('Only the host can start the game!');

  const { data: players } = await supabase.from('room_players').select('id').eq('room_id', room.id);
  if (!players || players.length < 2) throw new Error('Need at least 2 players to start!');

  const { data: updatedRoom, error } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', room.id).select().single();
  if (error) throw error;
  return updatedRoom as Room;
}

export async function callNumber(roomId: string): Promise<number> {
  const { data: called } = await supabase.from('called_numbers').select('number').eq('room_id', roomId);
  const calledNums = (called || []).map((c: any) => c.number);
  const available: number[] = [];
  for (let i = 1; i <= 75; i++) { if (!calledNums.includes(i)) available.push(i); }
  if (available.length === 0) throw new Error('All 75 numbers have been called!');
  const number = available[Math.floor(Math.random() * available.length)];
  const { error } = await supabase.from('called_numbers').insert({ room_id: roomId, number });
  if (error) throw error;
  return number;
}

export async function getCalledNumbers(roomId: string): Promise<number[]> {
  const { data } = await supabase.from('called_numbers').select('number').eq('room_id', roomId).order('called_at', { ascending: true });
  return (data || []).map((d: any) => d.number);
}

export async function getRoomPlayers(roomId: string): Promise<Player[]> {
  const { data, error } = await supabase.from('room_players').select('*').eq('room_id', roomId);
  if (error) throw error;
  return data as Player[];
}

export async function claimBingo(roomId: string, telegramId: string): Promise<string> {
  const { data: player } = await supabase.from('room_players').select('*').eq('room_id', roomId).eq('telegram_id', telegramId).single();
  if (!player) throw new Error('You are not in this room!');

  const calledNums = await getCalledNumbers(roomId);
  const hasBingo = checkBingo(player.bingo_card, player.marked_cells, calledNums);
  if (!hasBingo) throw new Error('No valid BINGO found on your card! Keep playing!');

  await supabase.from('room_players').update({ has_bingo: true }).eq('id', player.id);
  await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
  await supabase.rpc('increment_wins', { player_telegram_id: telegramId });
  return player.username;
}

export async function getHostRoom(hostTelegramId: string, chatId: string): Promise<Room | null> {
  const { data: userRecord } = await supabase.from('users').select('id').eq('telegram_id', hostTelegramId).single();
  if (!userRecord) return null;
  const { data: room } = await supabase.from('rooms').select('*').eq('host_id', userRecord.id).eq('chat_id', chatId).in('status', ['waiting', 'playing']).order('created_at', { ascending: false }).limit(1).single();
  return room as Room | null;
}
