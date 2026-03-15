# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm start        # Run production build
```

No test suite is currently configured.

## Architecture Overview

This is a **Next.js 16 App Router** application — a LINE LIFF (LINE Front-end Framework) business management app for Japanese staff. The UI is entirely in Japanese.

### Route Groups

- `src/app/(mobile)/` — Employee-facing mobile pages (LIFF context)
  - `/` — Home dashboard with punch-in/out and shift overview
  - `/shift` — Individual shift management
  - `/expense` — Transportation expense submission
- `src/app/admin/` — Manager/admin dashboard
  - `/dashboard`, `/shifts`, `/expenses`, `/staff`, `/staff/[id]`
  - `/shifts/[storeId]/builder` — Shift builder per store

### Auth & Identity

`src/components/LiffProvider.tsx` is the central auth context (`useLiff()` hook). It:
- Initializes the LINE LIFF SDK and retrieves the LINE user profile
- Looks up the user in Supabase by `line_user_id`
- Falls back to a mock user in local dev when no LIFF ID is set
- Exposes `user`, `liff`, `loading`, and `isAdmin` to all pages

Role hierarchy (defined in `src/lib/utils/auth.ts`): `PRESIDENT` > `EXECUTIVE` > `MANAGER` > `STAFF`. Two hardcoded Super Admin UUIDs get elevated access.

### Data Layer

All Supabase calls go through `src/lib/api/`:
- `admin.ts` — User/store/shift/permission/holiday CRUD for admin views
- `shift.ts` — Shift retrieval and updates
- `attendance.ts` — Clock in/out with 4-stage tracking: `WAKE_UP → LEAVE → CLOCK_IN → CLOCK_OUT`
- `expense.ts` — Transportation expense logging

Two Supabase clients in `src/lib/supabase.ts`:
- `supabase` — authenticated client (session-persisted)
- `supabaseAnon` — anonymous client used in some admin queries to bypass RLS (flagged as a security concern in `REVIEW.md`)

### Key Features

- **Geolocation validation**: Haversine distance check against store coordinates at punch-in
- **Shift planning modal**: Pre-shift wake-up/departure time + memo entry
- **Invite system**: Time-limited (30-min TTL) nonce-based store invitations (`src/lib/invite.ts`)
- **Date utilities**: All timestamps use JST (Japan Standard Time) via `src/lib/utils/date.ts` — always use these helpers, never raw `new Date()`
- **Excel export**: XLSX + JSZip for spreadsheet generation in admin views

### Path Alias

`@/*` resolves to `src/*` (configured in `tsconfig.json`).

## Known Issues

`REVIEW.md` documents several security findings to be aware of:
- Admin role enforcement is client-side only — Supabase RLS does not fully protect all admin API calls
- `supabaseAnon` in `getAllUsers()` exposes full user list including phone numbers without auth
- Registration PIN stored in a `NEXT_PUBLIC_` env var (client-visible)
- Invite links lack HMAC signature verification
- ESLint currently reports many errors (no-explicit-any, etc.)
