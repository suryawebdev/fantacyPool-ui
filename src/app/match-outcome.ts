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
