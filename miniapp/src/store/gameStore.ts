import { create } from 'zustand';
import { User } from '../types';
import WebApp from '@twa-dev/sdk';

interface GameStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const useGameStore = create<GameStore>((set) => ({
  user: null,
  loading: true,
  error: null,

  fetchUser: async () => {
    try {
      set({ loading: true, error: null });
      
      let initData = '';
      if (typeof WebApp !== 'undefined' && WebApp.initData) {
        initData = WebApp.initData;
      }
      
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      set({ user: data.user, loading: false });
    } catch (error: any) {
      console.error('Error fetching user:', error);
      // For local testing outside Telegram, mock a user if it fails
      set({ 
        loading: false,
        user: {
          id: 'test-id',
          telegram_id: '123456789',
          username: 'testuser',
          first_name: 'Test',
          main_balance: 0,
          bonus_balance: 0,
          role: 'user',
          total_games: 0,
          total_wins: 0
        }
      });
    }
  },
}));
