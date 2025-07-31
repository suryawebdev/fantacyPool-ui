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


Migration Plan to Google Cloud

. High-Level Migration Plan
A. Prepare Your Apps for Cloud
Ensure your Angular app builds to static files (ng build --configuration production).
Ensure your Spring Boot app is stateless and uses environment variables for config (DB URL, secrets, etc.).
Use a managed database (e.g., Cloud SQL for PostgreSQL).
B. Choose GCP Services
Frontend (Angular):
Cloud Storage + Cloud CDN (recommended for static hosting)
Firebase Hosting (alternative, also works great for Angular SPAs)
Backend (Spring Boot):
Cloud Run (containerized, serverless, scales to zero, easy to deploy)
App Engine Flex (PaaS, also supports Spring Boot)
GKE (Kubernetes) or Compute Engine (for advanced/large-scale needs)
Database:
Cloud SQL (managed PostgreSQL/MySQL)
C. Migration Steps
1. Database
Export your local PostgreSQL DB and import into Cloud SQL.
Update your Spring Boot config to use the Cloud SQL connection string.
2. Backend (Spring Boot)
Containerize your app with Docker (recommended for Cloud Run).
Push your image to Google Container Registry (GCR) or Artifact Registry.
Deploy to Cloud Run (or App Engine Flex).
Set environment variables/secrets in GCP.
3. Frontend (Angular)
Build your Angular app for production.
Upload the dist/ folder to Cloud Storage (or Firebase Hosting).
Set up a load balancer or CDN if needed.
4. WebSocket Support
Cloud Run and App Engine Flex support WebSockets.
If using Cloud Run, ensure you use HTTP/1.1 (not HTTP/2) for WebSocket support.
5. Domain & HTTPS
Set up a custom domain in GCP.
Use Google-managed SSL certificates.
2. Migration Checklist
[ ] Prepare production builds for Angular and Spring Boot.
[ ] Containerize Spring Boot app (Dockerfile).
[ ] Create and configure Cloud SQL instance.
[ ] Migrate database data to Cloud SQL.
[ ] Update backend config for Cloud SQL and environment variables.
[ ] Push Docker image to GCR/Artifact Registry.
[ ] Deploy backend to Cloud Run (or App Engine Flex).
[ ] Build Angular app and upload to Cloud Storage or Firebase Hosting.
[ ] Set up CORS and environment variables for frontend-backend communication.
[ ] Test WebSocket connections in the cloud environment.
[ ] Set up custom domain and HTTPS.
[ ] Monitor logs and performance in GCP Console.
3. Resources
Deploying Angular to Google Cloud Storage
Deploying Spring Boot to Cloud Run
Cloud SQL for PostgreSQL
WebSockets on Cloud Run
Would you like to start with:
Migrating the database to Cloud SQL?
Containerizing and deploying the backend?
Deploying the Angular frontend?
Or a detailed step-by-step for a specific part?
Let me know your preference and I’ll guide you through it!