import { create } from 'zustand';
import { Room, Player, PlayerSummary } from '../types';

interface GameStore {
  room: Room | null;
  player: Player | null;
  players: PlayerSummary[];
  calledNumbers: number[];
  latestNumber: number | null;
  isLoading: boolean;
  error: string | null;
  setRoom: (room: Room) => void;
  setPlayer: (player: Player) => void;
  setPlayers: (players: PlayerSummary[]) => void;
  setCalledNumbers: (nums: number[]) => void;
  addCalledNumber: (n: number) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  updateMarkedCells: (marked: boolean[][]) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  room: null, player: null, players: [], calledNumbers: [], latestNumber: null, isLoading: false, error: null,
  setRoom: (room) => set({ room }),
  setPlayer: (player) => set({ player }),
  setPlayers: (players) => set({ players }),
  setCalledNumbers: (calledNumbers) => set({ calledNumbers, latestNumber: calledNumbers.at(-1) ?? null }),
  addCalledNumber: (n) => set(s => ({ calledNumbers: [...s.calledNumbers, n], latestNumber: n })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  updateMarkedCells: (marked) => set(s => s.player ? { player: { ...s.player, marked_cells: marked } } : {}),
  reset: () => set({ room: null, player: null, players: [], calledNumbers: [], latestNumber: null, error: null }),
}));
