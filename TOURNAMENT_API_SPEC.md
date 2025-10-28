# Tournament Management API Specification

## Overview
This document provides the complete API specification for the Tournament Management system in the Fantasy Pool application. The frontend has been fully implemented and is ready to consume these APIs.

## Base URL
```
{API_BASE_URL}/api/tournaments
```

## Authentication
All endpoints require JWT authentication via Authorization header:
```
Authorization: Bearer {jwt_token}
```

## Data Models

### Tournament Entity
```json
{
  "id": 1,
  "name": "World Cup 2024 Fantasy Pool",
  "description": "Predict the outcomes of World Cup 2024 matches and compete for the grand prize!",
  "startDate": "2024-06-01T00:00:00Z",
  "endDate": "2024-07-15T23:59:59Z",
  "status": "upcoming", // "upcoming" | "active" | "completed" | "cancelled"
  "maxParticipants": 100,
  "currentParticipants": 45,
  "entryFee": 25.00,
  "prizePool": 2000.00,
  "rules": "1. Each participant can make one prediction per match\n2. Points are awarded based on correct predictions\n3. No late entries after tournament starts",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "createdBy": 1 // Admin user ID
}
```

### Create Tournament Request
```json
{
  "name": "string (required, min: 3 chars)",
  "description": "string (required, min: 10 chars)",
  "startDate": "string (ISO 8601 date)",
  "endDate": "string (ISO 8601 date)",
  "maxParticipants": "number (optional, min: 2)",
  "entryFee": "number (optional, min: 0, default: 0)",
  "prizePool": "number (optional, min: 0, default: 0)",
  "rules": "string (optional)"
}
```

### Update Tournament Request
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "startDate": "string (optional, ISO 8601 date)",
  "endDate": "string (optional, ISO 8601 date)",
  "maxParticipants": "number (optional)",
  "entryFee": "number (optional)",
  "prizePool": "number (optional)",
  "rules": "string (optional)",
  "status": "string (optional, enum: upcoming|active|completed|cancelled)"
}
```

## API Endpoints

### 1. Get All Tournaments
**GET** `/api/tournaments`

**Description**: Retrieve all tournaments (public endpoint for leaderboard)

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "World Cup 2024 Fantasy Pool",
    "description": "Predict the outcomes...",
    "startDate": "2024-06-01T00:00:00Z",
    "endDate": "2024-07-15T23:59:59Z",
    "status": "upcoming",
    "maxParticipants": 100,
    "currentParticipants": 45,
    "entryFee": 25.00,
    "prizePool": 2000.00,
    "rules": "1. Each participant...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": 1
  }
]
```

### 2. Get Active Tournaments
**GET** `/api/tournaments/active`

**Description**: Get tournaments that are currently active (for user selection)

**Response**: `200 OK`
```json
[
  // Same as above, but only active tournaments
]
```

### 3. Get Tournament by ID
**GET** `/api/tournaments/{id}`

**Description**: Get specific tournament details

**Parameters**:
- `id` (path): Tournament ID

**Response**: `200 OK`
```json
{
  "id": 1,
  "name": "World Cup 2024 Fantasy Pool",
  // ... full tournament object
}
```

**Error Responses**:
- `404 Not Found`: Tournament not found

### 4. Create Tournament
**POST** `/api/tournaments`

**Description**: Create a new tournament (Admin only)

**Request Body**: Create Tournament Request object

**Response**: `201 Created`
```json
{
  "id": 1,
  "name": "World Cup 2024 Fantasy Pool",
  // ... full tournament object
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not admin user

### 5. Update Tournament
**PUT** `/api/tournaments/{id}`

**Description**: Update existing tournament (Admin only)

**Parameters**:
- `id` (path): Tournament ID

**Request Body**: Update Tournament Request object

**Response**: `200 OK`
```json
{
  "id": 1,
  "name": "Updated Tournament Name",
  // ... updated tournament object
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not admin user
- `404 Not Found`: Tournament not found

### 6. Delete Tournament
**DELETE** `/api/tournaments/{id}`

**Description**: Delete tournament (Admin only)

**Parameters**:
- `id` (path): Tournament ID

**Response**: `204 No Content`

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not admin user
- `404 Not Found`: Tournament not found
- `409 Conflict`: Cannot delete tournament with active participants

### 7. Get My Tournaments
**GET** `/api/tournaments/my-tournaments`

**Description**: Get tournaments created by current admin user

**Response**: `200 OK`
```json
[
  // Array of tournaments created by current user
]
```

### 8. Join Tournament
**POST** `/api/tournaments/{id}/join`

**Description**: User joins a tournament

**Parameters**:
- `id` (path): Tournament ID

**Request Body**: `{}` (empty object)

**Response**: `200 OK`
```json
{
  "message": "Successfully joined tournament",
  "tournamentId": 1,
  "participantCount": 46
}
```

**Error Responses**:
- `400 Bad Request`: Tournament full, already joined, or tournament not active
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Tournament not found

### 9. Leave Tournament
**POST** `/api/tournaments/{id}/leave`

**Description**: User leaves a tournament

**Parameters**:
- `id` (path): Tournament ID

**Request Body**: `{}` (empty object)

**Response**: `200 OK`
```json
{
  "message": "Successfully left tournament",
  "tournamentId": 1,
  "participantCount": 45
}
```

**Error Responses**:
- `400 Bad Request`: Not a participant or tournament not active
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Tournament not found

### 10. Get Tournament Participants
**GET** `/api/tournaments/{id}/participants`

**Description**: Get list of tournament participants

**Parameters**:
- `id` (path): Tournament ID

**Response**: `200 OK`
```json
[
  {
    "userId": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "joinedAt": "2024-01-15T10:30:00Z",
    "points": 150
  }
]
```

### 11. Get Tournament Leaderboard
**GET** `/api/tournaments/{id}/leaderboard`

**Description**: Get tournament leaderboard with participant rankings

**Parameters**:
- `id` (path): Tournament ID

**Response**: `200 OK`
```json
[
  {
    "rank": 1,
    "userId": 5,
    "username": "champion",
    "points": 250,
    "correctPredictions": 15,
    "totalPredictions": 18
  },
  {
    "rank": 2,
    "userId": 3,
    "username": "runner_up",
    "points": 230,
    "correctPredictions": 14,
    "totalPredictions": 18
  }
]
```

## Database Schema

### Tournaments Table
```sql
CREATE TABLE tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    max_participants INTEGER,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    prize_pool DECIMAL(10,2) DEFAULT 0,
    rules TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX idx_tournaments_dates ON tournaments(start_date, end_date);
```

### Tournament Participants Table
```sql
CREATE TABLE tournament_participants (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    points INTEGER DEFAULT 0,
    UNIQUE(tournament_id, user_id)
);

-- Indexes
CREATE INDEX idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user ON tournament_participants(user_id);
```

## Business Rules

### Tournament Creation
1. Only admin users can create tournaments
2. Start date must be in the future
3. End date must be after start date
4. Max participants must be at least 2 if specified
5. Entry fee and prize pool must be non-negative

### Tournament Status Transitions
- `upcoming` → `active`: When start date is reached
- `active` → `completed`: When end date is reached
- Any status → `cancelled`: Admin can cancel at any time

### Participant Management
1. Users can only join active or upcoming tournaments
2. Users cannot join if tournament is at max capacity
3. Users cannot join the same tournament twice
4. Users can leave tournaments before they start

### Validation Rules
1. Tournament name: 3-255 characters
2. Description: 10+ characters
3. Dates: Valid ISO 8601 format
4. Numeric fields: Non-negative values
5. Status: Must be one of the defined enum values

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Validation Error",
  "message": "Tournament name is required",
  "details": {
    "field": "name",
    "code": "REQUIRED"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Form validation failed
- `TOURNAMENT_NOT_FOUND`: Tournament doesn't exist
- `TOURNAMENT_FULL`: Max participants reached
- `ALREADY_PARTICIPANT`: User already joined
- `NOT_PARTICIPANT`: User not in tournament
- `TOURNAMENT_NOT_ACTIVE`: Tournament not in active state
- `INSUFFICIENT_PERMISSIONS`: User not authorized

## Frontend Integration Notes

The frontend is already implemented and expects:
1. All endpoints to return data in the specified format
2. Proper HTTP status codes
3. CORS headers for cross-origin requests
4. JWT token validation
5. Error responses in the standard format

## Testing Endpoints

### Test Tournament Creation
```bash
curl -X POST http://localhost:8080/api/tournaments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Tournament",
    "description": "This is a test tournament for development",
    "startDate": "2024-06-01T00:00:00Z",
    "endDate": "2024-07-01T23:59:59Z",
    "maxParticipants": 50,
    "entryFee": 10.00,
    "prizePool": 500.00
  }'
```

### Test Get Tournaments
```bash
curl -X GET http://localhost:8080/api/tournaments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Next Steps for Backend Team

1. **Database Setup**: Create the tournaments and tournament_participants tables
2. **Entity Classes**: Create Tournament and TournamentParticipant entities
3. **Repository Layer**: Implement data access methods
4. **Service Layer**: Implement business logic and validation
5. **Controller Layer**: Implement REST endpoints
6. **Security**: Add admin role checks for create/update/delete operations
7. **Testing**: Write unit and integration tests
8. **Documentation**: Update API documentation

The frontend is ready and waiting for these APIs to be implemented!
