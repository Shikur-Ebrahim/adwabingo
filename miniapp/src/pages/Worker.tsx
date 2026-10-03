import { useGameStore } from '../store/gameStore';

export default function Worker() {
  const { user } = useGameStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50  p-6">
      <div className="bg-white  p-8 rounded-2xl shadow-sm border border-gray-100  text-center w-full max-w-sm">
        <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-md">
          {user?.first_name?.charAt(0).toUpperCase() || 'W'}
        </div>
        <h1 className="text-2xl font-black text-slate-800 ">Welcome, Worker!</h1>
        <p className="text-sm text-slate-500  mt-2 font-medium">@{user?.username}</p>
        
        <div className="mt-8 pt-6 border-t border-gray-100 ">
          <p className="text-slate-500  font-medium">Worker features coming soon...</p>
        </div>
      </div>
    </div>
  );
}
