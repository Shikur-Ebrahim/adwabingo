import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { 
  Wallet, Gift, PlusCircle, ArrowDownToLine, Share2, 
  ArrowRightLeft, History, Users, Globe, Headphones, Megaphone, ChevronRight, X, Moon, BarChart2
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
        className={`fixed top-0 left-0 h-full w-[75%] max-w-[320px] bg-slate-50 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${
          isProfileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* HEADER / BALANCES */}
        <div className="bg-slate-900 rounded-br-[1.5rem] px-4 pt-5 pb-5 shadow-md relative shrink-0">
          <button 
            onClick={() => setProfileOpen(false)}
            className="absolute top-3 right-3 text-white/50 hover:text-white p-1"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center space-x-3 mb-4 mt-1">
            <div className="w-11 h-11 rounded-full bg-emerald-500 border-2 border-white/20 flex items-center justify-center text-white font-black text-xl shadow-sm shrink-0">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-black text-base truncate leading-tight">{user?.first_name || 'Player'}</p>
              <p className="text-white/50 text-xs font-semibold truncate">@{user?.username || 'user'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10 flex flex-col">
              <div className="flex items-center space-x-1.5 text-white/70 mb-0.5">
                <Wallet size={12} />
                <p className="text-[9px] font-bold uppercase tracking-wider">Main</p>
              </div>
              <p className="text-lg font-black text-white">{formatMoney(user?.main_balance)} <span className="text-[9px]">ETB</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10 flex flex-col">
              <div className="flex items-center space-x-1.5 text-purple-300 mb-0.5">
                <Gift size={12} />
                <p className="text-[9px] font-bold uppercase tracking-wider">Bonus</p>
              </div>
              <p className="text-lg font-black text-white">{formatMoney(user?.bonus_balance)} <span className="text-[9px]">ETB</span></p>
            </div>
          </div>
        </div>

        {/* CONTENT (No overflow hidden/auto if we want exact fit, but use overflow-y-auto just in case of tiny screens) */}
        <div className="px-3 py-3 flex flex-col space-y-2.5 flex-1 overflow-y-auto">
          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <button onClick={() => navigateTo('/deposit')} className="bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 transition-colors text-yellow-950 rounded-xl py-2 flex flex-col items-center justify-center shadow-sm">
              <PlusCircle size={18} className="mb-0.5" />
              <span className="font-bold text-[10px]">Deposit</span>
            </button>
            <button onClick={() => navigateTo('/withdraw')} className="bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-slate-700 rounded-xl py-2 flex flex-col items-center justify-center shadow-sm border border-gray-100">
              <ArrowDownToLine size={18} className="mb-0.5" />
              <span className="font-bold text-[10px]">Withdraw</span>
            </button>
            <button onClick={handleInvite} className="bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-slate-700 rounded-xl py-2 flex flex-col items-center justify-center shadow-sm border border-gray-100">
              <Share2 size={18} className="mb-0.5 text-blue-500" />
              <span className="font-bold text-[10px]">Invite</span>
            </button>
            <button onClick={() => { if(typeof WebApp !== 'undefined') WebApp.showAlert('Transfer coming soon!') }} className="bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-slate-700 rounded-xl py-2 flex flex-col items-center justify-center shadow-sm border border-gray-100">
              <ArrowRightLeft size={18} className="mb-0.5 text-emerald-500" />
              <span className="font-bold text-[10px]">Transfer</span>
            </button>
          </div>

          {/* VERTICAL LIST */}
          <div className="bg-white rounded-[1rem] p-1.5 shadow-sm border border-gray-100 flex flex-col flex-1 justify-around">
            
            <button onClick={() => navigateTo('/deposit')} className="w-full flex items-center px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100 text-left">
              <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-2.5 shrink-0">
                <History size={14} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[10px]">Deposit History</span>
              <ChevronRight size={12} className="text-slate-300" />
            </button>

            <button onClick={() => navigateTo('/withdraw')} className="w-full flex items-center px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100 text-left">
              <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mr-2.5 shrink-0">
                <History size={14} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[10px]">Withdraw History</span>
              <ChevronRight size={12} className="text-slate-300" />
            </button>

            <button onClick={() => { if(typeof WebApp !== 'undefined') WebApp.showAlert('Games Report coming soon!') }} className="w-full flex items-center px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100 text-left">
              <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-500 flex items-center justify-center mr-2.5 shrink-0">
                <BarChart2 size={14} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[10px]">Games Report</span>
              <ChevronRight size={12} className="text-slate-300" />
            </button>

            <button onClick={handleInvite} className="w-full flex items-center px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100 text-left">
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mr-2.5 shrink-0">
                <Users size={14} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[10px]">Invite Person</span>
              <ChevronRight size={12} className="text-slate-300" />
            </button>

            <button onClick={() => { if(typeof WebApp !== 'undefined') WebApp.showAlert('English is currently selected.') }} className="w-full flex items-center px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100 text-left">
              <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mr-2.5 shrink-0">
                <Globe size={14} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[10px]">Language</span>
              <span className="text-[8px] font-black text-slate-400 mr-2 uppercase bg-slate-100 px-1.5 py-0.5 rounded">EN</span>
              <ChevronRight size={12} className="text-slate-300" />
            </button>

            <button onClick={() => { if(typeof WebApp !== 'undefined') WebApp.showAlert('Dark Mode coming soon!') }} className="w-full flex items-center px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100 text-left">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mr-2.5 shrink-0">
                <Moon size={14} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[10px]">Dark Mode</span>
              <div className="w-6 h-3 bg-slate-200 rounded-full relative mr-2">
                <div className="w-3 h-3 bg-white rounded-full absolute left-0 shadow-sm border border-slate-200"></div>
              </div>
            </button>

            <button onClick={handleSupport} className="w-full flex items-center px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100 text-left">
              <div className="w-7 h-7 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mr-2.5 shrink-0">
                <Headphones size={14} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[10px]">Support Team</span>
              <ChevronRight size={12} className="text-slate-300" />
            </button>

            <button onClick={handleChannel} className="w-full flex items-center px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100 text-left">
              <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mr-2.5 shrink-0">
                <Megaphone size={14} />
              </div>
              <span className="flex-1 font-bold text-slate-700 text-[10px]">Channel</span>
              <ChevronRight size={12} className="text-slate-300" />
            </button>

          </div>
        </div>
      </div>
    </>
  );
}
