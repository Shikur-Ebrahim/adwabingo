import { useState } from 'react';
import { ArrowLeft, Share2, Copy, Check, Users, Gift, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import WebApp from '@twa-dev/sdk';

export default function Invite() {
  const { user, setProfileOpen } = useGameStore();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // The bot username should ideally come from env, but we can hardcode for adwabingo
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'adwabingo_bot';
  const inviteLink = `https://t.me/${botUsername}?start=ref_${user?.telegram_id || 'player'}`;

  const handleBack = () => {
    navigate(-1);
    setTimeout(() => setProfileOpen(true), 50);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      if (typeof WebApp !== 'undefined') WebApp.HapticFeedback.impactOccurred('light');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    const text = `🎮 Play ADWA Bingo with me! Join using my link and let's win together!\n\n${inviteLink}`;
    if (typeof WebApp !== 'undefined') {
      // Use Telegram's native share feature if available
      WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('🎮 Play ADWA Bingo with me! Join using my link and let\'s win together!')}`);
    } else {
      // Fallback
      if (navigator.share) {
        navigator.share({
          title: 'ADWA Bingo',
          text: 'Play ADWA Bingo with me!',
          url: inviteLink,
        }).catch(console.error);
      } else {
        handleCopy();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* HEADER */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm border-b border-gray-100 flex items-center sticky top-0 z-10">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex-1">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Invite Friends</h1>
          <p className="text-xs text-slate-500 font-medium">Earn bonus ETB</p>
        </div>
      </div>

      <div className="px-4 py-5 flex flex-col space-y-5">

        {/* HERO BANNER */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] p-6 text-white text-center shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8 blur-lg"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm">
              <Gift size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-black mb-1">Earn 10% Bonus</h2>
            <p className="text-white/80 text-sm font-medium leading-relaxed max-w-[250px]">
              Invite your friends and earn <span className="font-bold text-white">10% of their first deposit</span> straight into your Bonus Balance!
            </p>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4">How it works</h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-black text-sm shrink-0 mr-3">1</div>
              <div>
                <p className="text-sm font-bold text-slate-700">Share your link</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Send your invite link to friends.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center font-black text-sm shrink-0 mr-3">2</div>
              <div>
                <p className="text-sm font-bold text-slate-700">Friend joins & deposits</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">They start the bot and make their 1st deposit.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center font-black text-sm shrink-0 mr-3">3</div>
              <div>
                <p className="text-sm font-bold text-slate-700">You get rewarded!</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">You instantly receive 10% in your Bonus Balance.</p>
              </div>
            </div>
          </div>
        </div>

        {/* LINK SECTION */}
        <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Your Invite Link</label>
          <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1">
            <div className="flex-1 px-3 py-2.5 overflow-x-auto whitespace-nowrap hide-scrollbar flex items-center">
              <span className="text-sm font-medium text-slate-600">{inviteLink}</span>
            </div>
            <button
              onClick={handleCopy}
              className={`shrink-0 w-12 h-10 rounded-lg flex items-center justify-center transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>

          <button
            onClick={handleShare}
            className="mt-4 w-full bg-slate-800 text-white hover:bg-slate-700 py-3.5 rounded-xl font-black text-sm shadow-sm transition-transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <Share2 size={18} />
            <span>Share Link</span>
          </button>
        </div>

      </div>
    </div>
  );
}
