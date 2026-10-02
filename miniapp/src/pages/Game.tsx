import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { subscribeToRoom } from '../lib/supabase';
import { tg } from '../lib/telegram';
import { useGameStore } from '../store/gameStore';
import BingoCard from '../components/BingoCard';
import CalledNumbers from '../components/CalledNumbers';
import Players from '../components/Players';
import toast from 'react-hot-toast';

interface GameProps {
  roomCode: string;
  onBack: () => void;
}

export default function Game({ roomCode, onBack }: GameProps) {
  const { room, player, setRoom, setPlayer, setPlayers, setCalledNumbers, addCalledNumber, setLoading, isLoading } = useGameStore();
  const [tab, setTab] = useState<'card' | 'numbers' | 'players'>('card');
  const [winner, setWinner] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const loadGame = useCallback(async () => {
    setLoading(true);
    try {
      const [roomData, cardData] = await Promise.all([
        api.getRoom(roomCode),
        api.getMyCard(roomCode),
      ]);
      setRoom(roomData.room);
      setPlayers(roomData.players);
      setCalledNumbers(roomData.calledNumbers);
      setPlayer(cardData.player);

      if (roomData.room.status === 'finished') {
        const winner = roomData.players.find((p: any) => p.has_bingo);
        setWinner(winner?.username || 'Someone');
      }

      // Subscribe realtime
      unsubRef.current = subscribeToRoom(
        roomData.room.id,
        (n) => {
          addCalledNumber(n);
          toast(`🎲 ${n <= 15 ? 'B' : n <= 30 ? 'I' : n <= 45 ? 'N' : n <= 60 ? 'G' : 'O'}${n} called!`, { icon: '🎱', duration: 3000 });
          tg?.HapticFeedback.notificationOccurred('success');
        },
        (updatedRoom) => {
          setRoom(updatedRoom);
          if (updatedRoom.status === 'finished') {
            api.getRoom(roomCode).then(d => {
              const w = d.players.find((p: any) => p.has_bingo);
              setWinner(w?.username || 'Someone');
            });
          }
        }
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [roomCode, setRoom, setPlayers, setCalledNumbers, setPlayer, addCalledNumber, setLoading]);

  useEffect(() => {
    loadGame();
    return () => { unsubRef.current?.(); };
  }, [loadGame]);

  useEffect(() => {
    tg?.BackButton.show();
    tg?.BackButton.onClick(onBack);
    return () => {
      tg?.BackButton.hide();
      tg?.BackButton.offClick(onBack);
    };
  }, [onBack]);

  async function handleClaimBingo() {
    if (!room) return;
    tg?.MainButton.showProgress(false);
    tg?.MainButton.disable();
    try {
      const res = await api.claimBingo(room.code);
      setWinner(res.winner);
      tg?.HapticFeedback.notificationOccurred('success');
      toast.success('🎉 BINGO! You won!');
    } catch (e: any) {
      toast.error(e.message);
      tg?.HapticFeedback.notificationOccurred('error');
    } finally {
      tg?.MainButton.hideProgress();
      tg?.MainButton.enable();
    }
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">🎱</div>
        <div className="text-gray-400">Loading game...</div>
      </div>
    </div>
  );

  if (!player || !room) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-4">😕</div>
        <div className="text-gray-400 mb-4">You're not in this room</div>
        <button onClick={onBack} className="bg-purple-600 text-white px-6 py-2 rounded-xl">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-white">Room: <span className="text-purple-400 font-mono">{room.code}</span></div>
            <div className={`text-xs font-semibold ${
              room.status === 'playing' ? 'text-green-400' :
              room.status === 'waiting' ? 'text-yellow-400' : 'text-gray-400'
            }`}>
              {room.status === 'playing' ? '🟢 Live' : room.status === 'waiting' ? '⏳ Waiting' : '✅ Finished'}
            </div>
          </div>
          <button onClick={loadGame} className="text-gray-400 hover:text-white text-xl">↻</button>
        </div>
      </div>

      {/* Winner overlay */}
      {winner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-3xl p-8 text-center max-w-sm w-full celebrate">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-yellow-400 mb-2">BINGO!</h2>
            <p className="text-white text-lg mb-1">Winner:</p>
            <p className="text-2xl font-bold text-green-400 mb-6">{winner}</p>
            <button onClick={onBack} className="bg-purple-600 text-white px-8 py-3 rounded-2xl font-bold text-lg">
              🏠 Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['card', 'numbers', 'players'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              tab === t ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500'
            }`}>
            {t === 'card' ? '🃏 My Card' : t === 'numbers' ? '🎲 Numbers' : '👥 Players'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4">
        {tab === 'card' && <BingoCard />}
        {tab === 'numbers' && <CalledNumbers />}
        {tab === 'players' && <Players />}
      </div>

      {/* BINGO Button */}
      {room.status === 'playing' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800">
          <button
            onClick={handleClaimBingo}
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-black text-xl py-4 rounded-2xl shadow-lg transition-all active:scale-95"
          >
            🏆 BINGO!
          </button>
        </div>
      )}
    </div>
  );
}
