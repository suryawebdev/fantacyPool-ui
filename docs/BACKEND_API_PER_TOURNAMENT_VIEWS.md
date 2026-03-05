# Backend API: Per-Tournament Dashboard & Leaderboard

The user dashboard and leaderboard use a **tournament selector**. The frontend loads only data for tournaments the user is **enrolled in** and for the **selected tournament**. These endpoints are required.

---

## 1. List tournaments the current user is enrolled in

**Request**

- **Method:** `GET /api/tournaments/enrolled`
- **Auth:** Authenticated user (JWT).

**Response**

- **200:** Array of tournaments the current user is a participant in. Same shape as other tournament list endpoints (e.g. `id`, `name`, `description`, `status`, `startDate`, `endDate`, …).

**Purpose**

- Populate the tournament dropdown on **User dashboard** and **Leaderboard**. If the list is empty, the UI shows “You are not in any tournament.”

---

## 2. Per-tournament leaderboard (must return tournament-scoped points)

**Request**

- **Method:** `GET /api/tournaments/:id/leaderboard`
- **Auth:** Authenticated user (or public).
- **Example:** `GET /api/tournaments/5/leaderboard`

**Response (200)**

- Array of leaderboard entries **for that tournament only**. Each entry must include:
  - **Points:** Sum of points from **predictions on matches that belong to this tournament only**. Use one of these field names (frontend checks in this order): `totalPoints`, `points`, `score`, `totalScore`.
  - **Rank:** `rank` or `position` (1-based).
  - **User:** `username`, `firstName`, `lastName` (optional but shown in UI).
  - Optional: `enabled` (if `false`, frontend hides the row).

**Example response**

```json
[
  { "rank": 1, "username": "alice", "firstName": "Alice", "lastName": "Smith", "totalPoints": 45 },
  { "rank": 2, "username": "bob", "firstName": "Bob", "lastName": "Jones", "totalPoints": 38 }
]
```

**Why you might see 0 points**

- If every row has 0 points, the backend is likely **not** limiting the points calculation to matches for this tournament. You must:
  1. Take only **matches that belong to this tournament** (e.g. `match.tournamentId === :id`).
  2. Take only **predictions for those matches**.
  3. Sum points (e.g. correct prediction = 1 or N points) **per user** for that set only.
- Do **not** return global/user lifetime points; return only points earned in **this tournament’s matches**.

---

## 3. Per-tournament matches (existing)

- **Method:** `GET /api/tournaments/:id/matches`
- **Auth:** Authenticated user.
- **Response:** Matches for that tournament only.

Already used via `MatchService.getMatchesByTournament(tournamentId)`.

---

## 4. User history filtered by tournament

**Request**

- **Method:** `GET /api/predictions/me/history`
- **Query (optional):** `?tournamentId=:id`
- **Auth:** Authenticated user.

**Response**

- **200:** `{ "totalPoints": number, "matches": array }`
  - When `tournamentId` is present: only predictions for matches in that tournament; `totalPoints` is the sum for that tournament only.
  - When omitted: current global behaviour (all history).

**Purpose**

- Dashboard “Your Match History” and “Your Current Points” are scoped to the selected tournament when the frontend calls `getUserHistory(tournamentId)`.

---

## Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **GET** | **`/api/tournaments/enrolled`** | **List tournaments the user is in (for selector).** |
| GET | `/api/tournaments/:id/leaderboard` | Per-tournament leaderboard. |
| GET | `/api/tournaments/:id/matches` | Per-tournament upcoming matches. |
| GET | `/api/predictions/me/history?tournamentId=:id` | User history (and points) for one tournament. |

Points and leaderboard must be computed **per tournament** (only matches belonging to that tournament count).
