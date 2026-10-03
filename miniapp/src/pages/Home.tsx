import { useGameStore } from '../store/gameStore';
import { Gift, Wallet, ArrowDownToLine, Share2, PlusCircle, Info } from 'lucide-react';
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
    <div className="flex flex-col space-y-3 pb-1">
      {/* HEADER SECTION */}
      <div className="bg-white px-3 py-2.5 rounded-b-xl shadow-sm border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {initial}
          </div>
          <div>
            <p className="font-bold text-xs uppercase tracking-wider text-slate-700 leading-tight">{user?.first_name || 'USER'}</p>
            {user?.role !== 'user' && (
              <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0 rounded-full font-semibold">
                {user?.role}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-right">
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1 text-purple-500 mb-0">
              <Gift size={12} />
            </div>
            <p className="text-[10px] font-bold text-slate-700">{formatMoney(user?.bonus_balance)} ETB</p>
          </div>
          
          <div className="flex flex-col items-end">
            <p className="text-[9px] text-slate-500 font-medium leading-none">Wallet</p>
            <p className="text-xs font-bold text-green-600 mt-0.5">{formatMoney(user?.main_balance)} ETB</p>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="px-3 grid grid-cols-3 gap-2">
        <button className="flex items-center justify-center space-x-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-colors">
          <PlusCircle size={14} />
          <span>Deposit</span>
        </button>
        <button className="flex items-center justify-center space-x-1 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-colors">
          <ArrowDownToLine size={14} />
          <span>Withdraw</span>
        </button>
        <button 
          onClick={handleInvite}
          className="flex items-center justify-center space-x-1 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-colors"
        >
          <Share2 size={14} />
          <span>Invite</span>
        </button>
      </div>

      {/* ACTIVE GAMES */}
      <div className="px-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-500 tracking-wider text-[10px]">ACTIVE GAMES</h2>
          <button className="text-blue-500 flex items-center space-x-1 text-[10px] font-semibold">
            <Info size={12} />
            <span>Help</span>
          </button>
        </div>
        
        <div className="relative rounded-xl overflow-hidden shadow-sm h-32 bg-white flex items-center justify-center border border-gray-100">
          <img 
            src="/banner.jpg" 
            alt="Adwa Bingo" 
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-1 left-0 right-0 flex justify-center">
            <div className="bg-yellow-400 text-yellow-950 px-4 py-1 rounded-full font-bold text-[10px] shadow-md border border-yellow-300">
              PLAY NOW
            </div>
          </div>
        </div>
      </div>

      {/* MEDEB (STAKES) */}
      <div className="px-3">
        <h2 className="font-bold text-slate-500 tracking-wider text-[10px] mb-1.5">SELECT MEDEB</h2>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { amount: 10, color: 'from-blue-400 to-blue-600' },
            { amount: 30, color: 'from-emerald-400 to-emerald-600' },
            { amount: 50, color: 'from-purple-400 to-purple-600' },
            { amount: 100, color: 'from-rose-400 to-rose-600' },
            { amount: 150, color: 'from-orange-400 to-orange-600' },
            { amount: 200, color: 'from-red-500 to-red-700' }
          ].map((stake) => (
            <div key={stake.amount} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className={`h-10 bg-gradient-to-br ${stake.color} flex items-center justify-center relative`}>
                <span className="text-white font-black text-lg drop-shadow-sm">{stake.amount}</span>
                <span className="absolute top-1 right-1 bg-white/20 px-1 py-0.5 rounded-[4px] text-[6px] font-bold text-white uppercase tracking-wider">ETB</span>
              </div>
              <div className="p-1.5 text-center">
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 rounded-md text-[10px] transition-colors">
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
