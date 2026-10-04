import { useGameStore } from '../store/gameStore';
import { Gift, ArrowDownToLine, Share2, PlusCircle, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

export default function Home() {
  const { user } = useGameStore();
  const navigate = useNavigate();

  const handleInvite = () => {
    navigate('/invite');
  };

  const handleHelp = async () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    try {
      const res = await fetch(`${API_URL}/player/support-contact`, {
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData }
      });
      const data = await res.json();
      const username = data.username || 'adwabingo_admin';
      const url = `https://t.me/${username.replace('@', '')}`;
      if (typeof WebApp !== 'undefined' && WebApp.openTelegramLink) {
        WebApp.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const initial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U';

  const formatMoney = (amount: number | undefined) => {
    return (amount || 0).toLocaleString('en-US');
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 space-y-4">
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 px-4 py-4 rounded-b-2xl shadow-sm border-b border-gray-100 dark:border-slate-800 flex items-center justify-between transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            {initial}
          </div>
          <div>
            <p className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">{user?.first_name || 'USER'}</p>
            {user?.role !== 'user' && (
              <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                {user?.role}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4 text-right">
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1 text-purple-500 dark:text-purple-400 mb-0.5">
              <Gift size={14} />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatMoney(user?.bonus_balance)} ETB</p>
          </div>
          
          <div className="flex flex-col items-end">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Wallet</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatMoney(user?.main_balance)} ETB</p>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="px-4 grid grid-cols-3 gap-3">
        <Link to="/deposit" className="flex items-center justify-center space-x-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors">
          <PlusCircle size={16} />
          <span>Deposit</span>
        </Link>
        <Link to="/withdraw" className="flex items-center justify-center space-x-1.5 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors">
          <ArrowDownToLine size={16} />
          <span>Withdraw</span>
        </Link>
        <button 
          onClick={handleInvite}
          className="flex items-center justify-center space-x-1.5 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors"
        >
          <Share2 size={16} />
          <span>Invite</span>
        </button>
      </div>

      {/* ACTIVE GAMES */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-500 dark:text-slate-400 tracking-wider text-xs">ACTIVE GAMES</h2>
          <button onClick={handleHelp} className="text-blue-500 flex items-center space-x-1 text-xs font-semibold">
            <Info size={14} />
            <span>Help</span>
          </button>
        </div>
        
        <Link to="/bingo/live" className="block relative rounded-2xl overflow-hidden shadow-sm h-52 bg-gradient-to-br from-[#1a1a3e] to-[#0d0d1f] flex flex-col items-center justify-center border border-indigo-900/50">
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-10 gap-2 p-3 h-full">
              {Array.from({length: 40}).map((_, i) => <div key={i} className="bg-white rounded-sm opacity-50" />)}
            </div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1"></span> LIVE BINGO</span>
            <span className="text-yellow-400 font-black text-3xl mb-1">JOIN NEXT GAME</span>
            <span className="text-white/60 text-xs font-semibold mb-4">Pick your Cartela now!</span>
            <div className="bg-yellow-400 text-yellow-950 px-8 py-2 rounded-full font-black text-sm shadow-[0_0_15px_rgba(250,204,21,0.4)]">
              OPEN CARTELA →
            </div>
          </div>
        </Link>
      </div>

      {/* MEDEB (STAKES) */}
      <div className="px-4 flex-1">
        <h2 className="font-bold text-slate-500 dark:text-slate-400 tracking-wider text-xs mb-2">SELECT MEDEB</h2>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { amount: 10, color: 'from-blue-400 to-blue-600' },
            { amount: 20, color: 'from-emerald-400 to-emerald-600' },
            { amount: 50, color: 'from-purple-400 to-purple-600' },
            { amount: 100, color: 'from-rose-400 to-rose-600' }
          ].map((stake) => (
            <div key={stake.amount} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col">
              <div className={`h-16 bg-gradient-to-br ${stake.color} flex items-center justify-center relative`}>
                <span className="text-white font-black text-2xl drop-shadow-sm">{stake.amount}</span>
                <span className="absolute top-1.5 right-1.5 bg-white/20 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider">ETB</span>
              </div>
              <div className="p-3 text-center">
                <button onClick={() => navigate(`/bingo/live?stake=${stake.amount}`)} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-lg text-xs transition-colors">
                  Join Room
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
