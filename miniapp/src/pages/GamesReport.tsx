import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Trophy, Target, TrendingUp, Coins, Gamepad2, Crown, XCircle, Clock, RefreshCw, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface GameRecord {
  game_id: string;
  stake: number;
  status: string;
  prize_pool: number;
  cartela_number: number;
  joined_at: string;
  finished_at: string | null;
  start_at: string | null;
  is_winner: boolean;
  winner_name: string | null;
  winner_prize: number | null;
  total_calls: number;
}

interface Stats {
  total: number;
  wins: number;
  total_wagered: number;
  total_won: number;
  win_rate: number;
}

const STAKE_COLORS: Record<number, string> = {
  10:  'from-blue-400 to-blue-600',
  20:  'from-green-400 to-green-600',
  50:  'from-purple-400 to-purple-600',
  100: 'from-rose-400 to-rose-600',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'Just now';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function GamesReport() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  }), []);

  const fetchReport = useCallback(async (p: number, replace = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`${API_URL}/games-report?page=${p}`, { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      setGames(prev => replace ? data.games : [...prev, ...data.games]);
      setStats(data.stats);
      setHasMore(data.has_more);
      setPage(p);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [headers]);

  useEffect(() => { fetchReport(1, true); }, []);

  const filtered = games.filter(g => {
    if (filter === 'wins') return g.is_winner;
    if (filter === 'losses') return !g.is_winner && g.status === 'finished';
    return true;
  });

  return (
    <div className="min-h-screen bg-white pb-10">

      {/* ── HEADER ── */}
      <div className="bg-white sticky top-0 z-10 px-4 pt-5 pb-3 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-800">Games Report</h1>
            <p className="text-xs text-slate-400">Your bingo history &amp; stats</p>
          </div>
          <button onClick={() => fetchReport(1, true)}
            className="ml-auto w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
            <RefreshCw size={15} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium text-sm">Loading your games...</p>
        </div>
      ) : (
        <>
          {/* ── STATS CARDS ── */}
          {stats && (
            <div className="px-4 pt-5 pb-3">
              {/* Top row: wins + win rate */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy size={16} className="text-white/80" />
                    <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Total Wins</span>
                  </div>
                  <p className="text-3xl font-black text-white">{stats.wins}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">out of {stats.total} games</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={16} className="text-white/80" />
                    <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Win Rate</span>
                  </div>
                  <p className="text-3xl font-black text-white">{stats.win_rate}%</p>
                  <p className="text-white/70 text-[10px] mt-0.5">finished games</p>
                </div>
              </div>

              {/* Bottom row: wagered + won */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Coins size={14} className="text-slate-400" />
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Played</span>
                  </div>
                  <p className="text-2xl font-black text-slate-800">{stats.total_wagered.toLocaleString()}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">ETB wagered</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Target size={14} className="text-emerald-500" />
                    <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider">Total Won</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-600">{stats.total_won.toLocaleString()}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">ETB prize total</p>
                </div>
              </div>
            </div>
          )}

          {/* ── FILTER TABS ── */}
          <div className="px-4 pb-3 flex gap-2">
            {(['all', 'wins', 'losses'] as const).map(f => (
              <button key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-black transition-all capitalize ${
                  filter === f
                    ? f === 'wins' ? 'bg-yellow-400 text-white'
                      : f === 'losses' ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                {f === 'all' ? `All (${stats?.total || 0})` : f === 'wins' ? `🏆 Wins (${stats?.wins || 0})` : `❌ Losses`}
              </button>
            ))}
          </div>

          {/* ── GAME LIST ── */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <Gamepad2 size={32} className="text-slate-300" />
              </div>
              <p className="font-black text-slate-600">No games yet</p>
              <p className="text-slate-400 text-sm mt-1">Join a bingo game to see your history!</p>
            </div>
          ) : (
            <div className="px-4 space-y-3">
              {filtered.map(g => {
                const gradientClass = STAKE_COLORS[g.stake] || 'from-slate-400 to-slate-600';
                const isFinished = g.status === 'finished';
                const isOngoing = g.status === 'waiting' || g.status === 'calling';

                return (
                  <div key={g.game_id}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                      g.is_winner ? 'border-yellow-200' : isFinished ? 'border-gray-100' : 'border-blue-100'
                    }`}>

                    {/* Top color bar with stake */}
                    <div className={`bg-gradient-to-r ${gradientClass} px-4 py-2.5 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <Gamepad2 size={14} className="text-white/80" />
                        <span className="text-white font-black text-sm">{g.stake} ETB Bingo</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {g.is_winner && (
                          <span className="bg-yellow-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown size={9} /> WIN
                          </span>
                        )}
                        {isFinished && !g.is_winner && (
                          <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                            LOSS
                          </span>
                        )}
                        {isOngoing && (
                          <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock size={9} /> LIVE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-4 py-3 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Cartela</p>
                        <p className="font-black text-slate-800 text-base">#{g.cartela_number}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Prize Pool</p>
                        <p className="font-black text-slate-700 text-base">{(g.prize_pool || 0).toLocaleString()} <span className="text-[10px] text-slate-400">ETB</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Calls</p>
                        <p className="font-black text-slate-700 text-base">{g.total_calls}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 pb-3 flex items-center justify-between">
                      {g.is_winner ? (
                        <div className="flex items-center gap-1.5 bg-yellow-50 rounded-lg px-2.5 py-1.5">
                          <Trophy size={12} className="text-yellow-500" />
                          <span className="text-yellow-700 font-black text-xs">Won {(g.winner_prize || 0).toLocaleString()} ETB</span>
                        </div>
                      ) : isFinished ? (
                        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5">
                          <XCircle size={12} className="text-slate-400" />
                          <span className="text-slate-500 font-bold text-xs">
                            Won by {g.winner_name || 'another player'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-2.5 py-1.5">
                          <Clock size={12} className="text-blue-500" />
                          <span className="text-blue-600 font-bold text-xs">Game in progress</span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">
                        {timeAgo(g.finished_at || g.joined_at)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Load more */}
              {hasMore && (
                <button
                  onClick={() => fetchReport(page + 1)}
                  disabled={loadingMore}
                  className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                  {loadingMore ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><ChevronDown size={16} /> Load more</>
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
