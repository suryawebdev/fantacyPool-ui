# Backend API: Analytics (Phase 2 & 3)

The frontend Analytics page supports optional backend endpoints for richer data. If these are not implemented, the UI still works using existing APIs and shows fallback messages where needed.

---

## Phase 2: My analytics (optional)

**Endpoint:** `GET /api/predictions/me/analytics?tournamentId=:id`

**Auth:** Required (current user).

**Query:** `tournamentId` (number, required) – scope analytics to this tournament.

**Response (optional):** If the backend provides this endpoint, the frontend can use it to avoid client-side aggregation. Same shape can be derived from existing `GET /api/predictions/me/history?tournamentId=`, so this is fully optional.

```json
{
  "totalPoints": 12,
  "correctCount": 4,
  "wrongCount": 3,
  "pointsOverTime": {
    "labels": ["SA vs WI", "IND vs ZIM", "..."],
    "values": [2, 5, 8, 12]
  },
  "picksByTeam": {
    "SA": 2,
    "IND": 3,
    "WI": 1
  }
}
```

- **totalPoints:** Sum of points in this tournament.
- **correctCount / wrongCount:** Count of predictions where `userPick === winner` vs not (only for decided matches).
- **pointsOverTime:** Optional; labels = match labels (e.g. "TeamA vs TeamB"), values = cumulative points after each match in chronological order.
- **picksByTeam:** Optional; count of how many times the user picked each team.

**Current behavior:** The frontend uses `GET /api/predictions/me/history?tournamentId=` and computes all of the above client-side. Implementing this endpoint is optional and can be used later for performance or consistency.

---

## Phase 3: Pool analytics (required for “Pool analytics” tab)

**Endpoint:** `GET /api/tournaments/:tournamentId/pool-analytics`

**Auth:** Required (user must have access to the tournament, e.g. enrolled).

**Params:** `tournamentId` (path) – tournament id.

**Response:** Aggregated pick counts per match for the pool (all participants in that tournament).

```json
{
  "matchStats": [
    {
      "matchId": 101,
      "teamA": "SA",
      "teamB": "WI",
      "picks": {
        "SA": 12,
        "WI": 8
      }
    },
    {
      "matchId": 102,
      "teamA": "IND",
      "teamB": "ZIM",
      "picks": {
        "IND": 18,
        "ZIM": 2
      }
    }
  ]
}
```

- **matchStats:** Array of one object per match (typically completed or closed matches, or all matches in the tournament – backend decides).
- **matchId:** Match identifier.
- **teamA / teamB:** Team names for display.
- **picks:** Object mapping team name to number of users who picked that team for this match. Keys should match team names (e.g. `"SA"`, `"WI"`).

**Frontend behavior:**
- If the request **succeeds**, the “Pool analytics” tab shows “Pick distribution by match” with a card per match and, for each match, a list of teams and their pick counts.
- If the request **fails** (404, 5xx, or network error), the UI shows: “Pool analytics will appear here when the backend supports it” and the expected endpoint.

**Implementation notes for backend:**
- Use the same tournament–match and prediction data as leaderboard/history.
- For each match in the tournament, count predictions by `team` (or equivalent) and return the map; exclude or include matches with no picks as desired.
- Optionally restrict to matches that have started or are past cutoff so “pool picks” are final.

---

## Summary

| Feature           | Endpoint                                      | Required | Notes                                      |
|------------------|-----------------------------------------------|----------|--------------------------------------------|
| My analytics     | `GET /api/predictions/me/analytics?tournamentId=` | No       | Optional; frontend uses history API and computes. |
| Pool analytics   | `GET /api/tournaments/:id/pool-analytics`     | Yes      | Needed for “Pool analytics” tab to show data.    |

Existing APIs used by Analytics:
- `GET /api/predictions/me/history?tournamentId=` – my match history and points (Phase 1 & 2).
- Tournament list and selection use existing tournament/enrollment APIs.
