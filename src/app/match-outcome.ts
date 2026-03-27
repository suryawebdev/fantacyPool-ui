/** Whether the match was closed as no result (washout / abandoned). */
export function isNoResultMatch(match: { noResult?: boolean; winner?: string | null }): boolean {
  if (match?.noResult === true) return true;
  const w = match?.winner;
  if (w == null || typeof w !== 'string') return false;
  const t = w.trim().toUpperCase().replace(/\s+/g, '_');
  return t === 'NR' || t === 'NO_RESULT';
}

/** True if admin has set a winner or marked no result (outcome is final). */
export function matchHasDeclaredOutcome(match: { noResult?: boolean; winner?: string | null }): boolean {
  if (match?.noResult === true) return true;
  const w = match?.winner;
  return w != null && String(w).trim() !== '';
}

/** True when the user's pick matches the declared winner (team names or legacy A/B). */
export function userPickMatchesWinner(match: {
  userPick?: string | null;
  winner?: string | null;
  teamA?: string;
  teamB?: string;
}): boolean {
  if (!match?.userPick || match.winner == null || String(match.winner).trim() === '') return false;
  if (isNoResultMatch(match)) return false;
  const pick = String(match.userPick).trim();
  const w = String(match.winner).trim();
  if (pick === w) return true;
  const wn = w.toUpperCase();
  const pn = pick.toUpperCase();
  const ta = (match.teamA ?? '').trim().toUpperCase();
  const tb = (match.teamB ?? '').trim().toUpperCase();
  if (w === 'A' || wn === 'A') return pick === 'A' || pn === ta;
  if (w === 'B' || wn === 'B') return pick === 'B' || pn === tb;
  if (pick === 'A' || pick === 'a') return wn === ta || w === 'A';
  if (pick === 'B' || pick === 'b') return wn === tb || w === 'B';
  return pn === wn;
}
