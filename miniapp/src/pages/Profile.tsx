import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { 
  Wallet, Gift, PlusCircle, ArrowDownToLine, Share2, 
  ArrowRightLeft, History, Users, Globe, Headphones, Megaphone, ChevronRight, X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Profile() {
  const { user, isProfileOpen, setProfileOpen } = useGameStore();
  const [supportUsername, setSupportUsername] = useState('adwabingo_admin');
  const navigate = useNavigate();

  useEffect(() => {
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

  const navigateTo = (path: string) => {
    setProfileOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* OVERLAY BACKDROP */}
      {isProfileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setProfileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div 
        className={`fixed top-0 left-0 h-full w-[75%] max-w-[320px] bg-slate-50 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col overflow-y-auto ${
          isProfileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* HEADER / BALANCES */}
        <div className="bg-slate-900 rounded-br-[2rem] px-5 pt-6 pb-8 shadow-md relative">
          <button 
            onClick={() => setProfileOpen(false)}
            className="absolute top-4 right-4 text-white/50 hover:text-white p-1"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center space-x-3 mb-6 mt-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500 border-2 border-white/20 flex items-center justify-center text-white font-black text-2xl shadow-sm shrink-0">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-black text-lg truncate">{user?.first_name || 'Player'}</p>
              <p className="text-white/50 text-sm font-semibold truncate">@{user?.username || 'user'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-white/70">
                <Wallet size={16} />
                <p className="text-[10px] font-bold uppercase tracking-wider">Main</p>
              </div>
              <p className="text-xl font-black text-white">{formatMoney(user?.main_balance)} <span className="text-[10px]">ETB</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-purple-300">
                <Gift size={16} />
                <p className="text-[10px] font-bold uppercase tracking-wider">Bonus</p>
              </div>
              <p className="text-xl font-black text-white">{formatMoney(user?.bonus_balance)} <span className="text-[10px]">ETB</span></p>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-4 py-4 flex flex-col space-y-3">
          {/* ACTION BUTTONS (Stacked instead of side-by-side for sidebar width) */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigateTo('/deposit')} className="bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 transition-colors text-yellow-950 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm">
              <PlusCircle size={20} className="mb-1" />
              <span className="font-bold text-xs">Deposit</span>
            </button>
            <button onClick={() => navigateTo('/withdraw')} className="bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-slate-700 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm border border-gray-100">
              <ArrowDownToLine size={20} className="mb-1" />
              <span className="font-bold text-xs">Withdraw</span>
            </button>
            <button onClick={handleInvite} className="bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-slate-700 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm border border-gray-100">
              <Share2 size={20} className="mb-1 text-blue-500" />
              <span className="font-bold text-xs">Invite</span>
            </button>
            <button onClick={() => { if(typeof WebApp !== 'undefined') WebApp.showAlert('Transfer coming soon!') }} className="bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-slate-700 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm border border-gray-100">
              <ArrowRightLeft size={20} className="mb-1 text-emerald-500" />
              <span className="font-bold text-xs">Transfer</span>
            </button>
          </div>

          {/* VERTICAL LIST */}
          <div className="bg-white rounded-[1.5rem] p-2 shadow-sm border border-gray-100 flex flex-col space-y-0.5 mt-2">
              
            <button onClick={() => navigateTo('/deposit')} className="w-full flex items-center px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-3 shrink-0">
                <History size={16} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[11px] sm:text-xs">Deposit History</span>
              <ChevronRight size={14} className="text-slate-300" />
            </button>

            <button onClick={() => navigateTo('/withdraw')} className="w-full flex items-center px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mr-3 shrink-0">
                <History size={16} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[11px] sm:text-xs">Withdraw History</span>
              <ChevronRight size={14} className="text-slate-300" />
            </button>

            <button onClick={handleInvite} className="w-full flex items-center px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mr-3 shrink-0">
                <Users size={16} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[11px] sm:text-xs">Invite Person</span>
              <ChevronRight size={14} className="text-slate-300" />
            </button>

            <button onClick={() => { if(typeof WebApp !== 'undefined') WebApp.showAlert('English is currently selected.') }} className="w-full flex items-center px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mr-3 shrink-0">
                <Globe size={16} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[11px] sm:text-xs">Language</span>
              <span className="text-[9px] font-black text-slate-400 mr-2 uppercase bg-slate-100 px-2 py-0.5 rounded">EN</span>
              <ChevronRight size={14} className="text-slate-300" />
            </button>

            <button onClick={handleSupport} className="w-full flex items-center px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mr-3 shrink-0">
                <Headphones size={16} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[11px] sm:text-xs">Support Team</span>
              <ChevronRight size={14} className="text-slate-300" />
            </button>

            <button onClick={handleChannel} className="w-full flex items-center px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors active:bg-slate-100 text-left">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mr-3 shrink-0">
                <Megaphone size={16} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[11px] sm:text-xs">Channel</span>
              <ChevronRight size={14} className="text-slate-300" />
            </button>

          </div>
        </div>
      </div>
    </>
  );
}
