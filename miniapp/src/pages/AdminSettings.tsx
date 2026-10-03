import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Save, Percent, Gift, Users, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Setting {
  key: string;
  value: string;
  label: string;
  description: string;
}

interface SettingField {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  unit: string;
  min: number;
  max: number;
  color: string;
  bg: string;
  defaultValue: number;
}

const SETTING_FIELDS: SettingField[] = [
  {
    key: 'first_deposit_bonus_pct',
    label: 'First Deposit Bonus',
    description: 'Bonus % added to depositor\'s bonus balance on their very first approved deposit.',
    icon: <Gift size={20} />,
    unit: '%',
    min: 0,
    max: 100,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    defaultValue: 20,
  },
  {
    key: 'invitation_reward_pct',
    label: 'Invitation Reward',
    description: 'Bonus % added to the inviter\'s bonus balance when their invited friend makes a first deposit.',
    icon: <Users size={20} />,
    unit: '%',
    min: 0,
    max: 100,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    defaultValue: 10,
  },
];

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        (data.settings as Setting[]).forEach(s => { map[s.key] = s.value; });
        // Fill defaults for any missing keys
        SETTING_FIELDS.forEach(f => {
          if (!(f.key in map)) map[f.key] = String(f.defaultValue);
        });
        setValues(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ key, value: values[key] }),
      });
      if (res.ok) {
        showToast('success', 'Setting saved successfully!');
        if (typeof WebApp !== 'undefined') WebApp.HapticFeedback.notificationOccurred('success');
      } else {
        const d = await res.json();
        showToast('error', d.error || 'Failed to save');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-8">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-bold transition-all ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm border-b border-gray-100 flex items-center sticky top-0 z-10">
        <Link to="/admin" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:bg-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="ml-4 flex-1">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Settings</h1>
          <p className="text-xs text-slate-500 font-medium">Configure bonus & reward values</p>
        </div>
        <button
          onClick={fetchSettings}
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:bg-slate-200 transition-colors"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* PAGE ICON */}
        <div className="flex items-center space-x-3 bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl px-4 py-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
            <Settings size={20} />
          </div>
          <div>
            <p className="text-white font-black text-sm">Bonus Configuration</p>
            <p className="text-white/60 text-[11px] font-medium">Changes apply on the next deposit approval</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <div className="w-7 h-7 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {SETTING_FIELDS.map((field) => (
              <div key={field.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Card Header */}
                <div className={`px-4 pt-4 pb-3 flex items-center space-x-3`}>
                  <div className={`w-10 h-10 rounded-xl ${field.bg} ${field.color} flex items-center justify-center shrink-0`}>
                    {field.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-800">{field.label}</p>
                    <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{field.description}</p>
                  </div>
                </div>

                {/* Input Row */}
                <div className="px-4 pb-4 flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={values[field.key] ?? field.defaultValue}
                      onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full border-2 border-slate-200 focus:border-violet-400 outline-none rounded-xl px-4 py-3 text-2xl font-black text-slate-800 text-center transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                      {field.unit}
                    </span>
                  </div>

                  <button
                    onClick={() => handleSave(field.key)}
                    disabled={saving === field.key}
                    className="h-12 px-5 bg-violet-500 hover:bg-violet-600 active:scale-95 disabled:opacity-60 text-white font-black text-sm rounded-xl flex items-center space-x-1.5 transition-all shadow-sm"
                  >
                    {saving === field.key ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>Save</span>
                  </button>
                </div>

                {/* Preview */}
                <div className="px-4 pb-4">
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center space-x-2">
                    <Percent size={13} className="text-slate-400 shrink-0" />
                    <p className="text-[11px] text-slate-500 font-medium">
                      Example: deposit of <span className="font-black text-slate-700">1,000 ETB</span> →{' '}
                      <span className={`font-black ${field.color}`}>
                        +{((parseFloat(values[field.key] ?? String(field.defaultValue)) / 100) * 1000).toFixed(0)} ETB
                      </span>{' '}
                      bonus
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
