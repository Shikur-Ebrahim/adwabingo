import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, User, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface WithdrawalMethod {
  id: string;
  type: string;
  logo_url: string;
  min_withdrawal: number;
}

const typeLabels: Record<string, string> = {
  cbe: 'Commercial Bank of Ethiopia',
  boa: 'Bank of Abyssinia',
  telebirr: 'Telebirr',
  mpesa: 'M-Pesa',
};

const typeColors: Record<string, string> = {
  cbe: 'from-yellow-400 to-yellow-600',
  boa: 'from-blue-500 to-blue-700',
  telebirr: 'from-purple-500 to-purple-700',
  mpesa: 'from-green-500 to-green-700',
};

const typeEmoji: Record<string, string> = {
  cbe: '🏦',
  boa: '🏛️',
  telebirr: '📱',
  mpesa: '💚',
};

type Step = 'list' | 'form' | 'success' | 'pending_status';

export default function Withdraw() {
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WithdrawalMethod | null>(null);
  const [step, setStep] = useState<Step>('list');
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);

  // Form state
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getHeaders = () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    return { 'Content-Type': 'application/json', 'x-telegram-init-data': initData };
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [methodsRes, historyRes, profileRes] = await Promise.all([
        fetch(`${API_URL}/withdraw/methods`, { headers }),
        fetch(`${API_URL}/withdraw/history`, { headers }),
        fetch(`${API_URL}/player/profile`, { headers }),
      ]);

      if (methodsRes.ok) setMethods(await methodsRes.json());

      if (historyRes.ok) {
        const history = await historyRes.json();
        const pending = history.find((w: any) => w.status === 'pending');
        if (pending) {
          setPendingAmount(pending.amount);
          setStep('pending_status');
        }
      }

      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserBalance(Number(profile.player?.balance || 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) { setError('Please enter a valid amount.'); return; }
    if (amtNum < selected.min_withdrawal) { setError(`Minimum withdrawal is ${selected.min_withdrawal} ETB`); return; }
    if (amtNum > userBalance) { setError(`Insufficient balance. Your balance is ${userBalance.toLocaleString('en-US')} ETB`); return; }
    if (!accountName.trim()) { setError('Please enter your full name.'); return; }
    if (!accountNumber.trim()) { setError('Please enter your account/phone number.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/withdraw/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          method_id: selected.id,
          amount: amtNum,
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to submit.'); return; }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // ── STEP: PENDING STATUS ──────────────────────────────────────────────────
  if (step === 'pending_status') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-yellow-100">
            <Clock size={40} className="text-yellow-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Withdrawal Pending</h2>
          <p className="text-slate-500 font-medium mt-2 leading-relaxed">
            You have a withdrawal of <span className="font-black text-slate-700">{pendingAmount?.toLocaleString('en-US')} ETB</span> pending review.
          </p>
          <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-blue-700 font-semibold text-center">Please wait for admin to process before making a new request.</p>
          </div>
          <Link to="/" className="mt-5 block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-4 rounded-xl text-center transition-all active:scale-95">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── STEP: SUCCESS ────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-green-100">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Request Submitted!</h2>
          <p className="text-slate-500 font-medium mt-2 leading-relaxed">
            Your withdrawal of <span className="font-black text-slate-700">{parseFloat(amount).toLocaleString('en-US')} ETB</span> is being processed.
          </p>
          <div className="mt-5 bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs text-green-700 font-semibold text-center">Your balance has been debited. Funds will be transferred within a few minutes.</p>
          </div>
          <Link to="/" className="mt-5 block w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black py-4 rounded-xl text-center transition-all active:scale-95">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── STEP: FORM ────────────────────────────────────────────────────────────
  if (step === 'form' && selected) {
    const gradient = typeColors[selected.type] || 'from-slate-500 to-slate-700';
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradient} px-4 pt-6 pb-8`}>
          <div className="flex items-center space-x-3 mb-4">
            <button onClick={() => setStep('list')} className="text-white/80 hover:text-white p-1">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg font-black text-white">
              {typeEmoji[selected.type]} {typeLabels[selected.type] || selected.type.toUpperCase()}
            </h1>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-white">
            <p className="text-white/80 text-sm font-medium">Available Balance</p>
            <p className="text-3xl font-black">{userBalance.toLocaleString('en-US')} <span className="text-xl">ETB</span></p>
            <p className="text-white/70 text-xs mt-1">Min withdrawal: {selected.min_withdrawal.toLocaleString('en-US')} ETB</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 -mt-4">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">

            {error && (
              <div className="flex items-start space-x-2 bg-red-50 border border-red-100 rounded-xl p-3">
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (ETB)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">ETB</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={selected.min_withdrawal}
                  max={userBalance}
                  className="w-full pl-14 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-blue-400 focus:outline-none text-slate-800 font-bold text-lg bg-slate-50"
                  required
                />
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-xs text-slate-400">Min: {selected.min_withdrawal} ETB</p>
                <button
                  type="button"
                  onClick={() => setAmount(String(userBalance))}
                  className="text-xs text-blue-500 font-bold"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Your full name on the account"
                  className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-blue-400 focus:outline-none text-slate-800 font-medium bg-slate-50"
                  required
                />
              </div>
            </div>

            {/* Account / Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {selected.type === 'telebirr' || selected.type === 'mpesa' ? 'Phone Number' : 'Account Number'}
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder={selected.type === 'telebirr' || selected.type === 'mpesa' ? '09XXXXXXXX' : 'Account number'}
                  className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-blue-400 focus:outline-none text-slate-800 font-medium bg-slate-50"
                  required
                />
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                ⚠️ Your main balance will be immediately debited. Funds will be transferred to your account within a few minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 rounded-xl font-black text-white text-base transition-all active:scale-95 ${
                submitting
                  ? 'bg-slate-300 cursor-not-allowed'
                  : `bg-gradient-to-r ${gradient}`
              }`}
            >
              {submitting ? 'Processing...' : `Withdraw ${amount ? parseFloat(amount).toLocaleString('en-US') : '0'} ETB`}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── STEP: LIST ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 pt-6 pb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Link to="/" className="text-white/80 hover:text-white p-1">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-black text-white">Withdraw</h1>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-white">
          <p className="text-white/70 text-sm font-medium">Main Balance</p>
          <p className="text-3xl font-black">{userBalance.toLocaleString('en-US')} <span className="text-xl">ETB</span></p>
          <p className="text-white/60 text-xs mt-1">Only main balance can be withdrawn</p>
        </div>
      </div>

      {/* Methods */}
      <div className="px-4 -mt-4 pb-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-black text-slate-700 text-sm uppercase tracking-wider">Select Withdrawal Method</h2>
          </div>

          {methods.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <AlertCircle size={40} className="mb-3 opacity-50" />
              <p className="font-semibold">No withdrawal methods available</p>
              <p className="text-xs mt-1">Please check back later</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {methods.map(method => {
                const gradient = typeColors[method.type] || 'from-slate-500 to-slate-700';
                const emoji = typeEmoji[method.type] || '💳';
                const label = typeLabels[method.type] || method.type.toUpperCase();

                return (
                  <button
                    key={method.id}
                    onClick={() => { setSelected(method); setError(''); setStep('form'); }}
                    className="w-full flex items-center px-5 py-4 space-x-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-sm`}>
                      {method.logo_url ? (
                        <img src={method.logo_url} alt={label} className="w-8 h-8 object-contain rounded-xl" />
                      ) : (
                        <span>{emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Min: {method.min_withdrawal.toLocaleString('en-US')} ETB</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
