import { useState } from 'react';
import { ArrowLeft, ArrowRightLeft, CheckCircle2, AlertCircle, Send, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

type Step = 'form' | 'success' | 'error';

export default function Transfer() {
  const { user, fetchUser, language, setProfileOpen } = useGameStore();
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [recipientName, setRecipientName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
    setTimeout(() => setProfileOpen(true), 50);
  };

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!recipientId.trim()) { setErrorMsg('Please enter a Telegram ID.'); return; }
    if (!amt || amt <= 0) { setErrorMsg('Please enter a valid amount.'); return; }
    if (amt < 10) { setErrorMsg('Minimum transfer is 10 ETB.'); return; }

    setErrorMsg('');
    setLoading(true);
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const res = await fetch(`${API_URL}/player/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({ recipient_telegram_id: recipientId.trim(), amount: amt }),
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        // If it's not JSON, it's likely a 404 or 500 HTML page (e.g. backend not updated)
        setErrorMsg(`Server error (not JSON): ${res.status}. Did you deploy the backend update?`);
        setStep('error');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Transfer failed.');
        setStep('error');
      } else {
        setRecipientName(data.recipient_name);
        await fetchUser(); // refresh balance
        setStep('success');
        if (typeof WebApp !== 'undefined') WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (err: any) {
      setErrorMsg(`Network error: ${err.message}`);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ─── SUCCESS ──────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center px-6 pb-24">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800 text-center w-full max-w-sm">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-1">{t[language].transfer.successTitle}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            <span className="font-bold text-slate-700 dark:text-slate-200">{Number(amount).toLocaleString('en-US')} ETB</span> {t[language].transfer.successDesc.split('{amount}')[1]?.split('{recipient}')[0] || 'transferred to'} <span className="font-bold text-slate-700 dark:text-slate-200">{recipientName}</span>.
          </p>
          <div className="bg-emerald-50 rounded-2xl p-4 mb-6 text-left">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">{language === 'am' ? 'አዲስ ሂሳብ' : 'New Balance'}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{(user?.main_balance || 0).toLocaleString('en-US')} <span className="text-xs">ETB</span></p>
          </div>
          <button
            onClick={() => { setStep('form'); setRecipientId(''); setAmount(''); }}
            className="w-full bg-slate-800 text-white py-3.5 rounded-2xl font-black text-sm mb-3"
          >
            {language === 'am' ? 'ሌላ ያስተላልፉ' : 'Send Another Transfer'}
          </button>
          <button onClick={handleBack} className="w-full text-slate-400 text-sm font-semibold py-2">
            {t[language].profile?.logout || (language === 'am' ? 'ፕሮፋይል' : 'Back to Profile')}
          </button>
        </div>
      </div>
    );
  }

  // ─── MAIN FORM ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-24">

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 px-4 pt-6 pb-4 shadow-sm border-b border-gray-100 dark:border-slate-800 flex items-center sticky top-0 z-10">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex-1">
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{t[language].transfer.transferTitle}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t[language].transfer.transferSubtitle}</p>
        </div>
        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
          <ArrowRightLeft size={18} className="text-emerald-500" />
        </div>
      </div>

      <div className="px-4 py-5 flex flex-col space-y-4">

        {/* BALANCE CARD */}
        <div className="bg-slate-900 rounded-[1.5rem] p-5 flex justify-between items-center">
          <div>
            <p className="text-white/50 text-xs font-semibold mb-1">{t[language].transfer.yourMainBalance}</p>
            <p className="text-3xl font-black text-white">{(user?.main_balance || 0).toLocaleString('en-US')} <span className="text-sm">ETB</span></p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-900/10 flex items-center justify-center">
            <User size={24} className="text-white/70" />
          </div>
        </div>

        {/* RECIPIENT INPUT */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t[language].transfer.userIdLabel}</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder={t[language].transfer.userIdPlaceholder}
              value={recipientId}
              onChange={e => { setRecipientId(e.target.value); setErrorMsg(''); setStep('form'); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 font-bold text-base focus:outline-none focus:border-emerald-400 transition-colors"
            />
            <p className="text-[10px] text-slate-400 font-medium mt-2 ml-1">
              📌 Ask the recipient to copy their ID from their Profile sidebar
            </p>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t[language].transfer.amountLabel}</label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Enter amount (Min 10)"
                value={amount}
                onChange={e => { setAmount(e.target.value); setErrorMsg(''); setStep('form'); }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-16 text-slate-800 dark:text-slate-100 font-bold text-base focus:outline-none focus:border-emerald-400 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">ETB</span>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-rose-600">{errorMsg}</p>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={loading || !recipientId || !amount}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 rounded-2xl font-black text-base shadow-sm transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send size={18} />
              <span>{t[language].transfer.transferBtn}</span>
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-slate-400 font-semibold">
          ⚠️ {t[language].transfer.cannotTransferSelf}
        </p>
      </div>
    </div>
  );
}
