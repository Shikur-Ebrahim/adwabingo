import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import WebApp from '@twa-dev/sdk';

interface GameStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,

      fetchUser: async () => {
        try {
          // Instantly show UI using Telegram data if no cache exists
          if (!get().user && typeof WebApp !== 'undefined' && WebApp.initDataUnsafe?.user) {
            const tgUser = WebApp.initDataUnsafe.user;
            set({
              user: {
                id: 'temp',
                telegram_id: tgUser.id.toString(),
                username: tgUser.username || '',
                first_name: tgUser.first_name || 'User',
                main_balance: 0,
                bonus_balance: 0,
                role: 'user',
                total_games: 0,
                total_wins: 0
              }
            });
          }

          let initData = '';
          if (typeof WebApp !== 'undefined' && WebApp.initData) {
            initData = WebApp.initData;
          }
          
          // Silently fetch real data in background
          const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-telegram-init-data': initData,
            },
          });

          if (response.ok) {
            const data = await response.json();
            set({ user: data.user, loading: false });
          }
        } catch (error: any) {
          console.error('Error fetching user:', error);
          set({ loading: false });
        }
      },
    }),
    {
      name: 'adwabingo-cache', // Saves to phone memory for instant loading
    }
  )
);
