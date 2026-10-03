import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Gamepad2, Wallet, Trophy, User } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from './store/gameStore';

import Home from './pages/Home';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Worker from './pages/Worker';

function Navigation() {
  const location = useLocation();
  const { user, isProfileOpen, setProfileOpen } = useGameStore();

  // Hide the player bottom navigation if the user is an Admin or Worker
  if (user?.role === 'admin' || user?.role === 'worker') {
    return null;
  }

  const navItems = [
    { path: '/', label: 'Games', icon: Gamepad2 },
    { path: '/deposit', label: 'Deposit', icon: Wallet },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '#', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isProfileTab = item.label === 'Profile';
          const isActive = isProfileTab ? isProfileOpen : (!isProfileOpen && location.pathname === item.path);
          
          return (
            <Link
              key={item.label}
              to={isProfileTab ? location.pathname : item.path}
              onClick={(e) => {
                if (isProfileTab) {
                  e.preventDefault();
                  setProfileOpen(true);
                } else {
                  setProfileOpen(false);
                }
              }}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-yellow-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RoleRouter() {
  const { user } = useGameStore();
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  if (user?.role === 'worker') {
    return <Navigate to="/worker" replace />;
  }
  
  // Default user role sees the normal bingo home page
  return <Home />;
}

import AdminDepositMethods from './pages/AdminDepositMethods';
import AdminWithdrawalMethods from './pages/AdminWithdrawalMethods';
import AdminDeposits from './pages/AdminDeposits';
import AdminWithdrawals from './pages/AdminWithdrawals';

import DepositHistory from './pages/DepositHistory';
import WithdrawHistory from './pages/WithdrawHistory';
import Transfer from './pages/Transfer';

function App() {
  const { fetchUser, subscribeToBalance } = useGameStore();

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    fetchUser().then(() => {
      const unsub = subscribeToBalance();
      return unsub;
    });
  }, [fetchUser, subscribeToBalance]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
        <Routes>
          <Route path="/" element={<RoleRouter />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/deposit-history" element={<DepositHistory />} />
          <Route path="/withdraw-history" element={<WithdrawHistory />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/leaderboard" element={<div className="p-4 text-center mt-10 font-bold">Leaderboard coming soon...</div>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/deposit-methods" element={<AdminDepositMethods />} />
          <Route path="/admin/withdrawal-methods" element={<AdminWithdrawalMethods />} />
          <Route path="/admin/deposits" element={<AdminDeposits />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
          <Route path="/worker" element={<Worker />} />
        </Routes>
        <Profile />
        <Navigation />
      </div>
    </BrowserRouter>
  );
}

export default App;
