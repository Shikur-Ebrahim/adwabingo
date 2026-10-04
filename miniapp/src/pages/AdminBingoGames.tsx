import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Eye, AlertCircle, Users, ChevronDown, ChevronUp } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';

const API = import.meta.env.VITE_API_URL || '/api';

interface BGame {
  id: string; game_id: string; stake: number; prize_pool: number;
  status: 'waiting' | 'calling' | 'finished';
  called_numbers: number[];
  winner_cartela: number | null; winner_prize: number | null; winner_first_name: string | null;
  start_at: string; finished_at: string | null; created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  waiting:  'bg-amber-100 text-amber-700',
  calling:  'bg-emerald-100 text-emerald-700',
  finished: 'bg-slate-100 text-slate-500',
};

export default function AdminBingoGames() {
  const { user } = useGameStore();
  const [games, setGames]     = useState<BGame[]>([]);
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const hdrs = () => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': WebApp?.initData ?? '',
  });

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/bingo-games`, { headers: hdrs() });
      if (!r.ok) return;
      const data: BGame[] = await r.json();
      setGames(data);

      // Fetch player counts for active/recent games
      const live = data.filter(g => g.status !== 'finished').slice(0, 3);
      const newCounts: Record<string, number> = {};
      await Promise.all(live.map(async g => {
        const r2 = await fetch(`${API}/admin/bingo-games/${g.id}/players`, { headers: hdrs() });
        if (r2.ok) { const d = await r2.json(); newCounts[g.id] = d.count; }
      }));
      setCounts(newCounts);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const forceFinish = async (id: string) => {
    if (!confirm('Force-stop this game? No winner will be declared.')) return;
    await fetch(`${API}/admin/bingo-games/${id}/finish`, { method: 'POST', headers: hdrs() });
    fetchGames();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-bold">Admin access only</p>
        </div>
      </div>
    );
  }

  const liveGame = games.find(g => g.status !== 'finished');

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-500 text-white px-4 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-full bg-white/20 active:scale-90">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black">Bingo Monitor</h1>
            <p className="text-orange-100 text-xs">⚡ Fully automated engine</p>
          </div>
          <button onClick={fetchGames} className="p-2 bg-white/20 rounded-full active:scale-90">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* Engine status card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-black text-slate-700">Engine Running</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            {[
              ['Mode', '🤖 Fully Automatic'],
              ['Call interval', '5 seconds'],
              ['Waiting period', '60 seconds'],
              ['Max players', '150 per game'],
              ['Prize', '80% of total stakes'],
              ['Winner check', 'Server-side (secure)'],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-xl p-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase">{k}</p>
                <p className="font-black text-slate-700 text-xs">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live game */}
        {liveGame ? (
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Game</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[liveGame.status]}`}>
                    {liveGame.status === 'calling' ? '🔴 Calling' : '⏳ Waiting'}
                  </span>
                </div>
                <button onClick={() => setExpanded(expanded === liveGame.id ? null : liveGame.id)}
                  className="p-1.5 bg-slate-100 rounded-lg">
                  {expanded === liveGame.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Game ID</p>
                  <p className="text-2xl font-black text-orange-600">#{liveGame.game_id}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Players</p>
                  <p className="text-2xl font-black text-slate-700">
                    <Users size={14} className="inline mr-0.5 mb-0.5" />
                    {counts[liveGame.id] ?? '…'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Prize Pool</p>
                  <p className="text-2xl font-black text-emerald-600">{liveGame.prize_pool} <span className="text-sm">ETB</span></p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link to="/bingo/live"
                  className="flex-1 py-2 bg-orange-100 text-orange-700 font-black rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95">
                  <Eye size={12}/> Watch Live
                </Link>
                <button onClick={() => forceFinish(liveGame.id)}
                  className="flex-1 py-2 bg-red-100 text-red-600 font-black rounded-xl text-xs active:scale-95">
                  Force Stop
                </button>
              </div>
            </div>

            {/* Expanded: called numbers */}
            {expanded === liveGame.id && liveGame.status === 'calling' && (
              <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">
                  Called Numbers ({liveGame.called_numbers?.length ?? 0}/75)
                </p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {(liveGame.called_numbers ?? []).map(n => (
                    <span key={n} className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{n}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-slate-400">
            <p className="text-4xl mb-2">🎱</p>
            <p className="font-bold">Engine is preparing the next game…</p>
            <p className="text-xs mt-1">Auto-creates a new game every 60 seconds</p>
          </div>
        )}

        {/* Game history */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-700 mb-3">Recent Games</h3>
          {loading ? (
            <div className="flex justify-center py-6"><RefreshCw size={20} className="text-orange-400 animate-spin"/></div>
          ) : (
            <div className="space-y-2">
              {games.filter(g => g.status === 'finished').slice(0, 15).map(g => (
                <div key={g.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-black text-slate-700 text-sm">Game #{g.game_id}</p>
                    <p className="text-xs text-slate-400">
                      {g.winner_cartela
                        ? `?? ${g.winner_first_name || 'Cartela'} #${g.winner_cartela} � ${g.winner_prize} ETB`
                        : '— No winner'}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 text-right">
                    {new Date(g.created_at).toLocaleDateString()}<br/>
                    <span className="text-[10px]">{new Date(g.created_at).toLocaleTimeString()}</span>
                  </p>
                </div>
              ))}
              {games.filter(g => g.status === 'finished').length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No finished games yet</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
