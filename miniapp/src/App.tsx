import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Gamepad2, Wallet, Trophy, User } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from './store/gameStore';

import Home from './pages/Home';
import Deposit from './pages/Deposit';
import Profile from './pages/Profile';

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Games', icon: Gamepad2 },
    { path: '/deposit', label: 'Deposit', icon: Wallet },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
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

function App() {
  const { fetchUser, loading } = useGameStore();

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-50">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/leaderboard" element={<div className="p-4 text-center mt-10 font-bold">Leaderboard</div>} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
        <Navigation />
      </div>
    </BrowserRouter>
  );
}

export default App;
