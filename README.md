# ExitPass

Next.js frontend hosted on Netlify, with Firebase handling authentication, data storage, security rules, and backend business logic through Cloud Functions.

## Architecture

- `app/`: frontend routes and UI
- `lib/auth-context.tsx`: Firebase Auth session handling and profile loading
- `lib/api-service.ts`: frontend data access layer for Firestore reads and callable Cloud Functions
- `functions/`: Firebase Cloud Functions for approvals, admin management, announcements, analytics, and QR verification
- `firestore.rules`: client access rules
- `netlify.toml`: Netlify frontend deployment config

## Firebase Data Model

- `users/{uid}`: profile and role metadata
- `passRequests/{requestId}`: submitted pass requests
- `passes/{requestId}`: approved pass documents keyed by request id
- `announcements/{announcementId}`: admin announcements
- `notifications/{notificationId}`: per-user notifications
- `scans/{scanId}`: QR verification history

## Setup

1. Copy `.env.example` to `.env.local` and fill in your Firebase web app values.
2. Install frontend dependencies with `npm install`.
3. Install function dependencies with `npm install` inside `functions/`.
4. Create Firestore, Authentication, and Cloud Functions in your Firebase project.
5. Seed `users/{uid}` profile documents and set matching custom claims for staff roles.

## Deploy

- Frontend: connect the repo to Netlify and provide the same `NEXT_PUBLIC_FIREBASE_*` environment variables there.
- Backend: deploy Firebase Functions and Firestore rules with the Firebase CLI from the project root.

## Notes

- All mutation-heavy backend logic is callable-function based, so approvals and admin creation do not rely on direct client writes.
- Read access is restricted by Firestore rules to the owning student or privileged staff roles.
- The current UI is preserved, but the data layer is now structured around real Firebase services instead of local mock storage.
