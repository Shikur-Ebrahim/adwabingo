import React from 'react';
import { useGameStore } from '../store/gameStore';

export default function Players() {
  const { players } = useGameStore();
  return (
    <div className="w-full">
      <div className="text-sm font-semibold text-gray-300 mb-2">👥 Players ({players.length})</div>
      <div className="flex flex-wrap gap-2">
        {players.map(p => (
          <div key={p.telegram_id} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            p.has_bingo ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'
          }`}>
            {p.has_bingo ? '🏆' : '👤'} {p.username}
          </div>
        ))}
      </div>
    </div>
  );
}
