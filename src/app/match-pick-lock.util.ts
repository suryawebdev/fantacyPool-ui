import { DateTime } from 'luxon';

/**
 * Wall-clock zone for pick lock / stored `startDateTime` when the API sends a **naive**
 * `yyyy-MM-ddTHH:mm` string (no `Z` / offset). Matches bulk import + admin datetime-local intent (CST/CDT).
 * Users anywhere compare “now” (UTC instant) to this instant so everyone shares the same cutoff.
 */
export const PICK_LOCK_TIME_ZONE = 'America/Chicago';

/** True if string has explicit UTC (`Z`) or numeric offset — parse as absolute instant, not Chicago wall. */
function hasExplicitUtcOrOffset(iso: string): boolean {
  const t = iso.trim();
  return /Z$/i.test(t) || /[+-]\d{2}:\d{2}$/.test(t) || /[+-]\d{4}$/.test(t);
}

/**
 * Converts `match.startDateTime` to UTC epoch ms.
 * - Naive `yyyy-MM-ddTHH:mm` → interpreted in {@link PICK_LOCK_TIME_ZONE}
 * - ISO with `Z` or offset → interpreted as that instant
 */
export function matchStartInstantMs(startDateTime: string | undefined | null): number | null {
  if (startDateTime == null) return null;
  const s = String(startDateTime).trim();
  if (!s) return null;

  if (hasExplicitUtcOrOffset(s)) {
    const dt = DateTime.fromISO(s, { setZone: true });
    return dt.isValid ? dt.toMillis() : null;
  }

  const dt = DateTime.fromISO(s, { zone: PICK_LOCK_TIME_ZONE });
  if (dt.isValid) return dt.toMillis();

  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : parsed;
}

/** True when pick lock time has passed (same moment for all time zones). */
export function isPickLockPassed(
  startDateTime: string | undefined | null,
  nowMs: number = Date.now()
): boolean {
  const ms = matchStartInstantMs(startDateTime);
  if (ms == null) return false;
  return nowMs >= ms;
}

export function compareMatchStartAsc(a: { startDateTime?: string }, b: { startDateTime?: string }): number {
  return (matchStartInstantMs(a.startDateTime) ?? 0) - (matchStartInstantMs(b.startDateTime) ?? 0);
}

export function compareMatchStartDesc(a: { startDateTime?: string }, b: { startDateTime?: string }): number {
  return (matchStartInstantMs(b.startDateTime) ?? 0) - (matchStartInstantMs(a.startDateTime) ?? 0);
}
