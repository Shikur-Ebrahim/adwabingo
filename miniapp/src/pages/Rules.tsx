import { ArrowLeft, Trophy, Clock, Users, Coins, Star, AlertCircle, CheckCircle2, Zap, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const rules = [
  {
    icon: Users,
    color: 'bg-blue-50 text-blue-500',
    title: 'Join a Game',
    body: 'Select your preferred stake (10, 20, 50, or 100 ETB), choose a cartela number (1–150), and pay to join. Each player picks a unique cartela per game.',
  },
  {
    icon: Clock,
    color: 'bg-purple-50 text-purple-500',
    title: 'Game Start',
    body: 'A countdown timer starts once the first player joins. The game begins when the timer reaches 0. Numbers are called automatically one by one.',
  },
  {
    icon: Star,
    color: 'bg-yellow-50 text-yellow-500',
    title: 'Bingo Pattern',
    body: 'Mark called numbers on your 5×5 cartela. Complete a full row, column, or diagonal to win. The first player to complete a BINGO pattern wins the prize pool.',
  },
  {
    icon: Trophy,
    color: 'bg-green-50 text-green-500',
    title: 'Winning & Prize',
    body: 'The winner receives the full prize pool. For 1–2 players: 100% of stakes go to prize. For 3+ players: 80% of stakes form the prize pool (20% platform fee).',
  },
  {
    icon: Coins,
    color: 'bg-orange-50 text-orange-500',
    title: 'Balance & Deposit',
    body: 'Stake is deducted from your Main Balance first, then Bonus Balance. Deposits are processed manually and credited within minutes after approval.',
  },
  {
    icon: AlertCircle,
    color: 'bg-rose-50 text-rose-500',
    title: 'Fair Play',
    body: 'All cartela numbers and called numbers are generated fairly. Cheating, exploiting bugs, or fraudulent activity will result in permanent account suspension.',
  },
  {
    icon: CheckCircle2,
    color: 'bg-teal-50 text-teal-500',
    title: 'Withdrawal',
    body: 'Minimum withdrawal applies per payment method. Withdrawals are reviewed and processed within 24 hours. Bonus balance cannot be withdrawn directly.',
  },
];

const bonusRules = [
  {
    icon: Zap,
    color: 'bg-amber-50 text-amber-500',
    badge: '⚡ Speed Bonus',
    title: '8-Call Early Win Bonus',
    body: 'If you win a BINGO in 8 calls or fewer, you earn a special speed bonus reward on top of the regular prize pool. The faster you win, the bigger the glory!',
    highlight: true,
  },
  {
    icon: Zap,
    color: 'bg-violet-50 text-violet-500',
    badge: '🚀 Speed Bonus',
    title: '10-Call Early Win Bonus',
    body: 'Win BINGO within 10 called numbers and receive an additional bonus reward. This bonus is added automatically to your winnings.',
    highlight: true,
  },
  {
    icon: Gift,
    color: 'bg-emerald-50 text-emerald-500',
    badge: '🎁 Welcome Reward',
    title: 'First Deposit Bonus',
    body: 'New users receive a bonus on their very first deposit. The bonus is added directly to your Bonus Balance and can be used to join games immediately.',
    highlight: true,
  },
  {
    icon: Gift,
    color: 'bg-pink-50 text-pink-500',
    badge: '🎁 Loyalty Reward',
    title: 'Second Deposit Bonus',
    body: 'Make your second deposit and receive an additional loyalty bonus. This reward is our way of saying thank you for continuing to play ADWA Bingo!',
    highlight: true,
  },
];

export default function Rules() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* Header */}
      <div className="bg-white sticky top-0 z-10 px-4 pt-5 pb-4 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all shrink-0">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-tight">Game Rules</h1>
            <p className="text-xs text-slate-400">How ADWA Bingo works</p>
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl px-5 py-5 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
          <Trophy size={30} className="text-white" />
        </div>
        <div>
          <p className="text-white font-black text-base leading-tight">ADWA Bingo</p>
          <p className="text-white/80 text-xs mt-0.5">Play fair, win big. Read the rules carefully before joining!</p>
        </div>
      </div>

      {/* Rules list */}
      <div className="px-4 mt-4 space-y-3">
        {rules.map((rule, i) => {
          const Icon = rule.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex gap-3">
              <div className={`w-9 h-9 rounded-xl ${rule.color} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="font-black text-slate-800 text-sm">{rule.title}</p>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">{rule.body}</p>
              </div>
            </div>
          );
        })}

        {/* Bonus Rewards Section */}
        <div className="mt-6">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-gradient-to-r from-yellow-300 to-orange-300" />
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
              <Gift size={13} className="text-white" />
              <span className="text-white font-black text-[11px] uppercase tracking-wide">Bonus Rewards</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-yellow-300 to-orange-300" />
          </div>

          <div className="space-y-3">
            {bonusRules.map((rule, i) => {
              const Icon = rule.icon;
              return (
                <div key={i} className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl p-4 border border-amber-100 shadow-sm flex gap-3 relative overflow-hidden">
                  {/* Subtle glow accent */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/5 rounded-full -translate-y-6 translate-x-6 pointer-events-none" />
                  <div className={`w-9 h-9 rounded-xl ${rule.color} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">
                        {rule.badge}
                      </span>
                    </div>
                    <p className="font-black text-slate-800 text-sm mb-1">{rule.title}</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{rule.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="bg-slate-800 rounded-2xl px-4 py-3.5 flex items-start gap-3 mt-2">
          <AlertCircle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-white/80 text-[11px] leading-relaxed">
            By playing ADWA Bingo you agree to these rules. The platform reserves the right to update rules at any time. Contact Support Team for any disputes.
          </p>
        </div>
        <div className="h-2" />
      </div>
    </div>
  );
}
