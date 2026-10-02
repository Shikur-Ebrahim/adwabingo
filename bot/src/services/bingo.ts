export function generateBingoCard(): number[][] {
  const card: number[][] = [];
  const ranges: [number, number][] = [
    [1, 15], [16, 30], [31, 45], [46, 60], [61, 75]
  ];
  for (let col = 0; col < 5; col++) {
    const [min, max] = ranges[col];
    const column = getUniqueNumbers(min, max, 5);
    for (let row = 0; row < 5; row++) {
      if (!card[row]) card[row] = [];
      card[row][col] = column[row];
    }
  }
  card[2][2] = 0; // Free space
  return card;
}

function getUniqueNumbers(min: number, max: number, count: number): number[] {
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return Array.from(nums);
}

export function initMarkedCells(): boolean[][] {
  const marked: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
  marked[2][2] = true;
  return marked;
}

export function checkBingo(card: number[][], marked: boolean[][], calledNumbers: number[]): boolean {
  const newMarked = card.map((row, r) =>
    row.map((cell, c) => cell === 0 || calledNumbers.includes(cell) ? true : marked[r][c])
  );
  for (let r = 0; r < 5; r++) { if (newMarked[r].every(Boolean)) return true; }
  for (let c = 0; c < 5; c++) { if (newMarked.every(row => row[c])) return true; }
  if ([0,1,2,3,4].every(i => newMarked[i][i])) return true;
  if ([0,1,2,3,4].every(i => newMarked[i][4-i])) return true;
  return false;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function getNumberLetter(n: number): string {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
}
