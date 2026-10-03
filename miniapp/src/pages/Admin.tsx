import { Users, UserCog, ArrowDownToLine, ArrowUpFromLine, Landmark, CreditCard, Gamepad2, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Admin() {
  const adminModules = [
    { id: 'dep_methods', title: 'Deposit Methods', icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'with_methods', title: 'Withdraw Methods', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'deposits', title: 'Deposits', icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: 'withdrawals', title: 'Withdrawals', icon: ArrowUpFromLine, color: 'text-rose-600', bg: 'bg-rose-100' },
    { id: 'users', title: 'Users', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: 'workers', title: 'Workers', icon: UserCog, color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'games_report', title: 'Games Report', icon: Gamepad2, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { id: 'tx_report', title: 'Transaction Report', icon: Receipt, color: 'text-teal-600', bg: 'bg-teal-100' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-4 pt-6 pb-8">
      <div className="grid grid-cols-2 gap-3">
        {adminModules.map((mod) => {
          const Icon = mod.icon;
          
          if (mod.id === 'dep_methods') {
            return (
              <Link 
                key={mod.id}
                to="/admin/deposit-methods" 
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 transition-all hover:shadow-md active:scale-95"
              >
                <div className={`w-12 h-12 rounded-2xl ${mod.bg} ${mod.color} flex items-center justify-center shadow-inner`}>
                  <Icon size={24} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-sm text-slate-700 text-center">{mod.title}</span>
              </Link>
            )
          }

          if (mod.id === 'with_methods') {
            return (
              <Link
                key={mod.id}
                to="/admin/withdrawal-methods"
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 transition-all hover:shadow-md active:scale-95"
              >
                <div className={`w-12 h-12 rounded-2xl ${mod.bg} ${mod.color} flex items-center justify-center shadow-inner`}>
                  <Icon size={24} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-sm text-slate-700 text-center">{mod.title}</span>
              </Link>
            )
          }

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
  );
}
