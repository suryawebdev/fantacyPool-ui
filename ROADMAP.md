Phase 1: Core User Experience
User Dashboard
Show upcoming matches and current user info
Team Selection
Allow users to pick teams for upcoming matches
User's Match History
Show their past predictions and results
Phase 2: Social & Competition
Points Table/Leaderboard
Show all users and rankings
User Profile
Personal statistics and detailed history
Phase 3: Polish & Enhancements
Notifications
Alert users when they can make predictions
Real-time Updates
Live updates when admin sets results


# Project Roadmap

## Phase 1: Core User Experience
- [x] User Dashboard
- [x] Team Selection
- [x] User's Match History

## Phase 2: Social & Competition
- [x] Leaderboard
- [ ] User Profile

## Phase 3: Polish & Enhancements
- [ ] Notifications
- [ ] Real-time Updates
- [ ] Password Reset
- [ ] Admin Features
- [ ] Check if there is a public API from which we can get match schedules and post the matches? Or else use an excel where all matches were provided, import it an parse to show the schedules
- [ ] Add a screen to admin to appprove users, so that only approved users can use this app



## New Features
Feature 1: User Selections Feed (Live Updates)
    Goal: Show a real-time feed of user selections (who picked which team, when).
    How:
        When a user selects a team, send the selection to the backend.
        Backend broadcasts the new selection to all clients via WebSocket (/topic/selections).
        Frontend subscribes to /topic/selections and updates the feed instantly.
Feature 2: In-App Chat (Real-Time)
    Goal: Allow users to send and receive chat messages in real-time.
    How:
        Add a chat UI (input + message list).
        When a user sends a message, send it to the backend.
        Backend broadcasts the message to all clients via WebSocket (/topic/chat).
        Frontend subscribes to /topic/chat and updates the chat instantly.

Step-by-Step Plan for Feature 1 (Selections Feed)
Backend
[ ] Add endpoint for submitting a team selection (if not present).
[ ] On new selection, broadcast to /topic/selections via WebSocket.
Frontend
[ ] Create a new page/component: SelectionsFeed
[ ] Subscribe to /topic/selections in WebSocketService
[ ] Display a live-updating list of selections (user, team, time)
[ ] When a user selects a team, send to backend (if not already implemented)