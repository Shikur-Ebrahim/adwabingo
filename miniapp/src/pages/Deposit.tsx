import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, CheckCircle2, UploadCloud, X, Clock, AlertCircle, Copy, Check, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DepositMethod {
  id: string;
  type: 'cbe' | 'boa' | 'telebirr' | 'mpesa';
  name: string;
  account_number: string;
  logo_url: string;
  min_deposit: number;
}

const typeLabels: Record<string, string> = {
  cbe: 'Commercial Bank of Ethiopia',
  boa: 'Bank of Abyssinia',
  telebirr: 'Telebirr',
  mpesa: 'M-Pesa',
};

const typeBadge: Record<string, string> = {
  cbe: 'bg-yellow-100 text-yellow-700',
  boa: 'bg-blue-100 text-blue-700',
  telebirr: 'bg-purple-100 text-purple-700',
  mpesa: 'bg-green-100 text-green-700',
};

type Step = 'list' | 'form' | 'success' | 'pending_status';

export default function Deposit() {
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DepositMethod | null>(null);
  const [step, setStep] = useState<Step>('list');
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [supportUsername, setSupportUsername] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => { fetchMethods(); }, []);

  const fetchMethods = async () => {
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const [methodsRes, historyRes, supportRes] = await Promise.all([
        fetch(`${API_URL}/deposit/methods`, { headers: { 'x-telegram-init-data': initData } }),
        fetch(`${API_URL}/deposit/history`, { headers: { 'x-telegram-init-data': initData } }),
        fetch(`${API_URL}/player/support-contact`, { headers: { 'x-telegram-init-data': initData } })
      ]);

      if (methodsRes.ok) setMethods(await methodsRes.json());
      
      if (historyRes.ok) {
        const history = await historyRes.json();
        const pending = history.find((d: any) => d.status === 'pending');
        if (pending) {
          setPendingAmount(pending.amount);
          setStep('pending_status');
        }
      }

      if (supportRes.ok) {
        const support = await supportRes.json();
        if (support.username) setSupportUsername(support.username);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectMethod = (method: DepositMethod) => {
    setSelected(method);
    setAmount('');
    setFile(null);
    setError('');
    setStep('form');
  };

  const uploadScreenshot = async (file: File): Promise<string> => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    const res = await fetch(`${API_URL}/upload/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
      body: JSON.stringify({ filename: file.name, contentType: file.type })
    });
    if (!res.ok) throw new Error('Could not get upload URL');
    const { uploadUrl, publicUrl } = await res.json();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });
    if (!uploadRes.ok) throw new Error('Screenshot upload failed. Check R2 CORS settings.');
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount.'); return;
    }
    if (numAmount < selected.min_deposit) {
      setError(`Minimum deposit is ${selected.min_deposit.toLocaleString()} ETB`); return;
    }
    if (!file) {
      setError('Please upload your payment screenshot.'); return;
    }
    setError('');
    setSubmitting(true);
    try {
      const screenshotUrl = await uploadScreenshot(file);
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const res = await fetch(`${API_URL}/deposit/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify({ method_id: selected.id, amount: numAmount, screenshot_url: screenshotUrl })
      });
      if (res.ok) {
        setStep('success');
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to submit.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── STEP: SUCCESS ────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-emerald-100">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Submitted!</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
            Your deposit request of <span className="font-black text-slate-700 dark:text-slate-200">{parseFloat(amount).toLocaleString('en-US')} ETB</span> is now <span className="text-yellow-600 font-black">pending review</span>.
          </p>
          <div className="mt-5 bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-start space-x-3">
            <Clock size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-700 font-semibold text-left">Your balance will be credited once an admin approves your payment. This usually takes a few minutes.</p>
          </div>
          <Link to="/" className="mt-3 block w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black py-4 rounded-xl text-center transition-all active:scale-95">
            Back to Home
          </Link>
          
          {supportUsername && (
            <a 
              href={`https://t.me/${supportUsername.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center space-x-2 text-blue-600 font-black text-sm bg-blue-50 hover:bg-blue-100 transition-colors py-3.5 rounded-xl w-full border border-blue-100"
            >
              <MessageCircle size={18} />
              <span>Need Help? Contact Support</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── STEP: PENDING STATUS ─────────────────────────────────────────────────────
  if (step === 'pending_status') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 text-center">
          <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-yellow-100">
            <Clock size={40} className="text-yellow-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Pending Review</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
            You already have a deposit of <span className="font-black text-slate-700 dark:text-slate-200">{pendingAmount?.toLocaleString('en-US')} ETB</span> waiting for approval.
          </p>
          <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-blue-700 font-semibold text-center">Please wait for an admin to process your current request before making a new one.</p>
          </div>
          
          {supportUsername && (
            <a 
              href={`https://t.me/${supportUsername.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center space-x-2 text-blue-600 font-black text-sm bg-blue-50 hover:bg-blue-100 transition-colors py-3.5 rounded-xl w-full border border-blue-100"
            >
              <MessageCircle size={18} />
              <span>Need Help? Contact Support</span>
            </a>
          )}

          <Link to="/" className="mt-3 block w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black py-4 rounded-xl text-center transition-all active:scale-95">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── STEP: FORM ───────────────────────────────────────────────────────────────
  if (step === 'form' && selected) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 px-4 py-4 rounded-b-2xl shadow-sm border-b border-gray-100 dark:border-slate-800 flex items-center space-x-3 sticky top-0 z-10">
          <button onClick={() => setStep('list')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-black text-slate-800 dark:text-slate-100 text-lg">Deposit via {typeLabels[selected.type]}</h1>
        </div>

        <div className="p-4 space-y-4">
          {/* Method Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
            <p className="text-[10px] font-black text-slate-400 tracking-widest mb-3">SEND MONEY TO</p>
            <div className="flex items-center space-x-4">
              {selected.logo_url ? (
                <img src={selected.logo_url} alt="logo" className="w-16 h-16 rounded-2xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-100 p-1.5" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs">NO IMG</div>
              )}
              <div className="flex-1">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${typeBadge[selected.type]}`}>
                  {selected.type.toUpperCase()}
                </span>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base mt-1 leading-tight">{selected.name}</h3>
                <div className="mt-2 flex items-center space-x-3">
                  <span className="font-black text-xl text-slate-700 dark:text-slate-200 tracking-wider">{selected.account_number}</span>
                  <button
                    onClick={() => copyToClipboard(selected.account_number)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      copied
                        ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {copied ? <><Check size={13} strokeWidth={3} /><span>Copied!</span></> : <><Copy size={13} /><span>Copy</span></>}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Min Deposit</span>
              <span className="font-black text-emerald-600">{selected.min_deposit.toLocaleString('en-US')} ETB</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-xs font-black text-blue-700 mb-2">HOW TO DEPOSIT</p>
            <ol className="space-y-1.5">
              {['Send the exact amount to the account above.', 'Take a screenshot of the payment receipt.', 'Enter the amount & upload the screenshot below.', 'Submit and wait for admin approval.'].map((step, i) => (
                <li key={i} className="flex items-start space-x-2 text-xs text-blue-600 font-semibold">
                  <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Amount Input */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
            <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-3">AMOUNT YOU SENT (ETB)</label>
            <div className="relative">
              <input
                type="number"
                min={selected.min_deposit}
                placeholder={`Min ${selected.min_deposit.toLocaleString()} ETB`}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-gray-200 rounded-xl px-4 py-4 text-xl font-black outline-none focus:border-yellow-400 focus:bg-white dark:bg-slate-900 transition-all"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">ETB</span>
            </div>
          </div>

          {/* Screenshot Upload */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
            <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-3">PAYMENT SCREENSHOT</label>
            {file ? (
              <div className="relative">
                <img src={URL.createObjectURL(file)} alt="Receipt" className="w-full max-h-52 object-cover rounded-xl border border-gray-100 dark:border-slate-800" />
                <button
                  onClick={() => setFile(null)}
                  className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-md"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <label className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                  <UploadCloud size={24} className="text-blue-500" />
                </div>
                <p className="font-bold text-slate-600 dark:text-slate-300">Tap to upload screenshot</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG supported</p>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(''); }} />
              </label>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle size={18} className="text-rose-500 flex-shrink-0" />
              <p className="text-sm font-bold text-rose-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-black py-4 rounded-2xl shadow-sm text-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : '✅ Submit Deposit Request'}
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: LIST ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 px-4 py-4 rounded-b-2xl shadow-sm border-b border-gray-100 dark:border-slate-800 flex items-center space-x-3 sticky top-0 z-10">
        <Link to="/" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight">Deposit</h1>
          <p className="text-xs text-slate-400 font-semibold">Choose a payment method</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl h-24 animate-pulse border border-gray-100 dark:border-slate-800" />
            ))}
          </div>
        ) : methods.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-10 text-center mt-4">
            <p className="text-slate-500 dark:text-slate-400 font-medium">No deposit methods available.</p>
            <p className="text-xs text-slate-400 mt-1">Please check back later.</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-black text-slate-400 tracking-widest px-1 pt-1">AVAILABLE METHODS</p>
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={() => selectMethod(method)}
                className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between transition-all hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center space-x-4">
                  {method.logo_url ? (
                    <img src={method.logo_url} alt="logo" className="w-14 h-14 rounded-2xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-100 p-1.5" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-[10px] font-bold">NO IMG</div>
                  )}
                  <div className="text-left">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${typeBadge[method.type]}`}>
                      {method.type.toUpperCase()}
                    </span>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 mt-1 leading-tight">{typeLabels[method.type]}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      Min: <span className="text-emerald-600 font-black">{method.min_deposit.toLocaleString('en-US')} ETB</span>
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
