# Backend API: Live Feed Config + Selections by Match

Frontend needs these endpoints for (1) admin control of the live feed and (2) the “Selections by match (after cutoff)” section.

---

## 1. Live feed config (admin control)

### Get config (used by all users on Live Feed page; can be public or admin-only)

**Request**

- **Method:** `GET /api/live-feed/config` (or `GET /api/admin/live-feed/config` with admin auth if you prefer)
- **Auth:** Authenticated user (or public if you want non-logged-in to see feed state).

**Response (200)**

```json
{
  "enabled": true,
  "tournamentId": 5
}
```

- `enabled`: when `false`, backend should not publish new selection events to WebSocket; frontend will not show new real-time items (and will not show any “feed paused” banner).
- `tournamentId`: when feed is enabled, only selections for matches in this tournament are relevant. Omit or null when feed is off or global.

---

### Update config (admin only)

**Request**

- **Method:** `PUT /api/admin/live-feed/config`
- **Auth:** Admin only.
- **Body:**

```json
{
  "enabled": false
}
```

or

```json
{
  "enabled": true,
  "tournamentId": 5
}
```

**Response**

- **200:** Success (body can be empty or the updated config).
- **400:** Validation error (e.g. tournamentId required when enabled).

When `enabled` is false, `tournamentId` can be omitted or cleared. When turning on, frontend sends the chosen tournament id.

---

## 2. Selections by match (after cutoff)

Used for the “Selections by match” section: once a match has started (cutoff passed), return all user picks for that match.

**Request**

- **Method:** `GET /api/matches/:id/selections` (or `GET /api/predictions/selections/by-match?matchId=:id`)
- **Auth:** Authenticated user (or public if you want).

**Response (200)**

Array of selection rows for that match. Each item should include at least:

- `userId` or `username`
- `firstName`, `lastName` (optional)
- `team` (team name or "A"/"B")
- `correct` (optional boolean) – true if pick matches match winner; omit or null until winner is set.

**Example**

```json
[
  { "userId": 1, "username": "alice", "firstName": "Alice", "lastName": "Smith", "team": "RCB", "correct": true },
  { "userId": 2, "username": "bob", "firstName": "Bob", "lastName": "Jones", "team": "SRH", "correct": false }
]
```

Backend should only return data for matches whose start/cutoff time has passed (or return 403/404 for future matches). Frontend will also filter to started matches only.

---

## 3. Optional: filter main selections list by tournament

Current: `GET /api/predictions/selections?limit=&page=`

Optional: support `tournamentId=` so the list is filtered to selections for matches in that tournament. When live feed is enabled with a tournament, frontend can pass this to show only that tournament’s stream.

---

## 4. WebSocket behaviour

- When a user saves a prediction, backend publishes to `/topic/selections` (or tournament-specific topic) only if live feed config has `enabled: true`. If `tournamentId` is set, only publish when the match belongs to that tournament.
- When `enabled` is false, do not publish new selection events. Frontend will simply not show new items (no “feed off” banner).

---

## Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/live-feed/config` | Get current feed config (enabled, tournamentId). |
| PUT | `/api/admin/live-feed/config` | Admin: set enabled and optional tournamentId. |
| GET | `/api/matches/:id/selections` | Selections for one match (after cutoff). |
| GET | `/api/predictions/selections?tournamentId=` | (Optional) Filter stream by tournament. |
