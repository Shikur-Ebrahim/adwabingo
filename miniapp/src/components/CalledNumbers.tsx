import React from 'react';
import { useGameStore } from '../store/gameStore';

function getLetter(n: number) {
  if (n <= 15) return { letter: 'B', color: 'bg-blue-600' };
  if (n <= 30) return { letter: 'I', color: 'bg-green-600' };
  if (n <= 45) return { letter: 'N', color: 'bg-orange-500' };
  if (n <= 60) return { letter: 'G', color: 'bg-purple-600' };
  return { letter: 'O', color: 'bg-red-600' };
}

export default function CalledNumbers() {
  const { calledNumbers, latestNumber } = useGameStore();

  return (
    <div className="w-full">
      {latestNumber && (
        <div className="text-center mb-3">
          <div className="text-xs text-gray-400 mb-1">Latest Called</div>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getLetter(latestNumber).color} text-white font-black text-2xl pop-in pulse-ring`}>
            {getLetter(latestNumber).letter}{latestNumber}
          </div>
        </div>
      )}
      <div className="text-xs text-gray-400 mb-2 text-center">
        Called: {calledNumbers.length}/75
      </div>
      {calledNumbers.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center max-h-24 overflow-y-auto">
          {[...calledNumbers].reverse().map((n, i) => {
            const { letter, color } = getLetter(n);
            return (
              <span key={n} className={`${color} text-white text-xs font-bold px-1.5 py-0.5 rounded`}>
                {letter}{n}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
