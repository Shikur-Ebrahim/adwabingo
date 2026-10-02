import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { tg, getStartParam } from './lib/telegram';
import { api } from './lib/api';
import { Page } from './types';
import Home from './pages/Home';
import Game from './pages/Game';
import Profile from './pages/Profile';
import Leaderboard from './components/Leaderboard';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [authDone, setAuthDone] = useState(false);

  useEffect(() => {
    // Initialize Telegram WebApp
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // Check for room code in start param
    const param = getStartParam();
    if (param) {
      setRoomCode(param);
      setPage('game');
    }

    // Auth with backend
    api.verify().then(() => setAuthDone(true)).catch(() => setAuthDone(true));
  }, []);

  function handleJoinRoom(code: string) {
    setRoomCode(code);
    setPage('game');
  }

  function handleBack() {
    setPage('home');
    setRoomCode(null);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' },
          duration: 3000,
        }}
      />

      {page === 'home' && (
        <Home
          onJoinRoom={handleJoinRoom}
          onGoLeaderboard={() => setPage('leaderboard')}
          onGoProfile={() => setPage('profile')}
        />
      )}

      {page === 'game' && roomCode && (
        <Game roomCode={roomCode} onBack={handleBack} />
      )}

      {page === 'profile' && (
        <Profile onBack={() => setPage('home')} />
      )}

      {page === 'leaderboard' && (
        <div className="min-h-screen px-4 py-6">
          <button onClick={() => setPage('home')} className="text-gray-400 hover:text-white mb-4 flex items-center gap-1">← Back</button>
          <Leaderboard />
        </div>
      )}
    </div>
  );
}
