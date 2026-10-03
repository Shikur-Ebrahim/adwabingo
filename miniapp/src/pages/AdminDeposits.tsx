import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DepositRequest {
  id: string;
  telegram_id: string;
  amount: number;
  screenshot_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  deposit_methods: { type: string; name: string; logo_url: string } | null;
  users: { first_name: string; username: string } | null;
}

const typeBadge: Record<string, string> = {
  cbe: 'bg-yellow-100 text-yellow-700',
  boa: 'bg-blue-100 text-blue-700',
  telebirr: 'bg-purple-100 text-purple-700',
  mpesa: 'bg-green-100 text-green-700',
};

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [timeFilter, setTimeFilter] = useState('all');

  const fetchDeposits = useCallback(async () => {
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const res = await fetch(`${API_URL}/admin/deposits`, {
        headers: { 'x-telegram-init-data': initData }
      });
      if (res.ok) setDeposits(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const res = await fetch(`${API_URL}/admin/deposits/${id}/approve`, {
        method: 'POST',
        headers: { 'x-telegram-init-data': initData }
      });
      if (res.ok) {
        // Move to approved tab locally
        setDeposits(prev => prev.map(d => d.id === id ? { ...d, status: 'approved' } : d));
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const res = await fetch(`${API_URL}/admin/deposits/${id}/reject`, {
        method: 'DELETE',
        headers: { 'x-telegram-init-data': initData }
      });
      if (res.ok) {
        setDeposits(prev => prev.filter(d => d.id !== id));
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };
  };

  const now = new Date();
  const filteredDeposits = deposits.filter(d => {
    if (d.status !== activeTab) return false;
    if (timeFilter === 'all') return true;
    
    const date = new Date(d.created_at);
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (timeFilter === 'today') return diffDays <= 1;
    if (timeFilter === 'week') return diffDays <= 7;
    if (timeFilter === 'month') return diffDays <= 30;
    if (timeFilter === '3months') return diffDays <= 90;
    if (timeFilter === '6months') return diffDays <= 180;
    if (timeFilter === 'year') return diffDays <= 365;
    return true;
  });

  const pendingCount = deposits.filter(d => d.status === 'pending').length;

  const filters = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: '3months', label: '3 Months' },
    { id: '6months', label: '6 Months' },
    { id: 'year', label: '1 Year' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <Link to="/admin" className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="text-center">
          <h1 className="font-black text-slate-800 text-lg leading-tight">Deposits</h1>
          {pendingCount > 0 && (
            <span className="text-xs font-bold text-yellow-600">{pendingCount} pending</span>
          )}
        </div>
        <button
          onClick={() => { setLoading(true); fetchDeposits(); }}
          className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white px-4 py-3 space-x-2 border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2 font-bold text-sm rounded-xl transition-colors ${activeTab === 'pending' ? 'bg-yellow-400 text-yellow-950 shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          Pending
        </button>
        <button 
          onClick={() => setActiveTab('approved')}
          className={`flex-1 py-2 font-bold text-sm rounded-xl transition-colors ${activeTab === 'approved' ? 'bg-emerald-400 text-emerald-950 shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          Approved History
        </button>
      </div>

      {/* Filter Chips */}
      <div className="bg-white border-b border-gray-100 shadow-sm mb-2 rounded-b-2xl overflow-x-auto whitespace-nowrap px-4 py-2 flex space-x-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setTimeFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${timeFilter === f.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />)}
          </div>
        ) : filteredDeposits.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center flex flex-col items-center mt-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${activeTab === 'pending' ? 'bg-emerald-50 text-emerald-400' : 'bg-slate-50 text-slate-300'}`}>
              <CheckCircle2 size={28} />
            </div>
            <p className="text-slate-600 font-bold text-lg">{activeTab === 'pending' ? 'All Clear!' : 'No History'}</p>
            <p className="text-slate-400 text-sm font-medium mt-1">{activeTab === 'pending' ? 'No pending deposits to review.' : 'No approved deposits yet.'}</p>
          </div>
        ) : (
          filteredDeposits.map((dep) => {
            const isExpanded = expandedId === dep.id;
            const isProcessing = processingId === dep.id;
            const methodType = dep.deposit_methods?.type || 'cbe';

            return (
              <div key={dep.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Left — User + method info */}
                    <div className="flex items-center space-x-3 flex-1">
                      {dep.deposit_methods?.logo_url ? (
                        <img src={dep.deposit_methods.logo_url} alt="method" className="w-11 h-11 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1 flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <ImageIcon size={18} className="text-slate-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-black text-slate-800 leading-tight">{dep.users?.first_name || 'Unknown'}</p>
                          {dep.users?.username && <p className="text-[10px] text-slate-400 font-semibold">@{dep.users.username}</p>}
                        </div>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${typeBadge[methodType]}`}>
                          {methodType.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock size={11} className="text-slate-400" />
                          <span className="text-[11px] text-slate-400 font-semibold">{timeAgo(dep.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right — Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-xl text-emerald-600">{dep.amount.toLocaleString('en-US')}</p>
                      <p className="text-xs font-bold text-slate-400">ETB</p>
                    </div>
                  </div>

                  {/* Expand/Collapse toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : dep.id)}
                    className="mt-3 w-full flex items-center justify-center space-x-1 text-xs font-bold text-blue-500 hover:text-blue-600 py-1"
                  >
                    <span>{isExpanded ? 'Hide Screenshot' : 'View Screenshot'}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Screenshot preview */}
                {isExpanded && dep.screenshot_url && (
                  <div className="px-4 pb-3">
                    <img
                      src={dep.screenshot_url}
                      alt="Payment receipt"
                      className="w-full rounded-xl border border-gray-100 object-contain max-h-72"
                    />
                  </div>
                )}

                {/* Action buttons (Only show if pending) */}
                {activeTab === 'pending' ? (
                  <div className="grid grid-cols-2 border-t border-gray-100">
                    <button
                      onClick={() => handleReject(dep.id)}
                      disabled={isProcessing}
                      className="flex items-center justify-center space-x-2 py-3.5 text-rose-600 font-black text-sm bg-rose-50 hover:bg-rose-100 transition-colors border-r border-gray-100 disabled:opacity-40"
                    >
                      <XCircle size={18} />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleApprove(dep.id)}
                      disabled={isProcessing}
                      className="flex items-center justify-center space-x-2 py-3.5 text-emerald-600 font-black text-sm bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                    >
                      {isProcessing ? (
                        <span>Processing...</span>
                      ) : (
                        <><CheckCircle2 size={18} /><span>Approve</span></>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border-t border-emerald-100 py-3 text-center">
                    <span className="text-emerald-700 font-black text-sm flex items-center justify-center space-x-1">
                      <CheckCircle2 size={16} />
                      <span>Approved</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
