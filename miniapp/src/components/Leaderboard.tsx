import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface LeaderboardEntry {
  username: string;
  first_name: string;
  total_wins: number;
  total_games: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.leaderboard()
      .then(res => setData(res.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-400">Loading leaderboard...</div>;

  return (
    <div className="w-full">
      <h2 className="text-lg font-bold text-center mb-4">🏆 Leaderboard</h2>
      {data.length === 0 ? (
        <div className="text-center text-gray-400">No games played yet!</div>
      ) : (
        <div className="space-y-2">
          {data.map((entry, i) => {
            const winRate = entry.total_games > 0 ? ((entry.total_wins / entry.total_games) * 100).toFixed(0) : 0;
            return (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
                i === 0 ? 'bg-yellow-900/40 border border-yellow-600/40' :
                i === 1 ? 'bg-gray-600/40 border border-gray-400/40' :
                i === 2 ? 'bg-orange-900/40 border border-orange-600/40' :
                'bg-gray-800'
              }`}>
                <div className="text-2xl w-8 text-center">{MEDALS[i] || `${i+1}`}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{entry.first_name} <span className="text-gray-400">@{entry.username}</span></div>
                  <div className="text-xs text-gray-400">{entry.total_games} games · {winRate}% win rate</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-400">{entry.total_wins}</div>
                  <div className="text-xs text-gray-400">wins</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
