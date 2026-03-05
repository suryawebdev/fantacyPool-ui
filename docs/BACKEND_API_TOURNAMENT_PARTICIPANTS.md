# Backend API: Tournament Participants & List Users (Admin)

The admin UI has **Manage participants** per tournament. The admin selects/unselects users with checkboxes (and “Select all”) and clicks **Save** once; the frontend sends a single **bulk update** with the full participant list.

---

## 1. List approved users (for participant checklist)

**Request**

- **Method:** `GET /api/admin/users`
- **Auth:** Admin only (`Authorization: Bearer <admin JWT>`).

**Response**

- **200:** Array of approved (enabled) users. Each item should include at least:
  - `id` (number)
  - `username` (string)
  - `firstName` (string, optional)
  - `lastName` (string, optional)
  - `email` (string, optional)
  - `role` (string, optional)

**Example**

```json
[
  { "id": 1, "username": "jane", "firstName": "Jane", "lastName": "Doe", "email": "jane@example.com", "role": "USER" },
  { "id": 2, "username": "bob", "firstName": "Bob", "lastName": "Smith", "email": "bob@example.com", "role": "USER" }
]
```

Only return **enabled** (approved) users.

---

## 2. List tournament participants (load current state)

**Request**

- **Method:** `GET /api/tournaments/:id/participants`
- **Auth:** Admin (or tournament owner).

**Response**

- **200:** Array of participants. Each item should include at least:
  - `id` or `userId` (number) – used by frontend to know who is currently in the tournament
  - `username` (string)
  - `firstName` (string, optional)
  - `lastName` (string, optional)

---

## 3. Replace tournament participants (bulk update) – **required for Save**

**Request**

- **Method:** `PUT /api/tournaments/:id/participants`
- **Auth:** Admin (or tournament owner).
- **Body:** Replace the tournament’s participant list with exactly this set of user ids.

```json
{ "userIds": [1, 5, 12, 42] }
```

**Response**

- **200:** Success. Optionally return the updated participant list (same shape as GET participants).
- **400:** Validation error (e.g. unknown userId, user not approved).
- **404:** Tournament not found.

**Behavior**

- Backend should **replace** the tournament’s participants with the given `userIds` (add missing, remove not in list). No need to support POST (add one) or DELETE (remove one) for this admin UI unless you have other clients that need them.
- **Allow updating participants even after the tournament has started** (e.g. when status is `active`). Admins must be able to add or remove users at any time; do not reject `PUT` based on tournament status.

---

## Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/users` | List approved users (admin only). |
| GET | `/api/tournaments/:id/participants` | List current participants. |
| **PUT** | **`/api/tournaments/:id/participants`** | **Replace participants; body `{ "userIds": number[] }`.** |

All require admin (or appropriate) auth.

**Optional:** If you already have or want single-add/remove for other use cases:

- `POST /api/tournaments/:id/participants` with body `{ "userId": number }` – add one.
- `DELETE /api/tournaments/:id/participants/:userId` – remove one.

The current admin UI **only uses GET + PUT** (load list, then Save with full `userIds`).
