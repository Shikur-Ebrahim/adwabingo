import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Trophy, TrendingUp, Coins, Target,
  Gamepad2, Crown, XCircle, Clock, RefreshCw, ChevronDown, Hash, Zap, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface GameRecord {
  game_id: string;
  game_number: string | null;
  stake: number;
  status: string;
  prize_pool: number;
  cartela_number: number | null;
  created_at: string | null;
  finished_at: string | null;
  start_at: string | null;
  is_winner: boolean;
  winner_name: string | null;
  winner_prize: number;
  total_calls: number;
}
interface Stats {
  total: number; wins: number;
  total_wagered: number; total_won: number; win_rate: number;
}

const STAKE_META: Record<number, { label: string; color: string; light: string; dot: string }> = {
  10:  { label: '10 ETB',  color: 'from-blue-500 to-cyan-500',    light: 'bg-blue-50',   dot: 'bg-blue-500' },
  20:  { label: '20 ETB',  color: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50',dot: 'bg-emerald-500' },
  50:  { label: '50 ETB',  color: 'from-violet-500 to-purple-600',light: 'bg-violet-50', dot: 'bg-violet-500' },
  100: { label: '100 ETB', color: 'from-rose-500 to-pink-600',    light: 'bg-rose-50',   dot: 'bg-rose-500' },
};
const defaultMeta = { label: 'ETB', color: 'from-slate-500 to-slate-700', light: 'bg-slate-50', dot: 'bg-slate-500' };

function timeAgo(d: string | null): string {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Filter = 'all' | 'wins' | 'losses';

export default function GamesReport() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

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
      setGames(prev => replace ? (data.games || []) : [...prev, ...(data.games || [])]);
      setStats(data.stats);
      setHasMore(data.has_more);
      setPage(p);
    } finally { setLoading(false); setLoadingMore(false); }
  }, [headers]);

  useEffect(() => { fetchReport(1, true); }, []);

  const filtered = games.filter(g =>
    filter === 'wins'   ? g.is_winner :
    filter === 'losses' ? (!g.is_winner && g.status === 'finished') : true
  );
  const winsCount   = games.filter(g => g.is_winner).length;
  const lossesCount = games.filter(g => !g.is_winner && g.status === 'finished').length;

  return (
    <div className="min-h-screen bg-[#F2F4F8] pb-10">

      {/* ── HERO HEADER ── */}
      <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 pt-5 pb-8 px-4 overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-4 right-16 w-20 h-20 rounded-full bg-yellow-400/10" />

        {/* top bar */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="text-center">
            <h1 className="text-base font-black text-white tracking-wide">GAMES REPORT</h1>
          </div>
          <button onClick={() => fetchReport(1, true)}
            className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center active:scale-90 transition-all">
            <RefreshCw size={15} className={`text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* HERO STATS — 4 bubbles */}
        {stats && (
          <div className="relative z-10 grid grid-cols-2 gap-3">
            {/* WINS */}
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 shadow-lg shadow-orange-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-[9px] font-black uppercase tracking-widest">Total Wins</span>
                <Trophy size={14} className="text-white/80" />
              </div>
              <p className="text-5xl font-black text-white leading-none">{stats.wins}</p>
              <p className="text-white/60 text-[10px] mt-1">{stats.total} games played</p>
            </div>

            {/* WIN RATE */}
            <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl p-4 shadow-lg shadow-purple-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-[9px] font-black uppercase tracking-widest">Win Rate</span>
                <TrendingUp size={14} className="text-white/80" />
              </div>
              <p className="text-5xl font-black text-white leading-none">{stats.win_rate}<span className="text-2xl">%</span></p>
              <p className="text-white/60 text-[10px] mt-1">of finished games</p>
            </div>

            {/* WAGERED */}
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-[9px] font-black uppercase tracking-widest">Wagered</span>
                <Coins size={14} className="text-white/50" />
              </div>
              <p className="text-2xl font-black text-white leading-none">{stats.total_wagered.toLocaleString()}</p>
              <p className="text-white/40 text-[10px] mt-1">ETB total</p>
            </div>

            {/* WON */}
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Prize Won</span>
                <Target size={14} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400 leading-none">{stats.total_won.toLocaleString()}</p>
              <p className="text-white/40 text-[10px] mt-1">ETB total</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium text-sm">Loading games...</p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">

          {/* ── FILTER TABS ── */}
          <div className="bg-white rounded-2xl p-1.5 flex gap-1.5 shadow-sm">
            {([
              { key: 'all' as Filter,    label: `All`,           count: stats?.total || 0,  active: 'bg-slate-800 text-white' },
              { key: 'wins' as Filter,   label: `🏆 Wins`,       count: winsCount,           active: 'bg-yellow-400 text-white' },
              { key: 'losses' as Filter, label: `❌ Losses`,     count: lossesCount,         active: 'bg-rose-500 text-white' },
            ]).map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${filter === t.key ? t.active : 'text-slate-400'}`}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* ── GAME CARDS ── */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                <Gamepad2 size={36} className="text-slate-300" />
              </div>
              <p className="font-black text-slate-700 text-base mb-1">No games yet</p>
              <p className="text-slate-400 text-sm">Join a bingo game to see your history!</p>
            </div>
          ) : (
            <>
              {filtered.map(g => {
                const meta = STAKE_META[g.stake] || defaultMeta;
                const isFinished = g.status === 'finished';
                const isLive     = g.status === 'waiting' || g.status === 'calling';
                const profit     = g.is_winner ? g.winner_prize - g.stake : -g.stake;

                return (
                  <div key={g.game_id} className="bg-white rounded-2xl overflow-hidden shadow-sm">

                    {/* ── TOP STRIPE ── */}
                    <div className={`bg-gradient-to-r ${meta.color} px-4 py-3`}>
                      <div className="flex items-center justify-between">
                        {/* Left: stake + game# */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <Gamepad2 size={15} className="text-white" />
                          </div>
                          <div>
                            <p className="text-white font-black text-sm leading-none">{g.stake} ETB</p>
                            {g.game_number && (
                              <p className="text-white/60 text-[10px] flex items-center gap-0.5 mt-0.5">
                                <Hash size={8} />Game {g.game_number}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: status pill */}
                        {g.is_winner ? (
                          <div className="bg-yellow-300 rounded-full px-3 py-1 flex items-center gap-1.5">
                            <Crown size={11} className="text-yellow-800" />
                            <span className="text-yellow-900 font-black text-[11px]">YOU WON!</span>
                          </div>
                        ) : isLive ? (
                          <div className="bg-white/20 rounded-full px-3 py-1 flex items-center gap-1.5">
                            <Zap size={10} className="text-white" />
                            <span className="text-white font-black text-[11px]">LIVE</span>
                          </div>
                        ) : (
                          <div className="bg-white/20 rounded-full px-3 py-1">
                            <span className="text-white/80 font-bold text-[11px]">FINISHED</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── BODY ── */}
                    <div className="px-4 py-3">
                      {/* Stats row */}
                      <div className="flex items-center gap-0 mb-3">
                        <div className="flex-1 text-center">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">Cartela</p>
                          <p className="text-xl font-black text-slate-800">
                            {g.cartela_number ? `#${g.cartela_number}` : '—'}
                          </p>
                        </div>
                        <div className="w-px h-10 bg-gray-100" />
                        <div className="flex-1 text-center">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">Prize Pool</p>
                          <p className="text-xl font-black text-slate-800">
                            {g.prize_pool.toLocaleString()}
                            <span className="text-[10px] text-slate-400 font-bold"> ETB</span>
                          </p>
                        </div>
                        <div className="w-px h-10 bg-gray-100" />
                        <div className="flex-1 text-center">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">Calls</p>
                          <p className="text-xl font-black text-slate-800">{g.total_calls}</p>
                        </div>
                      </div>

                      {/* Result + time row */}
                      <div className={`rounded-xl px-3 py-2.5 flex items-center justify-between ${
                        g.is_winner ? 'bg-yellow-50' : isLive ? 'bg-blue-50' : 'bg-slate-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          {g.is_winner ? (
                            <>
                              <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center">
                                <Trophy size={13} className="text-white" />
                              </div>
                              <div>
                                <p className="text-yellow-700 font-black text-xs">Won {g.winner_prize.toLocaleString()} ETB</p>
                                <p className="text-yellow-500 text-[10px] font-medium flex items-center gap-0.5">
                                  <Star size={8} />
                                  +{profit.toLocaleString()} ETB profit
                                </p>
                              </div>
                            </>
                          ) : isLive ? (
                            <>
                              <div className="w-7 h-7 rounded-full bg-blue-400 flex items-center justify-center">
                                <Clock size={13} className="text-white" />
                              </div>
                              <p className="text-blue-600 font-bold text-xs">Game in progress</p>
                            </>
                          ) : (
                            <>
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                                <XCircle size={13} className="text-slate-400" />
                              </div>
                              <div>
                                <p className="text-slate-500 font-bold text-xs">
                                  Won by {g.winner_name || 'another player'}
                                </p>
                                <p className="text-slate-400 text-[10px]">{profit.toLocaleString()} ETB</p>
                              </div>
                            </>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {timeAgo(g.finished_at || g.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Load more */}
              {hasMore && (
                <button onClick={() => fetchReport(page + 1)} disabled={loadingMore}
                  className="w-full py-4 rounded-2xl bg-white text-slate-500 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm border border-gray-100">
                  {loadingMore
                    ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    : <><ChevronDown size={16} /> Load more games</>}
                </button>
              )}
              <div className="h-2" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
