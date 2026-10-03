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

  return (
    <div className="flex flex-col space-y-6">
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
            <p className="text-xs font-bold text-slate-700">{user?.bonus_balance || '0.00'} ETB</p>
          </div>
          
          <div className="flex flex-col items-end">
            <p className="text-[11px] text-slate-500 font-medium">Wallet</p>
            <p className="text-sm font-bold text-green-600">{user?.main_balance || '0.00'} ETB</p>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="px-4 grid grid-cols-3 gap-3">
        <button className="flex items-center justify-center space-x-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors">
          <PlusCircle size={16} />
          <span>Deposit</span>
        </button>
        <button className="flex items-center justify-center space-x-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors">
          <ArrowDownToLine size={16} />
          <span>Withdraw</span>
        </button>
        <button 
          onClick={handleInvite}
          className="flex items-center justify-center space-x-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors"
        >
          <Share2 size={16} />
          <span>Invite</span>
        </button>
      </div>

      {/* ACTIVE GAMES */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-500 tracking-wider text-xs">ACTIVE GAMES</h2>
          <button className="text-blue-500 flex items-center space-x-1 text-xs font-semibold">
            <Info size={14} />
            <span>Help</span>
          </button>
        </div>
        
        <div className="relative rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-yellow-300 to-yellow-500 h-40 flex flex-col items-center justify-center cursor-pointer transform transition-transform hover:scale-[1.02]">
          <h1 className="text-4xl font-black text-white drop-shadow-md tracking-widest uppercase">BINGO</h1>
          <div className="mt-2 bg-slate-900 text-yellow-400 px-6 py-1.5 rounded-full font-bold text-sm shadow-lg">
            PLAY NOW
          </div>
          {/* Decorative circles to look like bingo balls */}
          <div className="absolute top-4 left-6 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold shadow-inner text-xs">B</div>
          <div className="absolute bottom-6 right-8 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shadow-inner text-sm">O</div>
          <div className="absolute top-1/2 left-1/4 w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shadow-inner text-xs">I</div>
        </div>
      </div>

      {/* MEDEB (STAKES) */}
      <div className="px-4 pb-6">
        <h2 className="font-bold text-slate-500 tracking-wider text-xs mb-3">SELECT MEDEB</h2>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { amount: 10, color: 'from-blue-400 to-blue-600' },
            { amount: 30, color: 'from-emerald-400 to-emerald-600' },
            { amount: 50, color: 'from-purple-400 to-purple-600' },
            { amount: 100, color: 'from-rose-400 to-rose-600' }
          ].map((stake) => (
            <div key={stake.amount} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className={`h-16 bg-gradient-to-br ${stake.color} flex items-center justify-center relative`}>
                <span className="text-white font-black text-2xl drop-shadow-sm">{stake.amount}</span>
                <span className="absolute top-2 right-2 bg-white/20 px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider">ETB</span>
              </div>
              <div className="p-3 text-center">
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 rounded-lg text-sm transition-colors">
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
