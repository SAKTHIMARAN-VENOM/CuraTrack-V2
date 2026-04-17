# CuraTrack — Google Fit Backend API

This repository contains **only the backend API** for the CuraTrack health dashboard. It is built with **Next.js API Routes (App Router)** and provides authenticated access to Google Fit data (heart rate and step count) via Google OAuth 2.0.

The frontend lives in a separate repository and is built with Next.js + Tailwind CSS by a separate developer.

---

## Architecture Overview

```
curatrack/
├── app/
│   ├── layout.tsx            ← Minimal shell (required by Next.js, not used by frontend)
│   └── api/
│       ├── auth/             ← Initiates Google OAuth login flow
│       ├── oauth2callback/   ← Handles Google's redirect after login; sets auth cookie
│       ├── auth-status/      ← Returns { isAuthenticated: boolean }
│       ├── fit-data/         ← Returns steps + heart rate data (main data endpoint)
│       ├── logout/           ← Clears the auth cookie
│       └── debug/            ← Lists available Google Fit data sources (dev only)
├── lib/
│   └── google.ts             ← Google OAuth2 client factory + scope definitions
├── .env                      ← Secret credentials (never commit this)
└── README.md
```

---

## Prerequisites

- Node.js >= 18
- A Google Cloud project with the **Fitness API** enabled
- An **OAuth 2.0 Client ID** (Web application type)

---

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example` if provided):

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
REDIRECT_URI=http://localhost:3000/api/oauth2callback
```

### Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Fitness API** for your project.
3. Create an **OAuth 2.0 Client ID** (Web application).
4. Under **Authorized redirect URIs**, add exactly:
   ```
   http://localhost:3000/api/oauth2callback
   ```
5. Add your Gmail as a **Test User** in the OAuth consent screen.

---

## Running Locally

```bash
npm install
npm run dev
```

Server starts at `http://localhost:3000`.

---

## API Endpoints

All endpoints respond with `Content-Type: application/json`.

### `GET /api/auth`
Redirects the user to Google's OAuth consent screen.

**Usage:** Point the "Sign in with Google" button to this URL.

```
window.location.href = '/api/auth';
```

---

### `GET /api/oauth2callback`
Handles the redirect back from Google. Exchanges the code for tokens and stores them in an `HttpOnly` cookie (`tokens`). Redirects to `/` on success.

> This is called automatically by Google — the frontend does not need to call it directly.

---

### `GET /api/auth-status`
Returns whether the user is currently authenticated.

**Response:**
```json
{ "isAuthenticated": true }
```

---

### `GET /api/fit-data`
Returns the user's Google Fit data for the last 24 hours.

**Requires:** Auth cookie (`tokens`) to be present.

**Response:**
```json
{
  "isAuthenticated": true,
  "steps": 8432,
  "heartRateData": [
    { "bpm": 74, "time": "2026-04-17T04:00:00.000Z" },
    { "bpm": 78, "time": "2026-04-17T04:15:00.000Z" }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `steps` | `number` | Total step count for the last 24 hours |
| `heartRateData` | `Array<{bpm, time}>` | Heart rate readings in 15-min intervals. `time` is UTC ISO 8601 string — parse it locally for the user's timezone. |

**Error Response (401):**
```json
{ "error": "Not authenticated" }
```

**Notes:**
- Heart rate is sourced directly from the boAt/CoveIoT wearable (`com.coveiot.android.boat`) to avoid Google's cloud-merge lag.
- Data is sorted chronologically before being returned.
- When rendering the graph, use `new Date(item.time)` rather than treating `time` as a local string.

---

### `POST /api/logout`
Clears the auth cookie and ends the session.

**Response:**
```json
{ "success": true }
```

---

### `GET /api/debug` _(Development Only)_
Lists all available heart rate data sources registered in the user's Google Fit account. Useful for finding the correct `dataSourceId` if the data source changes (e.g., after a device swap).

**Response:**
```json
{
  "sources": [
    {
      "id": "derived:com.google.heart_rate.bpm:com.coveiot.android.boat:GoogleFitDataManager - heart rate",
      "name": "GoogleFitDataManager - heart rate",
      "type": "derived",
      "product": "Unknown Device"
    }
  ]
}
```

> Remove or protect this endpoint before deploying to production.

---

## Key Implementation Notes for the Frontend Developer

1. **Cookie-based auth:** Authentication tokens are stored in an `HttpOnly` cookie named `tokens`. The browser sends this automatically with all same-origin requests — no need for `Authorization` headers or manual token management.

2. **Auth flow:**
   ```
   User clicks "Sign In"
     → GET /api/auth
       → redirects to Google
         → Google redirects to /api/oauth2callback
           → cookie set → redirect to / (homepage)
   ```

3. **Heart rate time zones:** The `time` field in `heartRateData` is a **UTC ISO 8601 string**. Always parse it with `new Date(item.time)` so the browser renders it in the user's local timezone. Do not treat it as a pre-formatted local time string.

4. **CORS:** Since the frontend and backend are on the same Next.js origin (`localhost:3000` in dev), CORS is not an issue in development. In production, ensure both are served from the same domain or configure `next.config.ts` accordingly.

5. **Data source:** Heart rate is read from the CoveIoT/boAt source ID directly. If the user switches wearables, visit `/api/debug` to find the new source ID and update `app/api/fit-data/route.ts`.

---

## Data Scopes Requested
| Scope | Purpose |
|---|---|
| `fitness.activity.read` | Step count |
| `fitness.heart_rate.read` | Heart rate (BPM) |
