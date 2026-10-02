export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  telegram_id: string;
  username: string;
  bingo_card: number[][];
  marked_cells: boolean[][];
  has_bingo: boolean;
}

export interface PlayerSummary {
  telegram_id: string;
  username: string;
  has_bingo: boolean;
}

export type Page = 'home' | 'game' | 'profile' | 'leaderboard';
