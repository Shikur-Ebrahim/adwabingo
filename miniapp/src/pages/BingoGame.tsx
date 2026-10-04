import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Gift, RefreshCw, Users, Clock, Trophy } from "lucide-react";
import WebApp from "@twa-dev/sdk";
import { supabase } from "../lib/supabase";
import { useGameStore } from "../store/gameStore";

const API = import.meta.env.VITE_API_URL || "/api";

interface BGame {
  id: string; game_id: string; stake: number; prize_pool: number;
  status: "waiting" | "calling" | "finished";
  called_numbers: number[];
  winner_cartela: number | null; winner_telegram_id: string | null;
  winner_first_name: string | null; winner_prize: number | null;
  start_at: string; finished_at: string | null;
}
interface MyCard { cartela_number: number; card_matrix: number[][]; }

const hdrs = () => ({
  "Content-Type": "application/json",
  "x-telegram-init-data": WebApp?.initData ?? "",
});

const ROW_COLORS = [
  "from-blue-500 to-blue-700","from-purple-500 to-purple-700","from-cyan-500 to-cyan-700",
  "from-red-500 to-red-700","from-orange-400 to-orange-600","from-yellow-400 to-yellow-600",
  "from-green-500 to-green-700","from-teal-500 to-teal-700","from-indigo-400 to-indigo-600",
  "from-pink-400 to-pink-600","from-violet-500 to-violet-700","from-blue-400 to-blue-600",
  "from-fuchsia-500 to-fuchsia-700","from-emerald-500 to-emerald-700","from-purple-400 to-purple-600",
];

const STAKE_OPTIONS = [
  { value: 10, label: "10 ETB", color: "from-blue-500 to-blue-700" },
  { value: 20, label: "20 ETB", color: "from-teal-500 to-teal-700" },
  { value: 50, label: "50 ETB", color: "from-purple-500 to-purple-700" },
  { value: 100, label: "100 ETB", color: "from-rose-500 to-rose-700" },
];

const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];

const getLetterColor = (l: string) => {
  switch(l) {
    case 'B': return '#f59e0b'; // Amber
    case 'I': return '#3b82f6'; // Blue
    case 'N': return '#ec4899'; // Pink
    case 'G': return '#22c55e'; // Green
    case 'O': return '#a855f7'; // Purple
    default: return '#fff';
  }
};

export default function BingoGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, fetchUser: refreshUser, subscribeToBalance } = useGameStore();

  const urlStake = searchParams.get("stake");
  const [selectedStake, setSelectedStake] = useState<number | null>(
    urlStake ? Number(urlStake) : null
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const initAudio = () => {
    if (!audioCtxRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) audioCtxRef.current = new AudioContext();
      } catch (e) {}
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playPopSound = useCallback(() => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!user?.telegram_id) return;
    const unsub = subscribeToBalance();
    return () => unsub();
  }, [subscribeToBalance, user?.telegram_id]);

  const [game, setGame] = useState<BGame | null>(null);
  const [taken, setTaken] = useState<number[]>([]);
  const [myCard, setMyCard] = useState<MyCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const gameIdRef = useRef<string | null>(null);
  const prevCalledLenRef = useRef(0);

  const fetchState = useCallback(async () => {
    if (!selectedStake) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/bingo/current?stake=${selectedStake}`, { headers: hdrs() });
      if (r.ok) {
        const d = await r.json();
        setGame(d.game); setTaken(d.taken_cartelas ?? []); setMyCard(d.my_card ?? null);
        gameIdRef.current = d.game?.id ?? null;
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [selectedStake]);

  useEffect(() => { if (selectedStake) fetchState(); }, [selectedStake, fetchState]);

  useEffect(() => {
    if (!selectedStake) return;
    const ch = supabase.channel(`bingo-rt-${selectedStake}-${Date.now()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bingo_games" }, ({ new: g }) => {
        if (Number(g.stake) === selectedStake) setGame(g as BGame);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bingo_games" }, () => { fetchState(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bingo_players" }, ({ new: p }) => {
        const np = p as { game_id: string; cartela_number: number };
        if (np.game_id === gameIdRef.current) setTaken(prev => prev.includes(np.cartela_number) ? prev : [...prev, np.cartela_number]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedStake, fetchState]);

  useEffect(() => {
    if (!game || game.status !== "waiting") return;
    const update = () => {
      const diff = Math.ceil((new Date(game.start_at).getTime() - Date.now()) / 1000);
      setTimeLeft(Math.max(0, diff));
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [game?.status, game?.start_at]);

  const called = game?.called_numbers ?? [];
  const lastNum = called.length > 0 ? called[called.length - 1] : null;

  useEffect(() => {
    if (game?.status === 'calling' && called.length > prevCalledLenRef.current) {
      playPopSound();
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light');
    }
    prevCalledLenRef.current = called.length;
  }, [called.length, game?.status, playPopSound]);

  const joinGame = async (seat: number) => {
    initAudio();
    if (!game || game.status !== "waiting") return;
    if (myCard) { setErrMsg("You already have a cartela!"); return; }
    if (taken.includes(seat)) { setErrMsg("Taken! Pick another."); return; }
    const bonusBal = Number(user?.bonus_balance || 0);
    const mainBal = Number(user?.main_balance || 0);
    const totalBal = bonusBal + mainBal;
    if (!user || totalBal < game.stake) { setErrMsg(`Need ${game.stake} ETB`); return; }
    setBuying(seat); setErrMsg("");

    setTaken(prev => [...prev, seat]);
    const stakeAmt = game.stake;
    let newBonus = bonusBal;
    let newMain = mainBal;
    if (newBonus >= stakeAmt) { newBonus -= stakeAmt; }
    else { const r = stakeAmt - newBonus; newBonus = 0; newMain -= r; }
    useGameStore.setState(s => ({ user: s.user ? { ...s.user, main_balance: newMain, bonus_balance: newBonus } : s.user }));

    const newCount = taken.length + 1;
    const newPrize = newCount < 3 ? newCount * stakeAmt : Math.floor(newCount * stakeAmt * 0.8);
    setGame(prev => prev ? { ...prev, prize_pool: newPrize } : prev);

    try {
      const r = await fetch(`${API}/bingo/join`, {
        method: "POST", headers: hdrs(),
        body: JSON.stringify({ cartela_number: seat, stake: selectedStake })
      });
      const d = await r.json();
      if (r.ok) {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred("success");
        setMyCard({ cartela_number: seat, card_matrix: d.card_matrix });
        refreshUser();
      } else {
        setTaken(prev => prev.filter(n => n !== seat));
        useGameStore.setState(s => ({ user: s.user ? { ...s.user, main_balance: mainBal, bonus_balance: bonusBal } : s.user }));
        setErrMsg(d.error ?? "Could not join. Try again.");
        fetchState();
      }
    } catch { setErrMsg("Network error"); } finally { setBuying(null); }
  };

  const iWon = game?.status === "finished" && myCard?.cartela_number === game.winner_cartela && game.winner_telegram_id === String(user?.telegram_id);
  const formatMoney = (a: number | undefined) => (a || 0).toLocaleString("en-US");
  const initial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : "U";
  let statusTxt = "Finished", statusCls = "text-slate-400";
  if (game?.status === "waiting") {
    statusTxt = timeLeft > 86400 ? "Waiting..." : `${timeLeft}s`;
    statusCls = "text-orange-400";
  } else if (game?.status === "calling") { statusTxt = "Active"; statusCls = "text-emerald-400"; }

  if (!selectedStake) {
    return (
      <div className="min-h-screen bg-[#05081a] flex flex-col select-none" onClick={initAudio}>
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">{initial}</div>
            <p className="font-bold text-sm uppercase tracking-wider text-slate-200">{user?.first_name || "USER"}</p>
          </div>
          <div className="flex items-center space-x-4 text-right">
            <div className="flex flex-col items-center"><Gift size={14} className="text-purple-400 mb-0.5" /><p className="text-xs font-bold text-slate-300">{formatMoney(user?.bonus_balance)} ETB</p></div>
            <div className="flex flex-col items-end"><p className="text-[11px] text-slate-400">Wallet</p><p className="text-sm font-bold text-green-400">{formatMoney(user?.main_balance)} ETB</p></div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <p className="text-4xl mb-3">&#127922;</p>
          <h2 className="text-white font-black text-2xl mb-1">ADWA Bingo</h2>
          <p className="text-white/50 text-sm mb-8">Select your stake to enter a game</p>

          <div className="grid grid-cols-2 gap-3 w-full max-w-[300px]">
            {STAKE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { initAudio(); setSelectedStake(opt.value); }}
                className={`bg-gradient-to-br ${opt.color} rounded-2xl p-5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all shadow-lg`}>
                <span className="text-white font-black text-3xl">{opt.value}</span>
                <span className="text-white/80 font-bold text-xs uppercase tracking-wider">ETB</span>
              </button>
            ))}
          </div>
          <button onClick={() => navigate(-1)} className="mt-8 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-white/50 text-sm font-bold active:scale-95">Back to Games</button>
        </div>
      </div>
    );
  }

  if (loading && !game) return <div className="min-h-screen bg-[#05081a] flex items-center justify-center"><RefreshCw size={28} className="text-orange-500 animate-spin" /></div>;

  if (!game) {
    return (
      <div className="min-h-screen bg-[#05081a] flex flex-col items-center justify-center text-white gap-4">
        <span className="text-5xl">&#127922;</span>
        <p className="font-bold text-lg">Preparing next game...</p>
        <button onClick={fetchState} className="px-6 py-2.5 bg-orange-500 text-black font-black rounded-full text-sm">Refresh</button>
        <button onClick={() => setSelectedStake(null)} className="text-white/40 text-xs underline mt-2">Change Stake</button>
      </div>
    );
  }

  const renderCallingBoard = () => {
    const recent = [...called].reverse().slice(0, 5);
    return (
      <div className="flex flex-col gap-4 p-3 max-w-md mx-auto w-full">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between bg-[#0f172a] p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold"><span className="text-slate-500">ID:</span> {game.game_id}</div>
          <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold"><Trophy size={14}/> {game.prize_pool} ETB</div>
          <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold"><Users size={14}/> {taken.length}</div>
          <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><Clock size={14}/> {called.length}/75</div>
          <div className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-black animate-pulse">LIVE</div>
        </div>

        {/* 1-75 Tracker Board */}
        <div className="bg-[#0b1120] rounded-xl p-2 border border-slate-800 shadow-inner">
          <div className="flex flex-col gap-1">
            {BINGO_LETTERS.map((letter, rowIndex) => (
              <div key={letter} className="flex items-center gap-1">
                <div className="w-5 flex-shrink-0 flex items-center justify-center font-black text-sm" style={{ color: getLetterColor(letter) }}>{letter}</div>
                <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                  {Array.from({ length: 15 }, (_, i) => {
                    const num = rowIndex * 15 + i + 1;
                    const isCalled = called.includes(num);
                    return (
                      <div key={num} className={`aspect-square rounded-[3px] flex items-center justify-center text-[8px] font-bold transition-colors ${
                        isCalled ? 'bg-yellow-500 text-yellow-950 shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'bg-slate-800/60 text-slate-500'
                      }`}>{num}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Balls */}
        <div className="flex items-center justify-center gap-2 h-16">
          {recent.length === 0 ? <span className="text-slate-500 text-xs font-bold animate-pulse">Waiting for first draw...</span> : recent.map((num, idx) => {
            const isLatest = idx === 0;
            const letter = BINGO_LETTERS[Math.floor((num - 1) / 15)];
            const color = getLetterColor(letter);
            return (
              <div key={`${num}-${idx}`} className={`flex flex-col items-center justify-center rounded-full font-black shadow-lg border-2 transition-all duration-300 ${
                isLatest ? 'w-14 h-14 border-yellow-400 bg-yellow-400/20 scale-110 z-10' : 'w-10 h-10 border-slate-700 bg-slate-800 opacity-60'
              }`}>
                <span style={{ color }} className={isLatest ? 'text-[10px] leading-none mb-0.5' : 'text-[8px] leading-none'}>{letter}</span>
                <span className={isLatest ? 'text-yellow-400 text-xl leading-none' : 'text-slate-300 text-xs leading-none'}>{num}</span>
              </div>
            );
          })}
        </div>

        {/* My Card (if joined) */}
        {myCard ? (
          <div className="max-w-[280px] mx-auto w-full bg-[#131b31] p-3 rounded-2xl border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {BINGO_LETTERS.map(l => <div key={l} className="text-center font-black text-lg" style={{ color: getLetterColor(l) }}>{l}</div>)}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }).flatMap((_, r) => Array.from({ length: 5 }).map((_, c) => {
                const num = myCard.card_matrix[r][c];
                const isFree = num === 0;
                const marked = isFree || called.includes(num);
                const isLast = num === lastNum;
                return (
                  <div key={`${r}-${c}`} className={`aspect-square rounded-xl flex items-center justify-center font-black text-base transition-all duration-300 ${
                    isFree ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_10px_rgba(250,204,21,0.5)]' :
                    isLast ? 'bg-orange-500 text-white scale-110 shadow-[0_0_15px_rgba(249,115,22,0.6)] z-10' :
                    marked ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' :
                    'bg-slate-800/80 text-slate-300 border border-slate-700'
                  }`}>{isFree ? "★" : num}</div>
                );
              }))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-slate-800/30 rounded-xl border border-slate-800">
            <p className="text-slate-400 text-sm font-bold">You are spectating this match</p>
          </div>
        )}
      </div>
    );
  };

  const renderCartelaPicker = () => (
    <div className="flex-1 overflow-y-auto relative p-2">
      <p className="text-center text-[10px] text-cyan-300 font-black uppercase tracking-widest mb-2">
        {!myCard ? `TAP TO PICK YOUR CARTELA - ${taken.length}/150 TAKEN` : `CARTELA #${myCard.cartela_number} SECURED`}
      </p>
      <div className="rounded-2xl border-[3px] border-cyan-400 overflow-hidden bg-[#05081a] shadow-[0_0_25px_rgba(34,211,238,0.4)]">
        <div className="grid gap-[2px] p-[2px]" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
          {Array.from({ length: 150 }, (_, i) => {
            const n = i + 1;
            const row = Math.floor(i / 10);
            const isTaken = taken.includes(n);
            const isMine = myCard?.cartela_number === n;
            const isBuying = buying === n;
            const grad = ROW_COLORS[row % ROW_COLORS.length];
            
            let ring = "";
            let badge: React.ReactNode = n;
            if (isMine) {
              ring = "ring-[2.5px] ring-yellow-300 z-10";
              badge = <span className="text-yellow-200 font-black text-xs">✓</span>;
            } else if (isTaken) {
              ring = "opacity-40";
              badge = <span className="text-white/60 text-[9px] font-black">✓</span>;
            } else if (!isMine && !isTaken) {
              ring = isBuying ? "opacity-40 scale-90" : "active:scale-90 cursor-pointer";
            }
            return (
              <button key={n} disabled={isTaken || buying !== null || !!myCard} onClick={() => joinGame(n)}
                className={`aspect-square flex items-center justify-center rounded-[7px] text-[11px] font-black text-white bg-gradient-to-b transition-all duration-150 ${grad} ${ring}`}>
                {badge}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05081a] flex flex-col select-none" onClick={initAudio}>
      {/* Header Bar */}
      <div className="sticky top-0 z-50 bg-[#05081a] flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">{initial}</div>
            <p className="font-bold text-sm uppercase tracking-wider text-slate-200">{user?.first_name || "USER"}</p>
          </div>
          <div className="flex items-center space-x-4 text-right">
            <div className="flex flex-col items-center"><Gift size={14} className="text-purple-400 mb-0.5" /><p className="text-xs font-bold text-slate-300">{formatMoney(user?.bonus_balance)} ETB</p></div>
            <div className="flex flex-col items-end"><p className="text-[11px] text-slate-400">Wallet</p><p className="text-sm font-bold text-green-400">{formatMoney(user?.main_balance)} ETB</p></div>
          </div>
        </div>
        {game.status === 'waiting' && (
          <div className="bg-[#0a0d1f] px-3 pt-3 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => { initAudio(); setSelectedStake(null); }} className="h-9 w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl"><ArrowLeft size={18} className="text-white" /></button>
              <div className="relative">
                <select value={selectedStake} onChange={(e) => { setSelectedStake(Number(e.target.value)); setGame(null); setMyCard(null); setTaken([]); }} disabled={!!myCard}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl pl-3 pr-7 h-9 text-white font-black text-sm outline-none cursor-pointer" style={{ colorScheme: "dark" }}>
                  <option value={10}>10 ETB</option><option value={20}>20 ETB</option><option value={50}>50 ETB</option><option value={100}>100 ETB</option>
                </select>
                <ChevronDown size={12} className="text-white/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl h-9 flex flex-col items-center justify-center">
                <span className="text-[9px] text-white/30 font-bold leading-none">Game ID</span>
                <span className="text-sm font-black text-white leading-tight">{game.game_id}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-white/5 border border-white/5 rounded-xl py-1.5 text-center"><p className="text-[8px] text-white/30 font-bold uppercase">Stake</p><p className="text-xs font-black text-white">{game.stake} ETB</p></div>
              <div className="bg-white/5 border border-white/5 rounded-xl py-1.5 text-center"><p className="text-[8px] text-white/30 font-bold uppercase">Derash</p><p className="text-xs font-black text-yellow-400">{game.prize_pool} ETB</p></div>
              <div className="bg-white/5 border border-white/5 rounded-xl py-1.5 text-center"><p className="text-[8px] text-white/30 font-bold uppercase">Status</p><p className={`text-xs font-black ${statusCls}`}>{statusTxt}</p></div>
            </div>
          </div>
        )}
      </div>

      {errMsg && <div className="mx-3 mt-2 px-3 py-2 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-between z-10"><p className="text-red-400 text-xs font-bold">{errMsg}</p><button onClick={() => setErrMsg("")} className="text-red-400 text-base leading-none">x</button></div>}

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {game.status === 'waiting' ? renderCartelaPicker() : renderCallingBoard()}
      </div>

      {/* Finished Overlay / Celebration */}
      {game.status === 'finished' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          {iWon ? (
            <div className="flex flex-col items-center text-center animate-bounce">
              <span className="text-7xl mb-4">🏆</span>
              <h2 className="text-5xl font-black text-yellow-400 mb-2 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">BINGO!</h2>
              <p className="text-white font-bold text-xl mb-2">You WON the game!</p>
              <p className="text-4xl font-black text-emerald-400 mb-8">+{game.winner_prize} ETB</p>
              <button onClick={() => { fetchState(); refreshUser(); }} className="px-10 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-950 font-black rounded-full text-lg active:scale-95 shadow-xl">PLAY NEXT GAME</button>
            </div>
          ) : (
            <div className="bg-[#111]/95 border border-white/10 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl">
              <span className="text-6xl mb-4 block">🏆</span>
              <p className="text-blue-400 text-2xl font-black mb-2">Game Over</p>
              {game.winner_cartela ? (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-white/60 text-sm mb-1">Winner</p>
                  <p className="text-yellow-400 font-black text-xl">{game.winner_first_name || "Player"} (Cartela #{game.winner_cartela})</p>
                  <p className="text-emerald-400 font-black text-lg mt-1">Won {game.winner_prize} ETB!</p>
                </div>
              ) : (
                <p className="text-white/60 text-sm mb-6">No winner this round.</p>
              )}
              <button onClick={() => { fetchState(); refreshUser(); }} className="w-full py-3.5 bg-orange-500 text-black font-black rounded-xl text-sm active:scale-95">Join Next Game</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
