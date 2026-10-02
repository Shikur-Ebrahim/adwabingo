export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
  max_players: number;
  chat_id: string;
  message_id?: number;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  user_id: string;
  telegram_id: string;
  username: string;
  bingo_card: number[][];
  marked_cells: boolean[][];
  has_bingo: boolean;
  joined_at: string;
}

export interface User {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  last_name?: string;
  total_games: number;
  total_wins: number;
  created_at: string;
}
