import React from 'react';
import { api } from '../lib/api';
import { tg } from '../lib/telegram';
import { useGameStore } from '../store/gameStore';
import toast from 'react-hot-toast';

const HEADERS = ['B', 'I', 'N', 'G', 'O'];
const HEADER_COLORS = [
  'bg-blue-600', 'bg-green-600', 'bg-orange-500', 'bg-purple-600', 'bg-red-600'
];

export default function BingoCard() {
  const { room, player, calledNumbers, updateMarkedCells } = useGameStore();

  if (!player || !room) return null;

  const card = player.bingo_card;
  const marked = player.marked_cells;

  async function handleCellClick(row: number, col: number) {
    if (!room || room.status !== 'playing') return;
    const num = card[row][col];
    if (num === 0) return; // free space
    if (marked[row][col]) return; // already marked
    if (!calledNumbers.includes(num)) {
      toast.error(`${num} hasn't been called yet!`);
      tg?.HapticFeedback.notificationOccurred('error');
      return;
    }
    try {
      const res = await api.markCell(room.code, row, col);
      updateMarkedCells(res.markedCells);
      tg?.HapticFeedback.impactOccurred('medium');
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Headers */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        {HEADERS.map((h, i) => (
          <div key={h} className={`${HEADER_COLORS[i]} text-white text-center font-black text-lg rounded py-1`}>{h}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-rows-5 gap-1">
        {card.map((row, r) => (
          <div key={r} className="grid grid-cols-5 gap-1">
            {row.map((num, c) => {
              const isFree = r === 2 && c === 2;
              const isMarked = marked[r][c];
              const isCalled = !isFree && calledNumbers.includes(num);
              return (
                <button
                  key={c}
                  className={`bingo-cell aspect-square flex items-center justify-center rounded-lg text-sm font-bold border-2 transition-all
                    ${isFree ? 'bg-yellow-400 text-black border-yellow-300 text-lg' : ''}
                    ${isMarked && !isFree ? 'bg-purple-600 border-purple-400 text-white scale-95' : ''}
                    ${!isMarked && isCalled ? 'border-yellow-400 bg-gray-700 text-yellow-300' : ''}
                    ${!isMarked && !isCalled && !isFree ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' : ''}
                  `}
                  onClick={() => handleCellClick(r, c)}
                >
                  {isFree ? '⭐' : isMarked ? '✓' : num}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
