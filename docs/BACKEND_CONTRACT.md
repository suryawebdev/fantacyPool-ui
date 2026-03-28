# Backend API contract (what the frontend needs)

Base URL: `environment.apiUrl` (e.g. `http://localhost:8080`). All paths below are relative to that. Auth: JWT where required (see existing auth interceptor).

**Match `startDateTime` (pick lock):** The UI treats values **without** a timezone suffix (`Z` or `±hh:mm`) as **America/Chicago** (CST/CDT) wall-clock times so pick locking is consistent worldwide. Prefer returning full **ISO-8601 with offset or `Z`** from the API if the instant is stored in UTC.

---

## Required for core app

| Method | Path | Used by | Response / body |
|--------|------|---------|------------------|
| POST | `/api/auth/signin` | Sign in | `{ accessToken?, user? }` |
| POST | `/api/auth/signup` | Sign up | User / token |
| POST | `/api/auth/forgot-password` | Forgot password | — |
| POST | `/api/auth/reset-password` | Reset password | — |
| GET | `/api/users/:username` | Profile | User |
| GET | `/api/tournaments` | Admin | `Tournament[]` |
| GET | `/api/tournaments/enrolled` | Dashboard, Leaderboard, Analytics | `Tournament[]` |
| GET | `/api/tournaments/:id` | Tournament detail | Tournament |
| GET | `/api/tournaments/:id/matches` | Dashboard (upcoming matches) | `Match[]` |
| GET | `/api/tournaments/:id/leaderboard` | Leaderboard | `Array<{ username, firstName?, lastName?, totalPoints|points|score|totalScore, rank|position?, enabled? }>` |
| GET | `/api/tournaments/:id/participants` | Admin (participants) | User[] (or similar) |
| PUT | `/api/tournaments/:id/participants` | Admin | Body: `{ userIds: number[] }` |
| GET | `/api/predictions/me/history?tournamentId=` | Dashboard history, Analytics (my) | `{ totalPoints: number, matches: Array<{ id, teamA, teamB, startDateTime, userPick, winner?, pointsEarned? }> }` |
| GET | `/api/predictions/mine` | Dashboard (picks) | `Array<{ matchId, team: string }>` |
| POST | `/api/predictions` | Dashboard (save pick) | Body: `{ matchId, team }` |
| PUT | `/api/matches/:id/winner` | Admin | Body: `{ winner: string }` **or** `{ noResult: true }` for **No result (NR)** |

**No result (NR)** — When the body is `{ "noResult": true }` (and no `winner`), the backend should:

- Mark the match as finalized with no winning team (e.g. `noResult: true` on the match and/or `winner: "NR"` in API responses).
- Award **1 point** to every user who had **any** prediction for that match, and **0** to users with no pick.
- Include `pointsEarned` (0 or 1) and `winner` / `noResult` in prediction history responses so the dashboard can show NR correctly.

---

## Required for Leaderboard “user history” expand

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/predictions/users/:username/history?tournamentId=` | Same shape as `/api/predictions/me/history` (totalPoints + matches) for that user. |

---

## Required for Analytics “Pool analytics” tab

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/tournaments/:tournamentId/pool-analytics` | matchStats (required for per-match cards). Optional: totalPoints, correctCount, wrongCount, picksByTeam, pointsOverTime for same layout as My analytics. |

If this is not implemented, the UI shows “Pool analytics will appear here when the backend supports it.”

---

## Optional (frontend works without them)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/predictions/me/analytics?tournamentId=` | Pre-aggregated “my” analytics; frontend currently uses `/me/history` and computes itself. |

---

## Other endpoints the app may call

- **Admin:** POST/GET/PUT/DELETE tournaments, create/update matches, live-feed config.
- **Selections feed:** `GET /api/predictions/selections?limit=&page=&tournamentId=`, `GET /api/matches/:id/selections`.
- **Tournament management:** join/leave, my-tournaments, active, etc.

For full request/response details see:
- `docs/BACKEND_API_ANALYTICS.md` (analytics)
- `docs/BACKEND_API_TOURNAMENT_PARTICIPANTS.md`
- `docs/BACKEND_API_PER_TOURNAMENT_VIEWS.md`
- `docs/BACKEND_API_PREDICTIONS_AND_WINNER.md`
