/**
 * Parse admin bulk JSON for match creation.
 * Supports:
 * - Array of rows, or `{ matches: [...] }` with optional `year`, `tournamentId` at root.
 * - Explicit: `{ teamA, teamB, startDateTime }` — `yyyy-MM-ddTHH:mm` (same as admin datetime-local), US display `MM/dd/yyyy, h:mm AM/PM`, or ISO with `Z`/offset (passed through).
 * - Schedule style: `{ Teams: "RCB VS SRH", "Date&Time": "March 28th Saturday 9:00AM CST", Venue?: "..." }`
 *   (Venue is ignored by the API; team names are uppercased.)
 * **Bulk import:** `startDateTime` sent to the API is **45 minutes before** the schedule time in the JSON
 * (pick lock = stored `startDateTime`; the JSON time is the nominal match start / schedule).
 */

const BULK_SCHEDULE_OFFSET_MINUTES = 45;

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
};

export interface ParsedBulkRow {
  index: number;
  raw: unknown;
  /** Optional id from import JSON (`MatchNumber`, `matchId`, `id`, etc.) for preview / correlation; not sent on create. */
  jsonMatchId?: string;
  teamA?: string;
  teamB?: string;
  startDateTime?: string;
  error?: string;
}

function lowerKeyMap(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    out[k.toLowerCase()] = obj[k];
  }
  return out;
}

function getProp(obj: Record<string, unknown>, ...names: string[]): unknown {
  const m = lowerKeyMap(obj);
  for (const n of names) {
    const v = m[n.toLowerCase()];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

/** External / fixture id from bulk row JSON (preview only). */
function optionalJsonMatchId(obj: Record<string, unknown>): string | undefined {
  const v = getProp(
    obj,
    'matchId',
    'match_id',
    'MatchId',
    'matchID',
    'MatchNumber',
    'matchNumber',
    'match_number',
    'fixtureId',
    'fixture_id',
    'FixtureId',
    'id',
    'Id',
    'ID'
  );
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && !Number.isFinite(v)) return undefined;
  return String(v);
}

/** Split "RCB VS SRH" or "RCB vs KKR" into two team strings. */
export function splitTeamsString(teams: string): { teamA: string; teamB: string } | null {
  const t = teams.trim();
  const parts = t.split(/\s+VS\s+/i);
  if (parts.length !== 2) return null;
  const a = parts[0].trim();
  const b = parts[1].trim();
  if (!a || !b) return null;
  return { teamA: a.toUpperCase(), teamB: b.toUpperCase() };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Stored match `startDateTime` = schedule time from JSON minus 45 minutes (same string style when possible). */
function storedStartFromScheduleKickoff(scheduleKickoff: string): string | undefined {
  const trimmed = scheduleKickoff.trim();
  const lm = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/i
  );
  if (lm) {
    const y = parseInt(lm[1], 10);
    const mo = parseInt(lm[2], 10) - 1;
    const d = parseInt(lm[3], 10);
    const hh = parseInt(lm[4], 10);
    const min = parseInt(lm[5], 10);
    const sec = lm[6] != null ? parseInt(lm[6], 10) : 0;
    const kickoff = new Date(y, mo, d, hh, min, sec);
    if (isNaN(kickoff.getTime())) return undefined;
    kickoff.setMinutes(kickoff.getMinutes() - BULK_SCHEDULE_OFFSET_MINUTES);
    return `${kickoff.getFullYear()}-${pad2(kickoff.getMonth() + 1)}-${pad2(kickoff.getDate())}T${pad2(kickoff.getHours())}:${pad2(kickoff.getMinutes())}`;
  }
  const inst = new Date(trimmed);
  if (isNaN(inst.getTime())) return undefined;
  return new Date(
    inst.getTime() - BULK_SCHEDULE_OFFSET_MINUTES * 60 * 1000
  ).toISOString();
}

/**
 * Same wire format as admin <input type="datetime-local">: `yyyy-MM-ddTHH:mm` (no timezone suffix).
 */
function toDatetimeLocal(
  y: number,
  monthIdx: number,
  day: number,
  hour: number,
  minute: number
): string {
  return `${y}-${pad2(monthIdx + 1)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}`;
}

/**
 * Match management table style: `03/26/2026, 12:22 PM`.
 */
export function formatDatetimeLocalForDisplay(dtLocal: string): string {
  const m = dtLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return dtLocal;
  const y = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  let h = parseInt(m[4], 10);
  const min = parseInt(m[5], 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${pad2(month)}/${pad2(day)}/${y}, ${h12}:${pad2(min)} ${ampm}`;
}

/** Parse `03/26/2026, 12:22 PM` into datetime-local string. */
function parseUsCalendarDisplay(trimmed: string): string | null {
  const re = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i;
  const m = trimmed.match(re);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  let hour = parseInt(m[4], 10);
  const minute = parseInt(m[5], 10);
  const ap = m[6].toUpperCase();
  if (month < 1 || month > 12 || day < 1 || day > 31 || minute > 59 || hour < 1 || hour > 12) {
    return null;
  }
  if (ap === 'PM' && hour !== 12) hour += 12;
  if (ap === 'AM' && hour === 12) hour = 0;
  return toDatetimeLocal(y, month - 1, day, hour, minute);
}

/** @deprecated alias */
export function parseFriendlyDateTimeToIso(dateStr: string, year: number): string | null {
  return parseFriendlyDateTimeToCstOffset(dateStr, year);
}

/**
 * Produces `yyyy-MM-ddTHH:mm` for the API (same as admin datetime-local). Strings that already
 * include `Z` or a numeric offset are returned unchanged.
 */
export function parseFriendlyDateTimeToCstOffset(dateStr: string, year: number): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();

  const us = parseUsCalendarDisplay(trimmed);
  if (us) return us;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    if (/Z\s*$/i.test(trimmed) || /[+-]\d{2}:?\d{2}\s*$/.test(trimmed)) {
      return trimmed;
    }
    const dm = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (dm) {
      const y = parseInt(dm[1], 10);
      const mo = parseInt(dm[2], 10) - 1;
      const d = parseInt(dm[3], 10);
      const hh = dm[4] != null ? parseInt(dm[4], 10) : 0;
      const mm = dm[5] != null ? parseInt(dm[5], 10) : 0;
      const invalid =
        mo < 0 ||
        mo > 11 ||
        d < 1 ||
        d > 31 ||
        hh < 0 ||
        hh > 23 ||
        mm < 0 ||
        mm > 59;
      if (invalid) return null;
      return toDatetimeLocal(y, mo, d, hh, mm);
    }
  }

  const re =
    /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+\w+day)?\s+(\d{1,2}):(\d{2})\s*(AM|PM)(?:\s*(CST|CDT|CT))?/i;
  const m = trimmed.match(re);
  if (!m) return null;

  const monthName = m[1].toLowerCase();
  const day = parseInt(m[2], 10);
  let hour = parseInt(m[3], 10);
  const minute = parseInt(m[4], 10);
  const ampm = m[5].toUpperCase();

  const monthIdx = MONTHS[monthName];
  if (monthIdx === undefined || day < 1 || day > 31) return null;

  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  return toDatetimeLocal(year, monthIdx, day, hour, minute);
}

export interface ParseBulkJsonOptions {
  defaultYear: number;
}

export interface ParseBulkJsonResult {
  rows: ParsedBulkRow[];
  rootTournamentId?: number;
  rootYear?: number;
}

/**
 * Parse uploaded JSON into rows with optional per-row errors.
 */
export function parseBulkMatchJson(raw: unknown, options: ParseBulkJsonOptions): ParseBulkJsonResult {
  let list: unknown[] = [];
  let rootTournamentId: number | undefined;
  let rootYear: number | undefined;

  if (raw == null) {
    return { rows: [{ index: 0, raw: null, error: 'Empty JSON' }] };
  }

  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const m = getProp(o, 'matches', 'schedule', 'data');
    if (Array.isArray(m)) list = m;
    else return { rows: [{ index: 0, raw, error: 'JSON must be an array or an object with a "matches" array' }] };

    const tid = getProp(o, 'tournamentId', 'tournament_id');
    if (tid != null && tid !== '') {
      const n = Number(tid);
      if (!Number.isNaN(n)) rootTournamentId = n;
    }
    const y = getProp(o, 'year', 'seasonYear');
    if (y != null && y !== '') {
      const n = Number(y);
      if (!Number.isNaN(n)) rootYear = n;
    }
  } else {
    return { rows: [{ index: 0, raw, error: 'JSON must be an array or an object' }] };
  }

  const year = rootYear ?? options.defaultYear;
  const rows: ParsedBulkRow[] = [];

  list.forEach((item, index) => {
    if (item == null || typeof item !== 'object') {
      rows.push({ index, raw: item, error: 'Row must be an object' });
      return;
    }
    const obj = item as Record<string, unknown>;
    const jsonMatchId = optionalJsonMatchId(obj);

    let teamA: string | undefined;
    let teamB: string | undefined;
    let startDateTime: string | undefined;

    const explicitA = getProp(obj, 'teamA', 'team_a', 'TeamA');
    const explicitB = getProp(obj, 'teamB', 'team_b', 'TeamB');
    const explicitDt = getProp(obj, 'startDateTime', 'start_date_time', 'StartDateTime', 'datetime', 'dateTime');

    if (explicitA != null && explicitB != null && explicitDt != null) {
      teamA = String(explicitA).toUpperCase().trim();
      teamB = String(explicitB).toUpperCase().trim();
      const ds = String(explicitDt).trim();
      const scheduleKickoff = parseFriendlyDateTimeToCstOffset(ds, year) ?? undefined;
      if (!scheduleKickoff) {
        rows.push({ index, raw: item, jsonMatchId, teamA, teamB, error: 'Could not parse startDateTime' });
        return;
      }
      startDateTime = storedStartFromScheduleKickoff(scheduleKickoff);
      if (!startDateTime) {
        rows.push({
          index,
          raw: item,
          jsonMatchId,
          teamA,
          teamB,
          error: 'Could not apply 45-minute schedule offset'
        });
        return;
      }
      rows.push({ index, raw: item, jsonMatchId, teamA, teamB, startDateTime });
      return;
    }

    const teamsStr = getProp(obj, 'Teams', 'teams', 'match', 'Match');
    if (teamsStr != null) {
      const sp = splitTeamsString(String(teamsStr));
      if (!sp) {
        rows.push({
          index,
          raw: item,
          jsonMatchId,
          error: 'Teams must look like "RCB VS SRH" (VS separator)'
        });
        return;
      }
      teamA = sp.teamA;
      teamB = sp.teamB;
    }

    let scheduleKickoff: string | undefined;
    const dtRaw = getProp(obj, 'Date&Time', 'DateTime', 'datetime', 'date_time', 'time');
    if (dtRaw != null) {
      scheduleKickoff = parseFriendlyDateTimeToCstOffset(String(dtRaw), year) ?? undefined;
    }

    if (!teamA || !teamB) {
      rows.push({
        index,
        raw: item,
        jsonMatchId,
        error: 'Need teamA+teamB+startDateTime, or Teams + Date&Time'
      });
      return;
    }
    if (!scheduleKickoff) {
      rows.push({ index, raw: item, jsonMatchId, teamA, teamB, error: 'Could not parse Date&Time' });
      return;
    }
    startDateTime = storedStartFromScheduleKickoff(scheduleKickoff);
    if (!startDateTime) {
      rows.push({
        index,
        raw: item,
        jsonMatchId,
        teamA,
        teamB,
        error: 'Could not apply 45-minute schedule offset'
      });
      return;
    }

    rows.push({ index, raw: item, jsonMatchId, teamA, teamB, startDateTime });
  });

  return { rows, rootTournamentId, rootYear };
}
