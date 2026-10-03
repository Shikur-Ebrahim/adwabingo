import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { 
  Wallet, Gift, PlusCircle, ArrowDownToLine, Share2, 
  ArrowRightLeft, History, Users, Globe, Headphones, Megaphone, ChevronRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Profile() {
  const { user } = useGameStore();
  const [supportUsername, setSupportUsername] = useState('adwabingo_admin');

  useEffect(() => {
    // Fetch support contact
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    fetch(`${API_URL}/player/support-contact`, {
      headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData }
    })
      .then(r => r.json())
      .then(data => {
        if (data.username) setSupportUsername(data.username);
      })
      .catch(console.error);
  }, []);

  const formatMoney = (amount: number | undefined) => (amount || 0).toLocaleString('en-US');

  const handleInvite = () => {
    if (user) {
      const inviteLink = `https://t.me/adwabingo_bot?start=ref_${user.telegram_id}`;
      if (typeof WebApp !== 'undefined' && WebApp.openTelegramLink) {
        WebApp.openTelegramLink(`https://t.me/share/url?url=${inviteLink}&text=Play Bingo with me on ADWA Bingo!`);
      } else {
        window.open(`https://t.me/share/url?url=${inviteLink}&text=Play Bingo with me on ADWA Bingo!`, '_blank');
      }
    }
  };

  const handleSupport = () => {
    const url = `https://t.me/${supportUsername.replace('@', '')}`;
    if (typeof WebApp !== 'undefined' && WebApp.openTelegramLink) {
      WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleChannel = () => {
    const url = 'https://t.me/adwabingo';
    if (typeof WebApp !== 'undefined' && WebApp.openTelegramLink) {
      WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      
      {/* HEADER / BALANCES */}
      <div className="bg-slate-900 rounded-b-[2.5rem] px-5 pt-6 pb-10 shadow-md">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500 border-[3px] border-white/20 flex items-center justify-center text-white font-black text-2xl shadow-sm">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-white font-black text-xl">{user?.first_name || 'Player'}</p>
              <p className="text-white/50 text-sm font-semibold">@{user?.username || 'user'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="flex items-center space-x-1.5 text-white/70 mb-1">
              <Wallet size={14} />
              <p className="text-[10px] font-bold uppercase tracking-wider">Main Balance</p>
            </div>
            <p className="text-2xl font-black text-white">{formatMoney(user?.main_balance)} <span className="text-[11px]">ETB</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="flex items-center space-x-1.5 text-purple-300 mb-1">
              <Gift size={14} />
              <p className="text-[10px] font-bold uppercase tracking-wider">Bonus</p>
            </div>
            <p className="text-2xl font-black text-white">{formatMoney(user?.bonus_balance)} <span className="text-[11px]">ETB</span></p>
          </div>
        </div>
      </div>

      {/* CONTENT (Overlapping header slightly) */}
      <div className="px-4 -mt-6 flex flex-col space-y-3">
        {/* TOP ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/deposit" className="bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 transition-colors text-yellow-950 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
            <PlusCircle size={22} className="mb-1.5" />
            <span className="font-bold text-sm">Deposit</span>
          </Link>
          <Link to="/withdraw" className="bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-gray-100">
            <ArrowDownToLine size={22} className="mb-1.5" />
            <span className="font-bold text-sm">Withdraw</span>
          </Link>
        </div>

        {/* SECOND ROW ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleInvite} className="bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm border border-gray-100">
            <Share2 size={20} className="mb-1 text-blue-500" />
            <span className="font-bold text-xs">Invite Friend</span>
          </button>
          <button onClick={() => { if(typeof WebApp !== 'undefined') WebApp.showAlert('Transfer coming soon!') }} className="bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm border border-gray-100">
            <ArrowRightLeft size={20} className="mb-1 text-emerald-500" />
            <span className="font-bold text-xs">Transfer</span>
          </button>
        </div>

        {/* VERTICAL LIST */}
        <div className="bg-white rounded-[1.5rem] p-2 shadow-sm border border-gray-100 flex flex-col space-y-0.5 mt-2">
            
          <Link to="/deposit" className="flex items-center px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-4">
              <History size={18} />
            </div>
            <span className="flex-1 font-bold text-slate-700 text-sm">Deposit History</span>
            <ChevronRight size={18} className="text-slate-300" />
          </Link>

          <Link to="/withdraw" className="flex items-center px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100">
            <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mr-4">
              <History size={18} />
            </div>
            <span className="flex-1 font-bold text-slate-700 text-sm">Withdraw History</span>
            <ChevronRight size={18} className="text-slate-300" />
          </Link>

          <button onClick={handleInvite} className="w-full flex items-center px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mr-4">
              <Users size={18} />
            </div>
            <span className="flex-1 font-bold text-slate-700 text-sm">Invite Person</span>
            <ChevronRight size={18} className="text-slate-300" />
          </button>

          <button onClick={() => { if(typeof WebApp !== 'undefined') WebApp.showAlert('English is currently selected.') }} className="w-full flex items-center px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
            <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mr-4">
              <Globe size={18} />
            </div>
            <span className="flex-1 font-bold text-slate-700 text-sm">Language</span>
            <span className="text-[10px] font-black text-slate-400 mr-3 uppercase bg-slate-100 px-2 py-0.5 rounded">EN</span>
            <ChevronRight size={18} className="text-slate-300" />
          </button>

          <button onClick={handleSupport} className="w-full flex items-center px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
            <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mr-4">
              <Headphones size={18} />
            </div>
            <span className="flex-1 font-bold text-slate-700 text-sm">Support Team</span>
            <ChevronRight size={18} className="text-slate-300" />
          </button>

          <button onClick={handleChannel} className="w-full flex items-center px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mr-4">
              <Megaphone size={18} />
            </div>
            <span className="flex-1 font-bold text-slate-700 text-sm">Channel</span>
            <ChevronRight size={18} className="text-slate-300" />
          </button>

        </div>
      </div>
    </div>
  );
}
