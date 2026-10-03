import { useGameStore } from '../store/gameStore';
import { Users, UserCog, ArrowDownToLine, ArrowUpFromLine, Landmark, CreditCard, LogOut } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

export default function Admin() {
  const { user } = useGameStore();

  const adminModules = [
    { id: 'dep_methods', title: 'Deposit Methods', icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'with_methods', title: 'Withdraw Methods', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'deposits', title: 'Deposits', icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: 'withdrawals', title: 'Withdrawals', icon: ArrowUpFromLine, color: 'text-rose-600', bg: 'bg-rose-100' },
    { id: 'users', title: 'Users', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: 'workers', title: 'Workers', icon: UserCog, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-8">
      {/* HEADER SECTION */}
      <div className="bg-white px-5 py-6 rounded-b-[2rem] shadow-sm border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-slate-100">
            {user?.first_name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-800 leading-tight">Admin Panel</h1>
            <p className="text-xs font-semibold text-slate-400">@{user?.username}</p>
          </div>
        </div>
        <button 
          onClick={() => WebApp.close()}
          className="bg-slate-100 p-2.5 rounded-full text-slate-600 hover:bg-slate-200 transition-colors shadow-inner"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* DASHBOARD GRID */}
      <div className="px-4 mt-6">
        <h2 className="text-[11px] font-black text-slate-400 tracking-widest mb-3 px-1">MANAGEMENT</h2>
        
        <div className="grid grid-cols-2 gap-3">
          {adminModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button 
                key={mod.id} 
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 transition-all hover:shadow-md active:scale-95"
              >
                <div className={`w-12 h-12 rounded-2xl ${mod.bg} ${mod.color} flex items-center justify-center shadow-inner`}>
                  <Icon size={24} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-sm text-slate-700 text-center">{mod.title}</span>
              </button>
            )
          })}
        </div>
      </div>
      
    </div>
  );
}
