export interface RankedLeaderboardEntry {
  displayPoints: number;
  displayRank: number;
  rowNumber: number;
  [k: string]: any;
}

/** Normalize points from various backend field names. */
export function normalizeLeaderboardEntry(entry: any): any {
  const points = entry?.totalPoints ?? entry?.points ?? entry?.score ?? entry?.totalScore ?? 0;
  return { ...entry, displayPoints: Number(points) };
}

/**
 * Sort by points descending, assign dense rank (ties share the same rank),
 * and row numbers (#) 1..n in display order.
 *
 * Example points: [10, 10, 8, 7, 7] => ranks [1, 1, 2, 3, 3]
 */
export function computeLeaderboardWithRanks(raw: any[]): RankedLeaderboardEntry[] {
  const withPoints = (raw ?? []).map((u: any) => normalizeLeaderboardEntry(u));
  const sorted = [...withPoints].sort((a, b) => b.displayPoints - a.displayPoints);

  let currentRank = 1;
  let previousPoints: number | null = null;

  return sorted.map((entry, index) => {
    const rowNumber = index + 1;
    if (previousPoints !== null && entry.displayPoints < previousPoints) {
      currentRank += 1; // dense ranking: 1,1,2,...
    }
    previousPoints = entry.displayPoints;
    return { ...entry, displayRank: currentRank, rowNumber };
  });
}

