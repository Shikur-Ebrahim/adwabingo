import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Gift, RefreshCw, Users, Clock, Trophy, Volume2, VolumeX, RotateCcw } from "lucide-react";
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
interface Celebration { winner_name: string; winner_cartela: number; winner_prize: number; winner_matrix: number[][] | null; iWon: boolean; called: number[]; }

const hdrs = () => ({ "Content-Type": "application/json", "x-telegram-init-data": WebApp?.initData ?? "" });

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

const LETTER_COLOR: Record<string, string> = {
  B: '#f59e0b', I: '#3b82f6', N: '#ec4899', G: '#22c55e', O: '#a855f7',
};
const LETTER_BG: Record<string, string> = {
  B: '#3b82f6', I: '#8b5cf6', N: '#ec4899', G: '#22c55e', O: '#3b82f6',
};

// Full Amharic number words for display under the call
const AMHARIC_NUM: Record<number, string> = {
  1:'አንድ', 2:'ሁለት', 3:'ሶስት', 4:'አራት', 5:'አምስት',
  6:'ስድስት', 7:'ሰባት', 8:'ስምንት', 9:'ዘጠኝ', 10:'አስር',
  11:'አስራ አንድ', 12:'አስራ ሁለት', 13:'አስራ ሶስት', 14:'አስራ አራት', 15:'አስራ አምስት',
  16:'አስራ ስድስት', 17:'አስራ ሰባት', 18:'አስራ ስምንት', 19:'አስራ ዘጠኝ', 20:'ሃያ',
  21:'ሃያ አንድ', 22:'ሃያ ሁለት', 23:'ሃያ ሶስት', 24:'ሃያ አራት', 25:'ሃያ አምስት',
  26:'ሃያ ስድስት', 27:'ሃያ ሰባት', 28:'ሃያ ስምንት', 29:'ሃያ ዘጠኝ', 30:'ሠላሳ',
  31:'ሠላሳ አንድ', 32:'ሠላሳ ሁለት', 33:'ሠላሳ ሶስት', 34:'ሠላሳ አራት', 35:'ሠላሳ አምስት',
  36:'ሠላሳ ስድስት', 37:'ሠላሳ ሰባት', 38:'ሠላሳ ስምንት', 39:'ሠላሳ ዘጠኝ', 40:'አርባ',
  41:'አርባ አንድ', 42:'አርባ ሁለት', 43:'አርባ ሶስት', 44:'አርባ አራት', 45:'አርባ አምስት',
  46:'አርባ ስድስት', 47:'አርባ ሰባት', 48:'አርባ ስምንት', 49:'አርባ ዘጠኝ', 50:'ሃምሳ',
  51:'ሃምሳ አንድ', 52:'ሃምሳ ሁለት', 53:'ሃምሳ ሶስት', 54:'ሃምሳ አራት', 55:'ሃምሳ አምስት',
  56:'ሃምሳ ስድስት', 57:'ሃምሳ ሰባት', 58:'ሃምሳ ስምንት', 59:'ሃምሳ ዘጠኝ', 60:'ስልሳ',
  61:'ስልሳ አንድ', 62:'ስልሳ ሁለት', 63:'ስልሳ ሶስት', 64:'ስልሳ አራት', 65:'ስልሳ አምስት',
  66:'ስልሳ ስድስት', 67:'ስልሳ ሰባት', 68:'ስልሳ ስምንት', 69:'ስልሳ ዘጠኝ', 70:'ሰባ',
  71:'ሰባ አንድ', 72:'ሰባ ሁለት', 73:'ሰባ ሶስት', 74:'ሰባ አራት', 75:'ሰባ አምስት',
};

const getLetter = (num: number) => BINGO_LETTERS[Math.floor((num - 1) / 15)];
const getAudioSrc = (num: number) => {
  return `/audio/bingo/bingo_${String(num).padStart(2, '0')}.mp3`;
};

// Check if pre-generated audio files exist
let _audioCacheChecked = false;
let _audioFilesAvailable = false;
async function checkAudioAvailable() {
  if (_audioCacheChecked) return _audioFilesAvailable;
  _audioCacheChecked = true;
  try {
    const r = await fetch('/audio/bingo/bingo_01.mp3', { method: 'HEAD' });
    _audioFilesAvailable = r.ok;
  } catch { _audioFilesAvailable = false; }
  return _audioFilesAvailable;
}

const getWinningCells = (matrix: number[][], called: number[]) => {
  const winCells = new Set<string>();
  for (let r = 0; r < 5; r++) {
    if (matrix[r].every(n => n === 0 || called.includes(n))) {
      for (let c = 0; c < 5; c++) winCells.add(`${r}-${c}`);
    }
  }
  for (let c = 0; c < 5; c++) {
    let win = true;
    for (let r = 0; r < 5; r++) { if (matrix[r][c] !== 0 && !called.includes(matrix[r][c])) win = false; }
    if (win) { for (let r = 0; r < 5; r++) winCells.add(`${r}-${c}`); }
  }
  let d1 = true, d2 = true;
  for (let i = 0; i < 5; i++) {
    if (matrix[i][i] !== 0 && !called.includes(matrix[i][i])) d1 = false;
    if (matrix[i][4-i] !== 0 && !called.includes(matrix[i][4-i])) d2 = false;
  }
  if (d1) for (let i = 0; i < 5; i++) winCells.add(`${i}-${i}`);
  if (d2) for (let i = 0; i < 5; i++) winCells.add(`${i}-${4-i}`);
  return winCells;
};

export default function BingoGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, fetchUser: refreshUser, subscribeToBalance } = useGameStore();

  const urlStake = searchParams.get("stake");
  const [selectedStake, setSelectedStake] = useState<number | null>(urlStake ? Number(urlStake) : null);
  const [homeGames, setHomeGames] = useState<Record<number, { pool: number; start_at?: string; status: string }>>({});
  const [homeTimeLeft, setHomeTimeLeft] = useState<Record<number, number>>({});
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume, setVolume] = useState(1.0);

  // Fetch and listen for active derash & status on stake selection screen
  useEffect(() => {
    if (selectedStake) return;
    let isMounted = true;
    
    const fetchPools = async () => {
      // Fetch from real table, active games only
      const { data } = await supabase.from('bingo_games').select('stake, prize_pool, start_at, status').in('status', ['waiting', 'calling']);
      if (data && isMounted) {
        const p: Record<number, any> = {};
        data.forEach(g => { p[g.stake] = { pool: g.prize_pool, start_at: g.start_at, status: g.status }; });
        setHomeGames(p);
      }
    };
    fetchPools();

    // Listen to actual bingo_games table because active_bingo_games view might not trigger realtime properly
    const ch = supabase.channel('home_pools')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bingo_games' }, () => {
        if (isMounted) fetchPools();
      })
      .subscribe();

    return () => { isMounted = false; supabase.removeChannel(ch); };
  }, [selectedStake]);

  // Tick timer for home screen
  useEffect(() => {
    if (selectedStake) return;
    const update = () => {
      if (document.visibilityState === 'hidden') return;
      setHomeTimeLeft(prev => {
        const next: Record<number, number> = {};
        for (const [stake, g] of Object.entries(homeGames)) {
          if (g.status === 'waiting' && g.start_at) {
            next[Number(stake)] = Math.max(0, Math.ceil((new Date(g.start_at).getTime() - Date.now()) / 1000));
          }
        }
        return next;
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [selectedStake, homeGames]);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [lastCallNum, setLastCallNum] = useState<number | null>(null);
  const [callAnim, setCallAnim] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Check if pre-generated MP3s exist
  useEffect(() => {
    checkAudioAvailable().then(ok => setAudioAvailable(ok));
  }, []);

  const initWebAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      audioCtxRef.current?.resume();
    } catch(e) {}
  };

  const playSpecial = useCallback(async (name: string) => {
    if (!soundEnabled || !audioCtxRef.current) return;
    try {
      let res: Response;
      if (audioAvailable) {
        res = await fetch(`/audio/bingo/${name}.mp3`);
      } else {
        const texts: Record<string, string> = {
          bingo_win: 'ቢንጎ! ቢንጎ! እንኳን ደስ አለዎ!',
          game_start: 'ጨዋታ ጀምሯል!',
          good_luck: 'መልካም ዕድል!',
        };
        const t = texts[name];
        if (!t) return;
        res = await fetch(`${API}/bingo/tts?text=` + encodeURIComponent(t));
      }
      if (!res.ok) return;
      const buf = await audioCtxRef.current.decodeAudioData(await res.arrayBuffer());
      const src = audioCtxRef.current.createBufferSource();
      const gn = audioCtxRef.current.createGain();
      gn.gain.value = volume * 2;
      src.buffer = buf;
      src.connect(gn);
      gn.connect(audioCtxRef.current.destination);
      src.start(0);
    } catch(e) {}
  }, [soundEnabled, volume, audioAvailable]);

  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playCallAudio = useCallback(async (num: number) => {
    if (!soundEnabled || !audioCtxRef.current) return;
    // Stop any currently playing call
    if (activeAudioSourceRef.current) {
      try { activeAudioSourceRef.current.stop(); } catch(e) {}
      activeAudioSourceRef.current = null;
    }
    setLastCallNum(num);
    setCallAnim(false);
    setTimeout(() => setCallAnim(true), 20);

    try {
      let res: Response;
      if (audioAvailable) {
        res = await fetch(getAudioSrc(num));
      } else {
        const letter = getLetter(num);
        const text = `${letter}... ${AMHARIC_NUM[num]}`;
        res = await fetch(`${API}/bingo/tts?text=` + encodeURIComponent(text));
      }
      if (!res.ok) return;
      const buf = await audioCtxRef.current.decodeAudioData(await res.arrayBuffer());
      const src = audioCtxRef.current.createBufferSource();
      activeAudioSourceRef.current = src;
      const gn = audioCtxRef.current.createGain();
      gn.gain.value = volume * (audioAvailable ? 1 : 2); // Pro audio is already normalized
      src.buffer = buf;
      src.connect(gn);
      gn.connect(audioCtxRef.current.destination);
      src.start(0);
    } catch(e) {}
  }, [soundEnabled, volume, audioAvailable]);

  const replayLastCall = () => {
    if (lastCallNum) playCallAudio(lastCallNum);
  };

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
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const prevCalledLenRef = useRef(0);

  const fetchState = useCallback(async () => {
    if (!selectedStake) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/bingo/current?stake=${selectedStake}`, { headers: hdrs() });
      if (r.ok) {
        const d = await r.json();
        if (d.game && d.game.id !== gameIdRef.current) {
          setGame(d.game); setTaken(d.taken_cartelas ?? []); setMyCard(d.my_card ?? null);
          gameIdRef.current = d.game.id;
          prevCalledLenRef.current = d.game.called_numbers?.length || 0;
        } else if (d.game) {
          setGame(d.game); setTaken(d.taken_cartelas ?? []); setMyCard(d.my_card ?? null);
        }
      }
    } catch { } finally { setLoading(false); }
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
        if (np.game_id === gameIdRef.current)
          setTaken(prev => prev.includes(np.cartela_number) ? prev : [...prev, np.cartela_number]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedStake, fetchState]);

  useEffect(() => {
    if (!game || game.status !== "waiting") return;
    const update = () => {
      if (document.visibilityState === 'hidden') return;
      setTimeLeft(Math.max(0, Math.ceil((new Date(game.start_at).getTime() - Date.now()) / 1000)));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [game?.status, game?.start_at]);

  const called = game?.called_numbers ?? [];
  const lastNum = called.length > 0 ? called[called.length - 1] : null;

  useEffect(() => {
    if (game?.status === 'calling' && called.length > prevCalledLenRef.current) {
      if (lastNum) { playCallAudio(lastNum); }
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('medium');
    }
    prevCalledLenRef.current = called.length;
  }, [called.length, game?.status, lastNum, playCallAudio]);

  const hasCelebratedRef = useRef<string | null>(null);

  // Fire celebration when game finishes — play sound + fetch winner card
  useEffect(() => {
    if (game?.status === 'finished' && game.winner_cartela) {
      const iWon = game.winner_telegram_id === String(user?.telegram_id);
      let isMounted = true;
      if (hasCelebratedRef.current !== game.id) {
        hasCelebratedRef.current = game.id;
        playSpecial('bingo_win');
      }
      fetch(`${API}/bingo/card?game_id=${game.id}&cartela=${game.winner_cartela}`, { headers: hdrs() })
        .then(r => r.json())
        .then(data => {
          if (!isMounted) return;
          setCelebration({
            winner_name: game.winner_first_name || 'Player',
            winner_cartela: game.winner_cartela!,
            winner_prize: game.winner_prize!,
            winner_matrix: data.matrix || null,
            iWon, called: [...game.called_numbers]
          });
        }).catch(() => {
          if (isMounted) setCelebration({ winner_name: game.winner_first_name || 'Player', winner_cartela: game.winner_cartela!, winner_prize: game.winner_prize!, winner_matrix: null, iWon, called: [...game.called_numbers] });
        });
      return () => { isMounted = false; };
    }
  }, [game?.status, game?.id, game?.winner_cartela]);

  // Auto-dismiss celebration after 2 seconds — separate effect so it's never reset by other deps
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => {
      setCelebration(null);
      setMyCard(null);
      setTaken([]);
      fetchState();
      refreshUser();
    }, 2000);
    return () => clearTimeout(timer);
  }, [celebration]);

  const joinGame = async (seat: number) => {
    initWebAudio();
    if (!game || game.status !== "waiting") return;
    if (myCard) { setErrMsg("You already have a cartela!"); return; }
    if (taken.includes(seat)) { setErrMsg("Taken! Pick another."); return; }
    const bonusBal = Number(user?.bonus_balance || 0), mainBal = Number(user?.main_balance || 0);
    if (!user || bonusBal + mainBal < game.stake) { setErrMsg(`Need ${game.stake} ETB`); return; }
    setBuying(seat); setErrMsg("");
    setTaken(prev => [...prev, seat]);
    const stakeAmt = game.stake;
    let nb = bonusBal, nm = mainBal;
    if (nb >= stakeAmt) { nb -= stakeAmt; } else { nm -= stakeAmt - nb; nb = 0; }
    useGameStore.setState(s => ({ user: s.user ? { ...s.user, main_balance: nm, bonus_balance: nb } : s.user }));
    const nc = taken.length + 1;
    setGame(prev => prev ? { ...prev, prize_pool: nc < 3 ? nc * stakeAmt : Math.floor(nc * stakeAmt * 0.8) } : prev);
    try {
      const r = await fetch(`${API}/bingo/join`, { method: "POST", headers: hdrs(), body: JSON.stringify({ cartela_number: seat, stake: selectedStake }) });
      const d = await r.json();
      if (r.ok) {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred("success");
        setMyCard({ cartela_number: seat, card_matrix: d.card_matrix });
        refreshUser();
      } else {
        setTaken(prev => prev.filter(n => n !== seat));
        useGameStore.setState(s => ({ user: s.user ? { ...s.user, main_balance: mainBal, bonus_balance: bonusBal } : s.user }));
        setErrMsg(d.error ?? "Could not join."); fetchState();
      }
    } catch { setErrMsg("Network error"); } finally { setBuying(null); }
  };

  const fm = (a: number | undefined) => (a || 0).toLocaleString("en-US");
  const initial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : "U";
  let statusTxt = "Finished", statusCls = "text-slate-400";
  if (game?.status === "waiting") { statusTxt = timeLeft > 86400 ? "Waiting..." : `${timeLeft}s`; statusCls = "text-orange-400"; }
  else if (game?.status === "calling") { statusTxt = "Active"; statusCls = "text-emerald-400"; }

  const Header = () => (
    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">{initial}</div>
        <p className="font-bold text-sm uppercase tracking-wider text-slate-200">{user?.first_name || "USER"}</p>
      </div>
      <div className="flex items-center space-x-4 text-right">
        <div className="flex flex-col items-center"><Gift size={14} className="text-purple-400 mb-0.5" /><p className="text-xs font-bold text-slate-300">{fm(user?.bonus_balance)} ETB</p></div>
        <div className="flex flex-col items-end"><p className="text-[11px] text-slate-400">Wallet</p><p className="text-sm font-bold text-green-400">{fm(user?.main_balance)} ETB</p></div>
      </div>
    </div>
  );

  if (!selectedStake) {
    return (
      <div className="h-[calc(100dvh-80px)] w-full bg-white flex flex-col select-none overflow-hidden relative" onClick={initWebAudio}>
        
        {/* Background grid (Light mode) */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]" style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(0, 1fr))', gap: '2px', padding: '2px' }}>
          {Array.from({ length: 150 }, (_, i) => (
            <div key={i} className="flex items-center justify-center bg-black rounded-[3px] text-black font-black" style={{ fontSize: '6px' }}>{i + 1}</div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Light Header specifically for home screen */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">{initial}</div>
              <p className="font-bold text-sm uppercase tracking-wider text-slate-800">{user?.first_name || "USER"}</p>
            </div>
            <div className="flex items-center space-x-4 text-right">
              <div className="flex flex-col items-center"><Gift size={14} className="text-purple-600 mb-0.5" /><p className="text-xs font-bold text-slate-700">{fm(user?.bonus_balance)} ETB</p></div>
              <div className="flex flex-col items-end"><p className="text-[11px] text-slate-500">Wallet</p><p className="text-sm font-bold text-green-600">{fm(user?.main_balance)} ETB</p></div>
            </div>
          </div>
          
          {/* Seamless White Banner for Logo */}
          <div className="w-full bg-white flex justify-center py-2 z-20 shrink-0">
            <img src="/hero.png" alt="ADWA Bingo" className="max-w-[340px] h-[90px] object-contain" />
          </div>

          <p className="text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold pt-3 pb-1">Select Stake & Win Big</p>
          
          <div className="flex-1 grid grid-cols-2 gap-3 px-4 pb-2 min-h-0">
            {STAKE_OPTIONS.map(opt => {
              const hg = homeGames[opt.value];
              const pool = hg?.pool || 0;
              const hasGame = pool > 0;
              const isWaiting = hg?.status === 'waiting';
              const isCalling = hg?.status === 'calling';
              const tl = homeTimeLeft[opt.value] || 0;
              
              let statusTxt = "Waiting...";
              let statusCls = "text-orange-500";
              if (isWaiting && tl <= 86400 && tl > 0) {
                statusTxt = `${tl}s`;
              } else if (isCalling) {
                statusTxt = "Active";
                statusCls = "text-emerald-500";
              }

              return (
                <button key={opt.value} onClick={() => { setSelectedStake(opt.value); initWebAudio(); }}
                  className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl flex flex-col active:scale-95 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-10`}></div>
                  
                  {/* Top: STAKE */}
                  <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 pt-2">
                    <span className="text-slate-500 font-bold text-[8px] uppercase tracking-widest">Stake</span>
                    <span className="text-slate-800 font-black text-4xl leading-none mt-1">{opt.value}</span>
                    <span className="text-slate-500 font-bold text-[8px] uppercase tracking-widest mt-1">ETB</span>
                  </div>

                  {/* Middle: Derash & Status split */}
                  <div className="w-full bg-slate-50 border-t border-b border-slate-100 flex h-[35px] shrink-0 relative z-10">
                    <div className="flex-1 flex flex-col items-center justify-center border-r border-slate-100">
                      <span className="text-slate-400 text-[7px] font-bold uppercase tracking-wider">Derash</span>
                      <span className={`text-[10px] font-black text-yellow-600 ${hasGame ? 'animate-pulse' : ''}`}>{pool} ETB</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <span className="text-slate-400 text-[7px] font-bold uppercase tracking-wider">Status</span>
                      <span className={`text-[10px] font-black ${statusCls}`}>{statusTxt}</span>
                    </div>
                  </div>

                  {/* Bottom: Action */}
                  <div className="w-full h-[30px] flex items-center justify-center relative z-10 bg-white">
                    {isWaiting ? (
                      <span className="text-orange-500 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">🔥 Join Now</span>
                    ) : (
                      <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Start Match</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="pb-3 flex justify-center shrink-0 relative z-10 mt-1">
            <button onClick={() => navigate(-1)} className="px-6 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-500 text-[10px] font-bold uppercase tracking-widest active:scale-95 shadow-sm">← Back to Games</button>
          </div>
        </div>
      </div>
    );
  }


  if (loading && !game) return <div className="h-[calc(100dvh-80px)] w-full bg-[#05081a] flex items-center justify-center"><RefreshCw size={28} className="text-orange-500 animate-spin" /></div>;

  if (!game) return (
    <div className="h-[calc(100dvh-80px)] w-full bg-[#05081a] flex flex-col items-center justify-center text-white gap-4">
      <span className="text-5xl">🎱</span>
      <p className="font-bold text-lg">Preparing next game...</p>
      <button onClick={fetchState} className="px-6 py-2.5 bg-orange-500 text-black font-black rounded-full text-sm">Refresh</button>
      <button onClick={() => setSelectedStake(null)} className="text-white/40 text-xs underline mt-2">Change Stake</button>
    </div>
  );

  const renderCallingBoard = () => {
    const recent = [...called].reverse().slice(0, 4);
    const currentLetter = lastNum ? getLetter(lastNum) : null;
    const currentAmharic = lastNum ? AMHARIC_NUM[lastNum] : null;

    return (
      <div className="h-full flex flex-col px-1 pt-1 pb-2 gap-1">

        {/* Top Info Bar */}
        <div className="flex items-center justify-between bg-[#0f172a] px-2 py-1 rounded-xl border border-slate-800 shrink-0">
          <div className="text-slate-400 text-[9px] font-bold">ID: {game.game_id}</div>
          <div className="flex items-center gap-1 text-yellow-400 text-[9px] font-bold"><Trophy size={10}/> {game.prize_pool} ETB</div>
          <div className="flex items-center gap-1 text-blue-400 text-[9px] font-bold"><Users size={10}/> {taken.length}</div>
          <div className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold"><Clock size={10}/> {called.length}/75</div>
          <div className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-black animate-pulse">LIVE</div>
        </div>

        {/* 1-75 Tracker Board — slightly larger */}
        <div className="bg-[#0b1120] rounded-xl px-1.5 py-1.5 border border-slate-800 shrink-0">
          <div className="flex flex-col gap-[3px]">
            {BINGO_LETTERS.map((letter, rowIndex) => (
              <div key={letter} className="flex items-center gap-1">
                <div className="w-4 flex-shrink-0 flex items-center justify-center font-black text-[10px]" style={{ color: LETTER_COLOR[letter] }}>{letter}</div>
                <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                  {Array.from({ length: 15 }, (_, i) => {
                    const num = rowIndex * 15 + i + 1;
                    const isCalled = called.includes(num);
                    const isLatest = num === lastNum;
                    return (
                      <div key={num} className={`h-[20px] rounded-[3px] flex items-center justify-center text-[8px] font-bold transition-all ${
                        isLatest ? 'bg-white text-black shadow-[0_0_4px_rgba(255,255,255,0.8)]' :
                        isCalled ? 'bg-yellow-500 text-yellow-950' : 'bg-slate-800/60 text-slate-500'
                      }`}>{num}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Caller Row + Card — narrow, centred */}
        <div className="w-full max-w-[290px] mx-auto flex flex-col gap-1">
          {/* Caller Row */}
          <div className="shrink-0 bg-[#0a0f1e] rounded-xl border border-white/5 px-2 py-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {recent.length === 0 ? (
                  <span className="text-slate-500 text-[10px] font-bold animate-pulse">Waiting...</span>
                ) : recent.map((num, idx) => {
                  const l = getLetter(num);
                  const isFirst = idx === 0;
                  if (isFirst) {
                    return (
                      <div key={`${num}-${idx}`} className="flex items-center gap-2">
                        <div className="w-11 h-11 flex flex-col items-center justify-center rounded-full font-black border-2 border-yellow-400 bg-yellow-400/20 shadow-[0_0_12px_rgba(250,204,21,0.3)]">
                          <span style={{ color: LETTER_COLOR[l] }} className="text-[10px] leading-none font-black">{l}</span>
                          <span className="text-white text-lg leading-none font-black">{num}</span>
                        </div>
                        <span className="text-yellow-400 font-black text-sm">{AMHARIC_NUM[num]}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={`${num}-${idx}`} className="w-7 h-7 flex flex-col items-center justify-center rounded-full border border-slate-700 bg-slate-800/60 opacity-50">
                      <span style={{ color: LETTER_COLOR[l] }} className="text-[7px] leading-none font-black">{l}</span>
                      <span className="text-white text-[10px] leading-none font-black">{num}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={replayLastCall} disabled={!lastCallNum} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center active:scale-90 disabled:opacity-30">
                  <RotateCcw size={13} className="text-blue-400" />
                </button>
                <button onClick={() => { setSoundEnabled(s => !s); initWebAudio(); }}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center active:scale-90 ${soundEnabled ? 'bg-blue-500/20 border-blue-500/50' : 'bg-slate-800 border-slate-700'}`}>
                  {soundEnabled ? <Volume2 size={13} className="text-blue-400" /> : <VolumeX size={13} className="text-red-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* My Card — SQUARE cells using grid + aspect-square */}
          {myCard ? (
            <div className="rounded-2xl overflow-hidden border border-white/10" style={{ background: 'linear-gradient(145deg,#1a2540,#0f1829)' }}>
              {/* BINGO Header */}
              <div className="grid grid-cols-5">
                {BINGO_LETTERS.map(l => (
                  <div key={l} className="flex items-center justify-center py-1.5 font-black text-white text-sm" style={{ background: LETTER_BG[l] }}>{l}</div>
                ))}
              </div>
              {/* Card Grid — aspect-square cells = always perfect squares */}
              <div className="grid grid-cols-5 gap-[3px] p-[3px] bg-[#0a0f1e]">
                {Array.from({ length: 5 }).flatMap((_, r) =>
                  Array.from({ length: 5 }, (_, c) => {
                    const num = myCard.card_matrix[r][c];
                    const isFree = num === 0, marked = isFree || called.includes(num), isLast = num === lastNum;
                    return (
                      <div key={`${r}-${c}`} className={`aspect-square flex items-center justify-center font-black text-base rounded-lg transition-all duration-300 ${
                        isFree ? 'bg-yellow-400 text-yellow-900' :
                        isLast ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.7)]' :
                        marked ? 'bg-emerald-500 text-white' : 'bg-white text-[#1a2540]'
                      }`}>{isFree ? '★' : num}</div>
                    );
                  })
                )}
              </div>
              {/* Cartela Label */}
              <div className="py-1 text-center bg-[#0a0f1e] border-t border-white/10">
                <p className="text-white/70 font-black text-[10px] tracking-widest uppercase">CARTELA # {myCard.cartela_number}</p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 mt-1 pointer-events-none" style={{ background: 'linear-gradient(145deg,#1a2540,#0f1829)' }}>
              {/* BINGO Header */}
              <div className="grid grid-cols-5">
                {BINGO_LETTERS.map(l => (
                  <div key={l} className="flex items-center justify-center py-1.5 font-black text-white text-sm" style={{ background: LETTER_BG[l] }}>{l}</div>
                ))}
              </div>
              
              {/* Dummy Grid */}
              <div className="grid grid-cols-5 gap-[3px] p-[3px] bg-[#0a0f1e]">
                {Array.from({ length: 5 }).flatMap((_, r) => 
                  Array.from({ length: 5 }, (_, c) => {
                    const isFree = r === 2 && c === 2;
                    const num = isFree ? '★' : (c * 15) + r + (c % 2 === 0 ? 3 : 8);
                    return (
                      <div key={`${r}-${c}`} className={`aspect-square flex items-center justify-center font-black text-base rounded-lg ${
                        isFree ? 'bg-yellow-400 text-yellow-900' : 'bg-white text-[#1a2540]'
                      }`}>{num}</div>
                    );
                  })
                )}
              </div>

              {/* Overlay Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3 border border-red-500/30">
                  <span className="text-xl animate-pulse">⏳</span>
                </div>
                <h3 className="text-red-400 font-black text-lg uppercase tracking-widest mb-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]">Match is active</h3>
                <p className="text-white/80 text-[10px] font-bold text-center px-4 leading-relaxed uppercase tracking-wider">
                  Please wait for<br/>the next match
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCartelaPicker = () => (
    <div className="flex-1 overflow-y-auto relative p-2 pb-16">
      <p className="text-center text-[10px] text-cyan-300 font-black uppercase tracking-widest mb-2">
        {!myCard ? `TAP TO PICK YOUR CARTELA — ${taken.length}/150 TAKEN` : `CARTELA #${myCard.cartela_number} SECURED ✓`}
      </p>
      <div className="rounded-2xl border-[3px] border-cyan-400 overflow-hidden bg-[#05081a] shadow-[0_0_25px_rgba(34,211,238,0.4)]">
        <div className="grid gap-[2px] p-[2px]" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
          {Array.from({ length: 150 }, (_, i) => {
            const n = i + 1;
            const isTaken = taken.includes(n), isMine = myCard?.cartela_number === n, isBuying = buying === n;

            if (isMine) {
              return (
                <div key={n} className="aspect-square flex items-center justify-center rounded-[7px] text-[10px] font-black bg-emerald-500 text-white ring-[2.5px] ring-yellow-300 z-10">
                  ✓
                </div>
              );
            }
            if (isTaken) {
              return (
                <div key={n} className="aspect-square flex items-center justify-center rounded-[7px] text-[9px] font-black bg-red-900/60 text-red-300/50 border border-red-700/30">
                  ✕
                </div>
              );
            }
            return (
              <button key={n} disabled={buying !== null || !!myCard} onClick={() => joinGame(n)}
                className={`aspect-square flex items-center justify-center rounded-[7px] text-[11px] font-black bg-white text-black transition-all duration-150 ${isBuying ? 'opacity-40 scale-90' : 'active:scale-90 cursor-pointer'}`}>
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-80px)] w-full bg-[#05081a] flex flex-col select-none" onClick={initWebAudio}>
      <div className="sticky top-0 z-40 bg-[#05081a] flex flex-col shrink-0">
        <Header />
        {game.status === 'waiting' && (
          <div className="bg-[#0a0d1f] px-3 pt-3 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setSelectedStake(null)} className="h-9 w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl"><ArrowLeft size={18} className="text-white" /></button>
              <div className="relative">
                <select value={selectedStake} onChange={e => { setSelectedStake(Number(e.target.value)); setGame(null); setMyCard(null); setTaken([]); }} disabled={!!myCard}
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
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-white/5 border border-white/5 rounded-xl py-1.5 text-center"><p className="text-[8px] text-white/30 font-bold uppercase">Stake</p><p className="text-xs font-black text-white">{game.stake} ETB</p></div>
              <div className="bg-white/5 border border-white/5 rounded-xl py-1.5 text-center"><p className="text-[8px] text-white/30 font-bold uppercase">Players</p><p className="text-xs font-black text-emerald-400">{taken.length}</p></div>
              <div className="bg-white/5 border border-white/5 rounded-xl py-1.5 text-center"><p className="text-[8px] text-white/30 font-bold uppercase">Derash</p><p className="text-xs font-black text-yellow-400">{game.prize_pool} ETB</p></div>
              <div className="bg-white/5 border border-white/5 rounded-xl py-1.5 text-center"><p className="text-[8px] text-white/30 font-bold uppercase">Status</p><p className={`text-xs font-black ${statusCls}`}>{statusTxt}</p></div>
            </div>
          </div>
        )}
      </div>

      {errMsg && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-between z-10 shrink-0">
          <p className="text-red-400 text-xs font-bold">{errMsg}</p>
          <button onClick={() => setErrMsg("")} className="text-red-400 text-base leading-none ml-2">✕</button>
        </div>
      )}

      <div className={`flex-1 min-h-0 ${game.status === 'waiting' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {game.status === 'waiting' ? renderCartelaPicker() : renderCallingBoard()}
      </div>

      {/* Winner Celebration */}
      {celebration && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto pt-8 pb-20">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-5 text-center max-w-sm w-full shadow-2xl flex flex-col items-center">
            <span className="text-5xl mb-2 block animate-bounce">🏆</span>
            <h2 className="text-4xl font-black text-yellow-400 mb-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">BINGO!</h2>
            <div className="bg-white/5 rounded-xl p-3 mb-3 w-full border border-white/5">
              <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">Winner</p>
              <p className="text-white font-black text-2xl">{celebration.winner_name}</p>
              <p className="text-slate-400 text-sm font-bold">Cartela #{celebration.winner_cartela}</p>
              <div className="mt-2 inline-block bg-emerald-500/20 text-emerald-400 px-4 py-1 rounded-full font-black text-lg border border-emerald-500/30">
                WON {celebration.winner_prize} ETB
              </div>
            </div>
            {celebration.winner_matrix && (() => {
              const winCells = getWinningCells(celebration.winner_matrix, celebration.called);
              return (
                <div className="w-full bg-[#131b31] rounded-xl overflow-hidden border border-indigo-500/30 mb-4">
                  <div className="grid grid-cols-5">
                    {BINGO_LETTERS.map(l => <div key={l} className="flex items-center justify-center py-1 font-black text-white text-xs" style={{ background: LETTER_BG[l] }}>{l}</div>)}
                  </div>
                  <div className="grid grid-cols-5 gap-[2px] p-[2px] bg-[#0a0f1e]">
                    {Array.from({ length: 5 }).flatMap((_, r) => Array.from({ length: 5 }).map((_, c) => {
                      const num = celebration.winner_matrix![r][c];
                      const isFree = num === 0, isWin = winCells.has(`${r}-${c}`), isCalled = celebration.called.includes(num);
                      return (
                        <div key={`${r}-${c}`} className={`aspect-square rounded flex items-center justify-center font-black text-xs ${
                          isFree ? 'bg-yellow-400 text-yellow-900' :
                          isWin ? 'bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                          isCalled ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-500'
                        }`}>{isFree ? "★" : num}</div>
                      );
                    }))}
                  </div>
                  <div className="py-1 text-center border-t border-white/5 bg-[#0a0f1e]">
                    <p className="text-white/40 text-[9px] font-bold tracking-widest uppercase">CARTELA # {celebration.winner_cartela}</p>
                  </div>
                </div>
              );
            })()}
            <p className="text-white/40 text-xs font-bold animate-pulse mt-1">Returning to game...</p>
          </div>
        </div>
      )}
    </div>
  );
}
