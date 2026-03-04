# Backend API: Predictions & Match Winner (Team Names)

The frontend now sends and expects **team names** (e.g. `"RCB"`, `"SRH"`) instead of `"A"` / `"B"` for predictions and match winner. Pass this context to your backend team.

---

## 1. Save prediction

**Request**

- **Method:** `POST /api/predictions`
- **Body:** `{ "matchId": number, "team": string }`
- **`team`:** The **team name** the user picked (must equal `match.teamA` or `match.teamB` for that match).

**Example**

```json
{ "matchId": 42, "team": "RCB" }
```

**Backend should**

- Validate that `team` is one of `match.teamA` or `match.teamB` for the given `matchId` (reject 400 otherwise).
- Store the prediction with `team` as the team name string (not "A" or "B").
- Optionally support legacy: if you still store "A"/"B" internally, map `team === match.teamA` → "A", `team === match.teamB` → "B" before saving; responses should still return the team name for consistency (see below).

---

## 2. Get my picks

**Request**

- **Method:** `GET /api/predictions/mine`
- **Response:** Array of `{ "matchId": number, "team": string }` where **`team`** is the **team name** (e.g. `"RCB"`).

**Example**

```json
[
  { "matchId": 42, "team": "RCB" },
  { "matchId": 43, "team": "SRH" }
]
```

If you still store "A"/"B" in the DB, map to team names when building the response using the match’s `teamA` / `teamB`.

---

## 3. Set match winner (admin)

**Request**

- **Method:** `PUT /api/matches/{matchId}/winner`
- **Body:** `{ "winner": string }`
- **`winner`:** The **team name** that won (must equal that match’s `teamA` or `teamB`).

**Example**

```json
{ "winner": "RCB" }
```

**Backend should**

- Validate that `winner` is either `match.teamA` or `match.teamB` for the given match.
- Store the winner as the team name string (or, if you keep "A"/"B" internally, map and store "A"/"B"; when returning the match, expose `winner` as the team name for the frontend).

---

## 4. Match response (winner field)

When returning a match (e.g. `GET /api/matches`, `GET /api/matches/:id`, or nested in predictions/history):

- **`winner`** should be the **team name** string (e.g. `"RCB"`) when a winner is set.
- For backward compatibility the frontend still accepts `winner === "A"` or `"B"` and will map to `teamA`/`teamB` for display, but the preferred format is the team name.

---

## 5. User history / selections feed

- **Predictions history** (e.g. `/api/predictions/me/history`): each match in the list should have **`userPick`** and **`winner`** as **team name** strings when applicable.
- **Selections feed** (e.g. `/api/predictions/selections`): each item should have **`team`** as the **team name** string (e.g. `"RCB"`).

---

## 6. Points calculation

When deciding if a user’s prediction was correct, compare:

- Stored **prediction team name** with **winner team name** (both as strings).
- If you still store "A"/"B" internally, compare after mapping winner and prediction to the same representation (e.g. both to team name or both to "A"/"B").

---

## Summary table

| API / Field           | Before (legacy) | Now (preferred)     |
|----------------------|------------------|----------------------|
| `POST /api/predictions` body `team` | `"A"` or `"B"` | Team name, e.g. `"RCB"` |
| `GET /api/predictions/mine` response `team` | `"A"` or `"B"` | Team name, e.g. `"RCB"` |
| `PUT /api/matches/:id/winner` body `winner` | `"A"` or `"B"` | Team name, e.g. `"RCB"` |
| Match / history `winner` | `"A"` or `"B"` | Team name, e.g. `"RCB"` |
| Match / history `userPick` | `"A"` or `"B"` | Team name, e.g. `"RCB"` |
| Selections feed item `team` | `"A"` or `"B"` | Team name, e.g. `"RCB"` |

**Validation:** For any prediction or winner, backend must ensure the value equals that match’s `teamA` or `teamB` (after trimming/case rules you use).
