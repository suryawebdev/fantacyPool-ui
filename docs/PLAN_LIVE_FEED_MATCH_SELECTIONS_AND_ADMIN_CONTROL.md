# Plan: Match Selections (Post-Cutoff) + Admin Control for Live Feed

## Current State

- **Live Feed page** (`/selections-feed`): Shows a stream of “user X picked team Y for match Z” in real time (WebSocket `/topic/selections`) plus paginated history (REST `GET /api/predictions/selections`). No filter by match or tournament; no concept of “after cutoff.”
- **WebSocket**: Connects at app load when `enableWebSockets` is true; subscribes to `/topic/matches` and `/topic/selections`. No admin control; no tournament scoping.

---

## Feature 1: “Match Selections” Section (After Cutoff)

### Goal

Once a match’s **cutoff time has passed** (e.g. match start time), show **all user selections for that specific match** in a dedicated section: who picked which team, and optionally who was correct after the winner is set.

### Behaviour

- **When to show:** Only for matches where “now” ≥ match start (or explicit cutoff). Before cutoff, do not show per-match breakdown (keeps picks hidden until lock).
- **What to show (per match):**
  - Match label: e.g. “RCB vs SRH (started 24 Feb 3:30 PM)”
  - List: “User A → RCB”, “User B → SRH”, “User C → RCB”, …
  - Optional: “✓ Correct” / “✗ Wrong” once winner is set.
- **Where:** New section on the **same Live Feed page** (e.g. above or below the existing “User Selections” stream), or a separate sub-view/tab on that page.

### Data / API

- **Option A – Backend:** New endpoint, e.g.  
  `GET /api/predictions/selections/by-match?matchId=:id`  
  or  
  `GET /api/matches/:id/selections`  
  Returns list of `{ userId, username, firstName, lastName, team, correct? }` for that match. Backend only returns data for matches that are past cutoff (or frontend filters by `match.startDateTime <= now`).
- **Option B – Frontend only:** Use existing `GET /api/predictions/selections` with a larger limit and group by `matchId`; filter to matches past start. Works only if the current API returns `matchId` (and ideally match start/cutoff) and supports enough data.
- **Recommended:** Option A for clarity and performance; frontend calls it for “recent/started matches” (list of match IDs from `GET /api/tournaments/:id/matches` or similar, filtered by `startDateTime <= now`).

### UI Flow (suggested)

1. **Source of matches:** Either “all started matches” or “started matches for selected tournament” (reuse tournament selector if we add it to Live Feed).
2. **Section title:** e.g. “Selections by match (after cutoff)”.
3. **Per match:** Accordion or card: match name + time → expand to see list of picks (and optional correct/wrong).
4. **Empty state:** “No matches past cutoff yet” or “Select a tournament to see match breakdowns.”

---

## Feature 2: Admin Control – Start/Stop Live Feed (with Tournament)

### Goal

- Admin can **stop** the current live feed (no new real-time selection events shown).
- Admin can **turn it on** again and optionally **choose a tournament** so the feed is scoped to that tournament (only selections for matches in that tournament are shown / pushed).

### Behaviour

- **Stop:** While “stopped,” the Live Feed page does not show new items from WebSocket. Do **not** show any banner when the feed is turned off (per product decision).
- **Start:** When (re)enabled, admin selects a **tournament**; from then on, only selections for matches belonging to that tournament are considered (REST + WebSocket).
- **Persistence:** Feed “on/off” and “current tournament” can be server-side (so all users see the same state) or client-side (admin-only toggle in UI; other users unaffected). Usually you want **server-side** so all users see “feed on for Tournament X” or “feed paused.”

### Backend Implications

- **REST – selections:**  
  Current: `GET /api/predictions/selections?limit=&page=`.  
  Need: Optional `tournamentId=` so results are filtered to matches in that tournament. If feed is “off,” backend could return 403 or empty for that endpoint when called for live feed purpose (or we only hide in UI).
- **WebSocket – scoping:**  
  Option 1: Backend has a “live feed config”: `{ enabled: boolean, tournamentId?: number }`. When a selection is saved, backend only pushes to `/topic/selections` if feed is enabled and (if tournamentId set) the match is in that tournament.  
  Option 2: Single global topic; frontend filters by tournament. Easier but more traffic.  
  Option 3: Dynamic topic per tournament, e.g. `/topic/selections/tournament/:id`; admin “start for tournament X” makes clients subscribe to that topic. Backend publishes there only when feed is on for that tournament.
- **Admin API:**  
  - `GET /api/admin/live-feed/config` → `{ enabled: boolean, tournamentId?: number }`.  
  - `PUT /api/admin/live-feed/config` → body `{ enabled: boolean, tournamentId?: number }` (admin only).  
  So “stop” = `PUT { enabled: false }`; “start for tournament 5” = `PUT { enabled: true, tournamentId: 5 }`.

### UI (Admin)

- **Where:** Admin dashboard (e.g. new “Live Feed” tab or a card on an existing tab) or a control at the top of the Live Feed page (visible only to admin).
- **Controls:**  
  - Toggle: “Live feed: On / Off.”  
  - When turning On: dropdown “Tournament: [Select tournament]” (list from `GET /api/tournaments` or admin’s tournaments).  
  - Optional: Show current status to admin: “Feed is ON for tournament: IPL 2025.”
- **Non-admin users:** When feed is on, optionally show which tournament the feed is for (e.g. “Live feed for: IPL 2025”). When feed is off, show no banner or status.

---

## Suggested Implementation Order

1. **Backend**
   - Add `GET /api/matches/:id/selections` (or `/api/predictions/selections/by-match?matchId=`) for post-cutoff match breakdown; ensure it’s only allowed for matches past start/cutoff.
   - Add admin config for live feed: `GET/PUT /api/admin/live-feed/config` with `{ enabled, tournamentId? }`.
   - Optional: Filter `GET /api/predictions/selections` by `tournamentId` when provided.
   - WebSocket: When publishing to `/topic/selections`, respect feed config (only if enabled; if tournamentId set, only for matches in that tournament). Optionally add `/topic/selections/tournament/:id` and have clients subscribe based on config.
2. **Frontend – Match selections section**
   - On Live Feed page, add section “Selections by match (after cutoff).”
   - Load list of matches (e.g. from a tournament or “recent matches”) and filter to `startDateTime <= now`.
   - For each such match, call the new “selections by match” API and show breakdown (user → team, optional correct/wrong).
   - Optional: Tournament selector on Live Feed to scope “started matches” to that tournament.
3. **Frontend – Admin control**
   - Admin UI: toggle “Live feed On/Off” and tournament dropdown when turning on; call `PUT /api/admin/live-feed/config`.
   - All users: On Live Feed page, call `GET /api/admin/live-feed/config` (or a public `GET /api/live-feed/config`) to filter/subscribe (e.g. only show selections for the configured tournament; if disabled, do not show new WebSocket updates and do not show any “paused” banner).
4. **Frontend – WebSocket**
   - If backend supports tournament-specific topic, subscribe when config has tournamentId; otherwise subscribe to global topic and filter by tournament in the client when config is set.

---

## Design Feedback and Considerations

### 1. **Spoilers**

- Showing “who picked what” **after** cutoff is good; it avoids spoilers before the match.  
- Showing “correct/wrong” **before** the winner is set would be wrong; only show it once winner is set (backend or frontend can hide `correct` until then).

### 2. **Privacy / psychology**

- Some users may not want their pick visible to others even after cutoff. If you need that, add a “visibility” setting (e.g. “Show my picks in live feed: Yes/No”) and have the backend exclude those users from public selection lists. Not in initial scope but worth a product decision.

### 3. **Tournament scoping**

- Making “live feed on for tournament X” improves relevance and reduces noise. Consider showing the current tournament name on the Live Feed page for all users so it’s clear which tournament’s picks are shown.

### 4. **Performance**

- “Selections by match” could be heavy if you have many matches and many users. Backend should paginate or limit (e.g. last N started matches). Frontend can lazy-load or expand-on-demand per match (accordion) to avoid loading all at once.

### 5. **Cutoff vs match start**

- Today you have `startDateTime`. If in the future you add a separate “cutoff” (e.g. 15 minutes before start), use that for “when to show match selections” and keep using `startDateTime` only for “match started” if needed.

### 6. **Off state**

- When feed is “stopped”: only **new** real-time updates are hidden; existing list stays. Do **not** show any banner when the feed is turned off (per product decision).

### 7. **Permissions**

- “Selections by match” after cutoff: any authenticated user (or even public) is a reasonable default. Admin-only if you want to restrict.  
- Start/stop and tournament choice: admin-only; use existing admin guard and backend checks.

### 8. **Consistency with “selected tournament”**

- You already remember “selected tournament” for Dashboard/Leaderboard. You could reuse the same concept on Live Feed for “which tournament’s match breakdowns to show” and for “which tournament’s stream we’re following” when admin turns feed on for a tournament. That keeps the mental model consistent.

---

## Summary Table

| Item | Description |
|------|-------------|
| **New section** | “Selections by match” – only for matches past cutoff; one block per match with list of user → team (and optional correct/wrong). |
| **Data** | New endpoint: e.g. `GET /api/matches/:id/selections` or `GET /api/predictions/selections/by-match?matchId=`. |
| **Admin control** | Toggle Live Feed On/Off; when On, select tournament. Backend: `GET/PUT /api/admin/live-feed/config` with `{ enabled, tournamentId? }`. |
| **WebSocket** | Backend only pushes when feed enabled; optionally scope by tournament (topic or filter). Frontend shows “Paused” when disabled and optionally filters by tournament when enabled. |
| **Where** | Match selections section on existing Live Feed page; admin control in Admin dashboard or on Live Feed (admin-only). |

If you want to proceed, next step is to implement in this order: backend contract (APIs + WebSocket behaviour), then frontend match-selections section, then admin config UI and feed on/off + tournament handling.
