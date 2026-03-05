# Architecture Plan: Tournament-Scoped Features & Admin-Managed Participants

## Goals

1. **Admin can add desired users to a tournament** – Only users added (by admin) to a tournament can participate in that tournament’s matches, leaderboard, and history.
2. **Per-tournament views** – Leaderboard, upcoming matches, and match history are scoped per tournament (separate table/section per tournament or one view at a time per tournament).

---

## Current State (Brief)

| Area | Current behavior |
|------|------------------|
| **Leaderboard** | Single global list (`/api/predictions/users/leaderboard`). No tournament filter. |
| **Upcoming matches** | `getAllMatches()` or `getMyTournamentMatches()` – one flat list. No per-tournament grouping in UI. |
| **Match history** | `getUserHistory()` – one flat list. No tournament filter or grouping. |
| **Tournaments** | Admin creates/edits/deletes. `getTournamentParticipants(tournamentId)` exists. No “add user” flow. |
| **Join** | User can `joinTournament(tournamentId)`. No admin-only “add user” concept. |

---

## Data Model Assumptions (for Backend)

- **Tournament participation:** Many-to-many between **users** and **tournaments** (e.g. `tournament_participants` or `enrollments`).
- **Access rule:** A user can only:
  - See and pick matches that belong to a tournament they are **enrolled in**.
  - Appear on a tournament’s leaderboard only for **that tournament**.
  - Have match history and points **scoped per tournament**.
- **Who can add participants:** Admin (or tournament owner) can add users to a tournament. Optionally keep “self-join” for open tournaments, or make it invite-only (admin-add only).

---

## Part 1: Admin – Add Users to Tournament

### Backend API (to implement)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/tournaments/:id/participants` | List participants (already in TournamentService). |
| `POST` | `/api/tournaments/:id/participants` | Add user(s). Body e.g. `{ "username": "jane" }` or `{ "userId": 5 }`. Validate user exists and is approved; idempotent if already participant. |
| `DELETE` | `/api/tournaments/:id/participants/:userId` | Remove a participant. |
| Optional | `GET /api/users?search=...` or `GET /api/admin/users` | Search/list users for “Add user” (admin only). |

All require admin (or tournament-owner) auth.

### Frontend (admin UI)

- **Where:** Tournament Management tab – per tournament card, add **“Manage participants”** (or “Participants”).
- **Flow:** Open a panel/modal for that tournament → list current participants → **“Add user”** (search by username or select from list) → call `POST .../participants` → refresh list. Optionally “Remove” per participant via `DELETE`.
- **Display:** Show participant count and maybe first few names on the card; full list in the manage view.

---

## Part 2: Per-Tournament Leaderboard, Matches, History

### Backend API (expected / to clarify)

| Data | Current / needed | Notes |
|------|------------------|--------|
| **Leaderboard** | Global today. Need **per-tournament**. | e.g. `GET /api/tournaments/:id/leaderboard` (TournamentService already has `getTournamentLeaderboard(tournamentId)`). Return only participants of that tournament, points for matches in that tournament only. |
| **Upcoming matches** | `GET /api/matches` or `GET /api/matches/my-tournaments`. | Either: (1) Return `tournamentId` (and tournament name) with each match and frontend groups by tournament, or (2) Add `GET /api/tournaments/:id/matches` (already in MatchService as `getMatchesByTournament`) and frontend calls per tournament. |
| **Match history** | `GET /api/predictions/me/history`. | Add optional `?tournamentId=:id` so history is filtered per tournament. Or return history with `tournamentId` (and name) per match and frontend groups/filters. |

- **Points:** Backend must compute points **per tournament** (only matches belonging to that tournament count toward that tournament’s leaderboard and history).

---

## Part 3: Frontend UX – How to Show Per-Tournament Data

Three approaches. Recommendation: **A** for simplicity and scalability; **B** if you want “see all my tournaments at once” on one page.

---

### Option A: Tournament selector (tabs or dropdown) – single set of tables

**Behavior**

- One **tournament selector** at the top (tabs or dropdown) of Dashboard and of Leaderboard.
- User sees only **tournaments they are enrolled in**.
- Selecting a tournament loads:
  - **Leaderboard:** that tournament’s leaderboard only.
  - **Upcoming matches:** matches for that tournament only.
  - **Match history:** that tournament’s history only.
- One table per section; content switches when tournament changes.

**Pros**

- Single, consistent layout; easy to understand.
- Works with many tournaments (no page length explosion).
- One set of APIs per view: e.g. leaderboard(tournamentId), matches(tournamentId), history(tournamentId).
- Deep link possible: e.g. `?tournament=2` or route with `tournamentId`.

**Cons**

- User must switch tournament to see another; no “all at once” view.

**Screens**

- **User dashboard:** [Tournament: Dropdown/Tabs] then “Upcoming matches” table, “Match history” table (and welcome/points can be global or per-tournament).
- **Leaderboard page:** [Tournament: Dropdown/Tabs] then one leaderboard table.

---

### Option B: One section (card) per tournament – multiple tables on one page

**Behavior**

- Page lists **all tournaments the user is in** (or admin sees all).
- For **each** tournament, show one **card/section** containing:
  - Tournament name + status.
  - That tournament’s **leaderboard** (table).
  - That tournament’s **upcoming matches** (table).
  - That tournament’s **match history** (table).
- Optional: collapse/expand per card to reduce scroll.

**Pros**

- User sees every tournament’s data on one page; good for 2–5 tournaments.
- No “switch context” click; good for comparison.

**Cons**

- Page can get long and heavy with many tournaments or many rows.
- More API calls on load (one set per tournament) unless backend offers a “batch” endpoint.
- Duplicated table UIs (multiple leaderboards, multiple match tables).

---

### Option C: Separate route per tournament (e.g. /tournaments/:id)

**Behavior**

- Dashboard or “My tournaments” lists tournament cards; clicking one goes to e.g. `/tournaments/42` (or `/dashboard/tournament/42`).
- That route shows **only** that tournament: its leaderboard, upcoming matches, history (one table each).

**Pros**

- Clear URL; shareable and bookmarkable per tournament.
- One tournament per screen; simple mental model and simple API usage per page.

**Cons**

- More navigation (back to list, then into another tournament).
- Two “levels” of pages to build and maintain.

---

## Recommendation

- **Admin “add users to tournament”:** Implement as in Part 1 (backend APIs + “Manage participants” in tournament management).
- **Per-tournament data:** Implement Part 2 (backend: per-tournament leaderboard, matches, history; points scoped per tournament).
- **Frontend UX:** Prefer **Option A (tournament selector)** for dashboard and leaderboard:
  - One dropdown or tab strip of “My tournaments” (and for leaderboard, “All tournaments” or “My tournaments” depending on product choice).
  - One leaderboard table, one upcoming-matches table, one history table; all driven by selected `tournamentId`.
- If you later want a “see all at a glance” view, add a **secondary view** (e.g. “All my tournaments”) that uses **Option B** (one card per tournament with embedded tables), or deep link to Option C for power users.

---

## Implementation Order (suggested)

1. **Backend**
   - Tournament participants: `POST/DELETE` for participants; ensure only participants can access tournament-scoped data.
   - Per-tournament leaderboard: `GET /api/tournaments/:id/leaderboard` (or equivalent) with points for that tournament only.
   - Upcoming matches: ensure matches include `tournamentId` (and optionally tournament name); provide `GET /api/tournaments/:id/matches` if not already.
   - Match history: support `?tournamentId=:id` or return `tournamentId` per item and compute points per tournament.
2. **Frontend – admin**
   - “Manage participants” per tournament: list, add user (by username/search), remove.
3. **Frontend – user**
   - Dashboard: load “my tournaments”; add tournament selector; load leaderboard, matches, history for selected tournament.
   - Leaderboard page: tournament selector + single leaderboard table for selected tournament.
   - Optional: welcome/points/rank can be for selected tournament only or global (product decision).

---

## Summary Table

| Feature | Backend | Frontend (recommended) |
|--------|---------|------------------------|
| Admin add users to tournament | `POST/GET/DELETE` participants | “Manage participants” in tournament card |
| Leaderboard per tournament | `GET /tournaments/:id/leaderboard` | Tournament selector + one table |
| Upcoming matches per tournament | Matches with `tournamentId`; `GET /tournaments/:id/matches` | Same selector; one matches table |
| History per tournament | History filtered/grouped by `tournamentId` | Same selector; one history table |

Once you decide between Option A, B, or C (or A + B), the next step is to implement the backend contract and then the chosen UI pattern in the app.
