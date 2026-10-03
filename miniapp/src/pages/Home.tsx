import { useGameStore } from '../store/gameStore';
import { Gift, ArrowDownToLine, Share2, PlusCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

export default function Home() {
  const { user } = useGameStore();

  const handleInvite = () => {
    if (user) {
      const inviteLink = `https://t.me/adwabingo_bot?start=ref_${user.telegram_id}`;
      WebApp.openTelegramLink(`https://t.me/share/url?url=${inviteLink}&text=Play Bingo with me on ADWA Bingo!`);
    }
  };

  const initial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U';

  const formatMoney = (amount: number | undefined) => {
    return (amount || 0).toLocaleString('en-US');
  };

  return (
    <div className="flex flex-col space-y-4 pb-6">
      {/* HEADER SECTION */}
      <div className="bg-white px-4 py-4 rounded-b-2xl shadow-sm border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            {initial}
          </div>
          <div>
            <p className="font-bold text-sm uppercase tracking-wider text-slate-700">{user?.first_name || 'USER'}</p>
            {user?.role !== 'user' && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                {user?.role}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4 text-right">
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1 text-purple-500 mb-0.5">
              <Gift size={14} />
            </div>
            <p className="text-xs font-bold text-slate-700">{formatMoney(user?.bonus_balance)} ETB</p>
          </div>
          
          <div className="flex flex-col items-end">
            <p className="text-[11px] text-slate-500 font-medium">Wallet</p>
            <p className="text-sm font-bold text-green-600">{formatMoney(user?.main_balance)} ETB</p>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="px-4 grid grid-cols-3 gap-3">
        <Link to="/deposit" className="flex items-center justify-center space-x-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors">
          <PlusCircle size={16} />
          <span>Deposit</span>
        </Link>
        <Link to="/withdraw" className="flex items-center justify-center space-x-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors">
          <ArrowDownToLine size={16} />
          <span>Withdraw</span>
        </Link>
        <button 
          onClick={handleInvite}
          className="flex items-center justify-center space-x-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors"
        >
          <Share2 size={16} />
          <span>Invite</span>
        </button>
      </div>

      {/* ACTIVE GAMES */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-500 tracking-wider text-xs">ACTIVE GAMES</h2>
          <button className="text-blue-500 flex items-center space-x-1 text-xs font-semibold">
            <Info size={14} />
            <span>Help</span>
          </button>
        </div>
        
        <div className="relative rounded-2xl overflow-hidden shadow-sm h-36 bg-white flex items-center justify-center border border-gray-100">
          <img 
            src="/banner.jpg" 
            alt="Adwa Bingo" 
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <div className="bg-yellow-400 text-yellow-950 px-6 py-1.5 rounded-full font-bold text-xs shadow-md border border-yellow-300">
              PLAY NOW
            </div>
          </div>
        </div>
      </div>

      {/* MEDEB (STAKES) */}
      <div className="px-4 pb-4">
        <h2 className="font-bold text-slate-500 tracking-wider text-xs mb-2">SELECT MEDEB</h2>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { amount: 10, color: 'from-blue-400 to-blue-600' },
            { amount: 30, color: 'from-emerald-400 to-emerald-600' },
            { amount: 50, color: 'from-purple-400 to-purple-600' },
            { amount: 100, color: 'from-rose-400 to-rose-600' },
            { amount: 150, color: 'from-orange-400 to-orange-600' },
            { amount: 200, color: 'from-red-500 to-red-700' }
          ].map((stake) => (
            <div key={stake.amount} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className={`h-14 bg-gradient-to-br ${stake.color} flex items-center justify-center relative`}>
                <span className="text-white font-black text-xl drop-shadow-sm">{stake.amount}</span>
                <span className="absolute top-1.5 right-1.5 bg-white/20 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider">ETB</span>
              </div>
              <div className="p-2 text-center">
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 rounded-lg text-xs transition-colors">
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
