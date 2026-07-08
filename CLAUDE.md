# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (outputs to dist/)
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
```

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `VITE_API_URL` — backend API base URL
- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps API key

## Architecture

**Single-page React app (React 19 + Vite + React Router 7)**

### Routing
- `src/main.jsx` bootstraps React with `BrowserRouter`
- `src/App.jsx` defines top-level routes: `/signin`, `/forgot-password`, `/reset-password`, and `/admin/*` (protected)
- Protected routes check for `adminToken` in localStorage; unauthenticated requests redirect to `/signin`
- `src/pages/admin/AdminDashboard.jsx` is the nested router for all admin sections, wrapped in `Layout` and `AppSettingsProvider`

### API Layer (`src/api/`)
- `client.js` is the central HTTP client — all API modules call `apiRequest()` from here
- Handles Bearer token auth, automatic token refresh on 401 (rotates `adminToken`/`adminRefreshToken` in localStorage), and dispatches a session-expiry event when refresh fails
- 22 API modules wrap specific backend domains (orders, customers, services, zones, etc.)
- `missing_apis.txt` documents backend endpoints that are not yet implemented

### State & Context
- No global state library; state is local to each page component
- `AppSettingsContext` (via `src/contexts/AppSettingsContext.jsx`) loads Google Maps config and provides it app-wide

### Layout
- `src/components/Layout/Layout.jsx` wraps all admin pages with `Sidebar` and `TopBar`
- `SessionExpiryModal` listens for the auth expiry event dispatched by `client.js` and shows a modal

### Admin Sections
17 feature modules under `src/pages/admin/`: dashboard, orders, customers, wallet, service-providers, services, pricing, assets, promotions, communication, analytics, disputes, zones, settings, account, cancellation. Each is a self-contained directory with its own page components.

## Tech Stack

- **UI:** React 19, React Router 7, Lucide React (icons), Recharts (charts)
- **Maps:** `@react-google-maps/api`
- **Build:** Vite 7, ESLint 9 (flat config)
- **Auth tokens:** `adminToken`, `adminRefreshToken` stored in `localStorage`
- **Custom font:** Saudi Riyal (loaded via `@font-face` in `src/index.css`)
