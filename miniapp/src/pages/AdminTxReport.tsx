import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, ArrowDownCircle, ArrowUpCircle, Gift, Users, Calendar, TrendingUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Tx {
  id: string;
  type: 'deposit' | 'withdrawal' | 'deposit_bonus' | 'invitation_reward';
  amount: number;
  status: string;
  created_at: string;
  username: string;
  telegram_id: string;
}

interface Stats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalDepBonus: number;
  totalInvBonus: number;
}

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1, exact: true },
  { label: '7 Days', days: 7 },
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
  { label: 'All Time', days: -1 },
];

const TYPE_META = {
  deposit: { label: 'Deposit', icon: <ArrowDownCircle size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  withdrawal: { label: 'Withdrawal', icon: <ArrowUpCircle size={14} />, color: 'text-rose-600', bg: 'bg-rose-50', badge: 'bg-rose-100 text-rose-700' },
  deposit_bonus: { label: '1st Deposit Bonus', icon: <Gift size={14} />, color: 'text-violet-600', bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700' },
  invitation_reward: { label: 'Invite Reward', icon: <Users size={14} />, color: 'text-blue-600', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
};

function toDateStr(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function AdminTxReport() {
  const { user } = useGameStore();
  const today = toDateStr(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [activePreset, setActivePreset] = useState('Today');
  const [stats, setStats] = useState<Stats>({ totalDeposits: 0, totalWithdrawals: 0, totalDepBonus: 0, totalInvBonus: 0 });
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | Tx['type']>('all');
  const [showCustom, setShowCustom] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  });

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.label);
    setShowCustom(false);
    const now = new Date();
    if (preset.days === -1) {
      setFrom('2024-01-01');
      setTo(today);
    } else if (preset.days === 0) {
      setFrom(today);
      setTo(today);
    } else if (preset.exact) {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const yStr = toDateStr(y);
      setFrom(yStr);
      setTo(yStr);
    } else {
      const from = new Date(now); from.setDate(from.getDate() - preset.days);
      setFrom(toDateStr(from));
      setTo(today);
    }
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`${API_URL}/admin/tx-report?${params}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  if (!user || (user.role !== 'admin' && !(user.role === 'worker' && user.permissions?.reports))) {
    return <div className="p-10 text-center font-bold text-slate-600">Access Denied</div>;
  }

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  const statCards = [
    { label: 'Deposits', value: stats.totalDeposits, icon: <ArrowDownCircle size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Withdrawals', value: stats.totalWithdrawals, icon: <ArrowUpCircle size={16} />, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: '1st Dep. Bonus', value: stats.totalDepBonus, icon: <Gift size={16} />, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Invite Reward', value: stats.totalInvBonus, icon: <Users size={16} />, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* HEADER */}
      <div className="bg-white px-3 py-3 shadow-sm border-b border-gray-100 flex items-center shrink-0">
        <Link to="/admin" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:bg-slate-200">
          <ArrowLeft size={18} />
        </Link>
        <div className="ml-3 flex-1">
          <h1 className="text-base font-black text-slate-800">Transaction Report</h1>
          <p className="text-[10px] text-slate-400 font-medium">{from} → {to}</p>
        </div>
        <button onClick={fetchReport} disabled={loading} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:bg-slate-200">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* SCROLL AREA */}
      <div className="flex-1 overflow-y-auto">
        {/* DATE PRESETS */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                  activePreset === p.label
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => { setShowCustom(!showCustom); setActivePreset(''); }}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold border flex items-center space-x-1 transition-all ${
                showCustom ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              <Calendar size={11} />
              <span>Custom</span>
              <ChevronDown size={11} />
            </button>
          </div>
        </div>

        {/* CUSTOM DATE RANGE */}
        {showCustom && (
          <div className="px-3 pb-2">
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center space-x-2">
              <div className="flex-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">From</p>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-400" />
              </div>
              <div className="text-slate-300 font-black">→</div>
              <div className="flex-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">To</p>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-400" />
              </div>
              <button onClick={fetchReport} className="shrink-0 h-8 px-3 bg-slate-800 text-white text-[11px] font-black rounded-lg active:scale-95 transition-all">
                Go
              </button>
            </div>
          </div>
        )}

        {/* STAT CARDS */}
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          {statCards.map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center space-x-2.5">
              <div className={`w-8 h-8 rounded-lg ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{card.label}</p>
                <p className={`text-sm font-black ${card.color}`}>{fmt(card.value)} <span className="text-[9px] font-semibold text-slate-400">ETB</span></p>
              </div>
            </div>
          ))}
        </div>

        {/* NET FLOW BREAKDOWN */}
        <div className="px-3 pb-3">
          <div className="bg-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center space-x-1.5 mb-1">
              <TrendingUp size={14} className="text-white/60" />
              <span className="text-white/60 font-black text-[10px] uppercase tracking-wider">Net Profit Breakdown</span>
            </div>

            {/* Formula rows */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-white/70 text-[11px] font-semibold">Deposits</span>
                </div>
                <span className="text-emerald-400 font-black text-[12px]">+{fmt(stats.totalDeposits)} ETB</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="text-white/70 text-[11px] font-semibold">Withdrawals</span>
                </div>
                <span className="text-rose-400 font-black text-[12px]">−{fmt(stats.totalWithdrawals)} ETB</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span className="text-white/70 text-[11px] font-semibold">1st Deposit Bonus</span>
                </div>
                <span className="text-violet-400 font-black text-[12px]">−{fmt(stats.totalDepBonus)} ETB</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-white/70 text-[11px] font-semibold">Invite Reward</span>
                </div>
                <span className="text-blue-400 font-black text-[12px]">−{fmt(stats.totalInvBonus)} ETB</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Net result */}
            <div className="flex items-center justify-between">
              <span className="text-white font-black text-xs">= Net Profit</span>
              <span className={`font-black text-base ${
                stats.totalDeposits - stats.totalWithdrawals - stats.totalDepBonus - stats.totalInvBonus >= 0
                  ? 'text-yellow-300' : 'text-rose-400'
              }`}>
                {stats.totalDeposits - stats.totalWithdrawals - stats.totalDepBonus - stats.totalInvBonus >= 0 ? '+' : ''}
                {fmt(stats.totalDeposits - stats.totalWithdrawals - stats.totalDepBonus - stats.totalInvBonus)} ETB
              </span>
            </div>
          </div>
        </div>

        {/* TYPE FILTER CHIPS */}
        <div className="px-3 pb-2 flex space-x-1.5 overflow-x-auto scrollbar-hide">
          {(['all', 'deposit', 'withdrawal', 'deposit_bonus', 'invitation_reward'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black transition-all border ${
                filter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : TYPE_META[f].label}
            </button>
          ))}
        </div>

        {/* TRANSACTION LIST */}
        <div className="px-3 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400">Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <p className="text-2xl">📭</p>
              <p className="text-xs font-bold text-slate-400">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(tx => {
                const meta = TYPE_META[tx.type];
                return (
                  <div key={tx.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${meta.badge}`}>{meta.label}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${tx.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : tx.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 truncate">@{tx.username}</p>
                      <p className="text-[9px] text-slate-400 font-medium">{fmtTime(tx.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${meta.color}`}>
                        {tx.type === 'withdrawal' ? '-' : '+'}
                        {fmt(tx.amount)}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold">ETB</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
