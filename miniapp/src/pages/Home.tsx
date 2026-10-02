import React, { useState } from 'react';
import { getTelegramUser } from '../lib/telegram';

interface HomeProps {
  onJoinRoom: (code: string) => void;
  onGoLeaderboard: () => void;
  onGoProfile: () => void;
}

export default function Home({ onJoinRoom, onGoLeaderboard, onGoProfile }: HomeProps) {
  const [code, setCode] = useState('');
  const user = getTelegramUser();

  function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      alert('Room code must be 6 characters!');
      return;
    }
    onJoinRoom(trimmed);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="text-6xl mb-4">🎱</div>
      <h1 className="text-3xl font-black text-white mb-1">ADWA Bingo</h1>
      <p className="text-gray-400 text-sm mb-8">Play Bingo with friends on Telegram!</p>

      {user && (
        <div className="bg-gray-800 rounded-2xl px-4 py-3 mb-6 text-center">
          <div className="text-white font-semibold">{user.first_name} {user.last_name}</div>
          {user.username && <div className="text-gray-400 text-sm">@{user.username}</div>}
        </div>
      )}

      <div className="w-full max-w-sm space-y-3">
        <div className="bg-gray-800 rounded-2xl p-4">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-2">Enter Room Code</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            maxLength={6}
            className="w-full bg-gray-700 text-white text-center text-2xl font-bold tracking-widest rounded-xl px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={handleJoin}
            disabled={code.trim().length !== 6}
            className="w-full mt-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
          >
            🎮 Join Room
          </button>
        </div>

        <button
          onClick={onGoLeaderboard}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          🏆 Leaderboard
        </button>

        <button
          onClick={onGoProfile}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          👤 My Profile
        </button>
      </div>

      <p className="text-gray-600 text-xs mt-8 text-center">Create a room in the Telegram bot with /newgame</p>
    </div>
  );
}
