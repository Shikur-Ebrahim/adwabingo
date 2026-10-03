import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle2, XCircle, ArrowDownToLine, Receipt } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Deposit {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  deposit_methods?: {
    type: string;
    name: string;
  };
}

export default function DepositHistory() {
  const [history, setHistory] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
        const res = await fetch(`${API_URL}/deposit/history`, {
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-init-data': initData
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'approved': return { color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2, label: 'Approved' };
      case 'rejected': return { color: 'text-rose-500', bg: 'bg-rose-50', icon: XCircle, label: 'Rejected' };
      default: return { color: 'text-amber-500', bg: 'bg-amber-50', icon: Clock, label: 'Pending' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* HEADER */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm border-b border-gray-100 flex items-center sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex-1">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Deposit History</h1>
          <p className="text-xs text-slate-500 font-medium">Your recent top-up records</p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 py-4 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-400">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Receipt size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700 mb-1">No Deposits Yet</h3>
            <p className="text-sm text-slate-500 mb-6">You haven't made any deposits.</p>
            <Link to="/deposit" className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-6 py-3 rounded-xl font-black text-sm shadow-sm transition-transform active:scale-95">
              Deposit Now
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((deposit) => {
              const { color, bg, icon: StatusIcon, label } = getStatusConfig(deposit.status);
              
              return (
                <div key={deposit.id} className="bg-white rounded-[1.25rem] p-4 shadow-sm border border-gray-100 flex items-center">
                  <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0 mr-4`}>
                    <ArrowDownToLine size={24} className={color} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">
                      {deposit.deposit_methods?.name || 'Bank Transfer'}
                    </p>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <StatusIcon size={12} className={color} />
                      <span className={`text-[10px] font-black uppercase tracking-wider ${color}`}>
                        {label}
                      </span>
                      <span className="text-slate-300 mx-1">•</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {formatDate(deposit.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right pl-3">
                    <p className="font-black text-slate-800">
                      +{deposit.amount.toLocaleString('en-US')} <span className="text-xs">ETB</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
