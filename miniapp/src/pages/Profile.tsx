import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getTelegramUser } from '../lib/telegram';

interface ProfileProps { onBack: () => void; }

export default function Profile({ onBack }: ProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const tgUser = getTelegramUser();

  useEffect(() => {
    Promise.all([api.profile(), api.history()])
      .then(([p, h]) => { setProfile(p.player); setHistory(h.history); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

  const winRate = profile && profile.total_games > 0
    ? ((profile.total_wins / profile.total_games) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen px-4 py-6">
      <button onClick={onBack} className="text-gray-400 hover:text-white mb-4 flex items-center gap-1">
        ← Back
      </button>

      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-3">🎱</div>
        <h2 className="text-xl font-bold">{tgUser?.first_name} {tgUser?.last_name}</h2>
        {tgUser?.username && <p className="text-gray-400">@{tgUser.username}</p>}
      </div>

      {profile && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[['🎮', profile.total_games, 'Games'], ['🏆', profile.total_wins, 'Wins'], ['📊', `${winRate}%`, 'Win Rate']].map(([icon, val, label]) => (
            <div key={label as string} className="bg-gray-800 rounded-2xl p-3 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="font-bold text-white text-lg">{val}</div>
              <div className="text-gray-400 text-xs">{label}</div>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-semibold text-gray-300 mb-3">Recent Games</h3>
      {history.length === 0 ? (
        <div className="text-gray-500 text-center py-4">No games yet!</div>
      ) : (
        <div className="space-y-2">
          {history.map((h, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-purple-400 font-bold">{(h.rooms as any)?.code}</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  (h.rooms as any)?.status === 'finished' ? 'bg-gray-600 text-gray-300' : 'bg-green-800 text-green-300'
                }`}>{(h.rooms as any)?.status}</span>
              </div>
              {h.has_bingo && <span className="text-yellow-400">🏆 Won!</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
