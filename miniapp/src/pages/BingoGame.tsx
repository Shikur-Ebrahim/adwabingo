import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Gift, RefreshCw } from "lucide-react";
import WebApp from "@twa-dev/sdk";
import { supabase } from "../lib/supabase";
import { useGameStore } from "../store/gameStore";

const API = import.meta.env.VITE_API_URL || "/api";

interface BGame {
  id: string; game_id: string; stake: number; prize_pool: number;
  status: "waiting" | "calling" | "finished";
  called_numbers: number[];
  winner_cartela: number | null; winner_telegram_id: string | null; winner_prize: number | null;
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

export default function BingoGame() {
  const navigate = useNavigate();
  const { user, fetchUser: refreshUser } = useGameStore();
  const [game, setGame] = useState<BGame | null>(null);
  const [taken, setTaken] = useState<number[]>([]);
  const [myCard, setMyCard] = useState<MyCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const gameIdRef = useRef<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch(`${API}/bingo/current`, { headers: hdrs() });
      if (r.ok) {
        const d = await r.json();
        setGame(d.game); setTaken(d.taken_cartelas ?? []); setMyCard(d.my_card ?? null);
        gameIdRef.current = d.game?.id ?? null;
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  useEffect(() => {
    const ch = supabase.channel("bingo-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bingo_games" }, ({ new: g }) => { setGame(g as BGame); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bingo_games" }, () => { fetchState(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bingo_players" }, ({ new: p }) => {
        const np = p as { game_id: string; cartela_number: number };
        if (np.game_id === gameIdRef.current) setTaken(prev => prev.includes(np.cartela_number) ? prev : [...prev, np.cartela_number]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchState]);

  useEffect(() => {
    if (!game || game.status !== "waiting") return;
    const id = setInterval(() => setTimeLeft(Math.max(0, Math.ceil((new Date(game.start_at).getTime() - Date.now()) / 1000))), 500);
    return () => clearInterval(id);
  }, [game?.status, game?.start_at]);

  const joinGame = async (seat: number) => {
    if (!game || game.status !== "waiting") return;
    if (myCard) { setErrMsg("You already have a cartela!"); return; }
    if (taken.includes(seat)) { setErrMsg("Taken! Pick another."); return; }
    if (!user || Number(user.main_balance) < game.stake) { setErrMsg(`Need ${game.stake} ETB`); return; }
    setBuying(seat); setErrMsg("");
    try {
      const r = await fetch(`${API}/bingo/join`, { method: "POST", headers: hdrs(), body: JSON.stringify({ cartela_number: seat }) });
      const d = await r.json();
      if (r.ok) { WebApp.HapticFeedback?.notificationOccurred("success"); setMyCard({ cartela_number: seat, card_matrix: d.card_matrix }); setTaken(prev => [...prev, seat]); refreshUser(); }
      else { setErrMsg(d.error ?? "Could not join. Try again."); }
    } catch { setErrMsg("Network error"); } finally { setBuying(null); }
  };

  const called = game?.called_numbers ?? [];
  const lastNum = called.length > 0 ? called[called.length - 1] : null;
  const iWon = game?.status === "finished" && myCard?.cartela_number === game.winner_cartela && game.winner_telegram_id === String(user?.telegram_id);
  const formatMoney = (a: number | undefined) => (a || 0).toLocaleString("en-US");
  const initial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : "U";
  let statusTxt = "Finished", statusCls = "text-slate-400";
  if (game?.status === "waiting") { statusTxt = `${timeLeft}s`; statusCls = "text-orange-400"; }
  else if (game?.status === "calling") { statusTxt = "Active"; statusCls = "text-emerald-400"; }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><RefreshCw size={28} className="text-orange-500 animate-spin" /></div>;
  if (!game) return <div className="min-h-screen bg-[#05081a] flex flex-col items-center justify-center text-white gap-4"><span className="text-5xl">🎱</span><p className="font-bold text-lg">Preparing next game...</p><button onClick={fetchState} className="px-6 py-2.5 bg-orange-500 text-black font-black rounded-full text-sm">Refresh</button></div>;

  return (
    <div className="min-h-screen bg-[#05081a] flex flex-col select-none">
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
        <div className="bg-[#0a0d1f] px-3 pt-3 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => navigate(-1)} className="h-9 w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl"><ArrowLeft size={18} className="text-white" /></button>
            <button className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 h-9"><span className="text-white font-black text-sm">{game.stake} ETB</span><ChevronDown size={13} className="text-white/40" /></button>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl h-9 flex flex-col items-center justify-center"><span className="text-[9px] text-white/30 font-bold leading-none">Game ID</span><span className="text-sm font-black text-white leading-tight">{game.game_id}</span></div>
            <button className="h-9 w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl"><Gift size={17} className="text-white/50" /></button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[{ label: "Stake", val: `${game.stake} ETB`, cls: "text-white" },{ label: "Derash", val: `${game.prize_pool} ETB`, cls: "text-yellow-400" },{ label: "Status", val: statusTxt, cls: statusCls }].map(({ label, val, cls }) => (
              <div key={label} className="bg-white/5 border border-white/5 rounded-xl py-1.5 text-center"><p className="text-[8px] text-white/30 font-bold uppercase">{label}</p><p className={`text-xs font-black ${cls}`}>{val}</p></div>
            ))}
          </div>
        </div>
      </div>
      {errMsg && <div className="mx-3 mt-2 px-3 py-2 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-between"><p className="text-red-400 text-xs font-bold">{errMsg}</p><button onClick={() => setErrMsg("")} className="text-red-400 text-base leading-none">x</button></div>}
      <div className="flex-1 overflow-y-auto relative">
        <div className="p-2">
          <p className="text-center text-[10px] text-cyan-300 font-black uppercase tracking-widest mb-2">
            {game.status === "waiting" && !myCard && `TAP TO PICK YOUR CARTELA - ${taken.length}/150 TAKEN`}
            {game.status === "waiting" && myCard && `CARTELA #${myCard.cartela_number} SECURED - STARTS IN ${timeLeft}S`}
            {game.status === "calling" && `${called.length} NUMBERS CALLED`}
            {game.status === "finished" && `GAME OVER`}
          </p>
          <div className="rounded-2xl border-[3px] border-cyan-400 overflow-hidden bg-[#05081a]" style={{ boxShadow: "0 0 25px rgba(34,211,238,0.4), 0 0 60px rgba(34,211,238,0.1)" }}>
            <div className="grid gap-[2px] p-[2px]" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
              {Array.from({ length: 150 }, (_, i) => {
                const n = i + 1;
                const row = Math.floor(i / 10);
                const isCalled = called.includes(n);
                const isTaken = taken.includes(n);
                const isMine = myCard?.cartela_number === n;
                const isBuying = buying === n;
                const grad = ROW_COLORS[row % ROW_COLORS.length];
                if ((game.status === "calling" || game.status === "finished") && isCalled) {
                  return <div key={n} className="aspect-square rounded-[7px] bg-[#0a0a18] border border-white/5" />;
                }
                let ring = "";
                let badge: React.ReactNode = n;
                if (isMine) {
                  ring = "ring-[2.5px] ring-yellow-300";
                  if (game.status === "waiting") badge = <span className="text-yellow-200 font-black text-xs">&#10003;</span>;
                } else if (isTaken && game.status === "waiting") {
                  ring = "opacity-60";
                  badge = <span className="text-white/60 text-[9px] font-black">&#10003;</span>;
                } else if (game.status === "waiting" && !isMine && !isTaken) {
                  ring = isBuying ? "opacity-40 scale-90" : "active:scale-90 cursor-pointer";
                }
                return (
                  <button key={n} disabled={game.status !== "waiting" || isTaken || buying !== null || !!myCard} onClick={() => joinGame(n)}
                    className={`aspect-square flex items-center justify-center rounded-[7px] text-[11px] font-black text-white bg-gradient-to-b transition-all duration-150 ${grad} ${ring}`}>
                    {badge}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {(game.status === "calling" || game.status === "finished") && !myCard && (
          <div className="absolute inset-0 backdrop-blur-[6px] bg-black/60 flex items-center justify-center p-6 z-10">
            <div className="bg-[#111]/95 border border-white/10 rounded-2xl px-6 py-7 text-center max-w-[280px] w-full shadow-2xl">
              {game.status === "finished" ? (
                <><p className="text-4xl mb-3">&#127942;</p><p className="text-blue-400 text-xl font-black mb-1">Game Finished</p><p className="text-white/60 text-sm">Cartela #{game.winner_cartela} won {game.winner_prize} ETB!<br/>Next game starts soon.</p><button onClick={fetchState} className="mt-5 w-full py-2.5 bg-orange-500 text-black font-black rounded-xl text-sm active:scale-95">Join Next Game</button></>
              ) : (
                <><p className="text-4xl mb-3">&#9889;</p><p className="text-blue-400 text-xl font-black mb-1">Game Started!</p><p className="text-white/60 text-sm">You did not join this round. Wait for the next game.</p><button onClick={fetchState} className="mt-5 w-full py-2.5 bg-white/10 text-white font-black rounded-xl text-sm active:scale-95">Refresh</button></>
              )}
            </div>
          </div>
        )}
        {iWon && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 p-6">
            <span className="text-7xl mb-4 animate-bounce">&#127942;</span>
            <h2 className="text-4xl font-black text-yellow-400 mb-1">BINGO!</h2>
            <p className="text-white font-bold text-lg mb-1">You WON the game!</p>
            <p className="text-3xl font-black text-emerald-400 mb-6">+{game.winner_prize} ETB</p>
            <button onClick={() => { fetchState(); refreshUser(); }} className="px-10 py-3 bg-yellow-400 text-black font-black rounded-full text-lg active:scale-95">Next Game</button>
          </div>
        )}
      </div>
      {myCard && game.status !== "waiting" && (
        <div className="bg-[#0a0d1f] border-t border-white/5 p-3 shrink-0">
          <p className="text-center text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Your Card - Cartela #{myCard.cartela_number}</p>
          {lastNum && game.status === "calling" && <div className="flex justify-center mb-2"><div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 rounded-full px-4 py-1"><span className="text-orange-400 font-black text-sm">Latest:</span><span className="text-yellow-300 font-black text-xl">{lastNum}</span></div></div>}
          <div className="max-w-[260px] mx-auto">
            <div className="grid grid-cols-5 gap-1 mb-1">{["B","I","N","G","O"].map(l => <div key={l} className="text-center font-black text-orange-500 text-base">{l}</div>)}</div>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 5 }).flatMap((_, r) => Array.from({ length: 5 }).map((_, c) => {
                const num = myCard.card_matrix[r][c]; const isFree = num === 0; const marked = isFree || called.includes(num); const isLast = num === lastNum;
                return <div key={`${r}-${c}`} className={["aspect-square rounded-lg flex items-center justify-center font-black text-sm transition-all duration-300", isFree ? "bg-yellow-400 text-black text-lg" : isLast ? "bg-orange-400 text-black scale-105" : marked ? "bg-[#0f2e0f] text-emerald-400 border border-emerald-800" : "bg-white/5 text-white/70 border border-white/10"].join(" ")}>{isFree ? "★" : num}</div>;
              }))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}