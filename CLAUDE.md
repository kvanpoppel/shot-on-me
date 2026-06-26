# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Shot On Me is a social payments + venue discovery platform. Users send money for drinks via the app, pay at bars with a virtual wallet card (Stripe Issuing → Apple/Google Pay), and venues manage everything through dashboards. The backend also powers **Revig**, a parallel non-alcohol variant.

## Monorepo Layout

| Directory | What | Framework | Dev Port |
|---|---|---|---|
| `backend/` | API server | Express.js + MongoDB + Socket.io | 5000 |
| `shot-on-me/` | Customer mobile app (PWA) | Next.js + TypeScript + Tailwind | 3001 |
| `venue-portal/` | Venue owner dashboard | Next.js + TypeScript + Tailwind | 3002 |
| `owner-portal/` | Platform admin dashboard | Next.js + TypeScript + Tailwind | 3000 |
| `revig/` | Revig consumer app | Next.js + TypeScript + Tailwind | 3003 |
| `revig-venues/` | Revig venue dashboard | Next.js (Turbopack) + Tailwind | 3000 (default) |

The root `app/`, `package.json`, and `next.config.js` are a legacy venue-portal — the active frontends live in the subdirectories above.

## Build & Dev Commands

Each frontend is independent — `cd` into the directory first:

```bash
# Backend
cd backend && npm install && npm run dev   # nodemon, port 5000
cd backend && npm start                    # production

# Any frontend (shot-on-me, venue-portal, owner-portal, revig, revig-venues)
cd <app> && npm install && npm run dev
cd <app> && npm run build                  # production build
cd <app> && npm run lint                   # next lint
```

There is no unified build/test/lint command at the repo root.

## Deployment (Do NOT run locally)

Everything deploys automatically on push to `main`:
- **Backend** → Render (see `render.yaml`). Production URL: `https://shot-on-me.onrender.com`
- **shot-on-me** → Vercel. Domain: `www.shotonme.com` / `shotonme.com`
- **venue-portal** → Vercel. Domain: `venue.shotonme.com`
- **owner-portal** → Vercel. Domain: `owner.shotonme.com`
- **revig** → Vercel. Domain: `revig.shotonme.com`
- **revig-venues** → Vercel. Domain: `revig-venues.shotonme.com`

Each Vercel project has its own `vercel.json` in its subdirectory. The root `vercel.json` points Vercel to `shot-on-me/` for the main domain.

**Never suggest running the backend locally.** Debug via Render logs or Vercel build logs in the browser.

## Backend Architecture

`backend/server.js` is the entry point. Key patterns:

- **Stripe webhooks** (`/api/payments/webhook`, `/api/kyc/webhook`) must be registered BEFORE `express.json()` middleware because they need the raw body.
- **Route registration order matters**: `usersBatch` before `users`, `venue-staff` / `venues-featured` / `venues-analytics` before generic `venues` — specific routes must precede parameterized `/:id` routes.
- **Auth**: JWT via `Authorization: Bearer <token>` header or `token` httpOnly cookie. Middleware in `backend/middleware/auth.js`.
- **Real-time**: Socket.io instance is passed to routers via `router.setIO(io)` pattern — used by feed, messages, revig, tap-and-pay, and promotion notifications.
- **Background jobs** run in-process (no separate worker):
  - Story cleanup (hourly)
  - Expired pending payment refunds (daily)
  - AI learning loop (weekly)
  - Viral moment detection (every 15 min)
  - Promotion expiry (every 5 min)
  - AI automation scheduler (configurable, default 60 min)
  - "Who's Out Tonight" notifications (polls every minute for 8pm window)
  - Render keep-alive ping (every 10 min, production only)
- **Geo restriction**: `middleware/geoRestriction.js` applied to registration and money-movement payment endpoints.
- **Rate limiting**: Auth, API, and media upload limiters in `middleware/rateLimiter.js`. Skipped in dev.
- **Error sanitization**: In production, 5xx responses have internal error details stripped automatically.

## Database

MongoDB via Mongoose. Models in `backend/models/`. Core models: `User`, `Venue`, `Payment`, `PendingPayment`, `VirtualCard`, `CheckIn`, `Event`, `FeedPost`, `Story`, `Notification`, `Message`.

Required env vars: `MONGODB_URI`, `JWT_SECRET`.

## External Services

- **Stripe**: Payments, Stripe Issuing (virtual cards), payouts, webhooks
- **Twilio**: SMS notifications
- **Cloudinary**: Image uploads (cloud name: `djvgm2d3t`)
- **Google Maps**: Location features in consumer app
- **Sentry**: Error tracking (backend + shot-on-me + owner-portal)

## Frontend Patterns

All frontends use Next.js App Router with:
- `app/contexts/` — React context providers (auth, socket, theme)
- `app/components/` — UI components
- `app/utils/` — API client helpers (axios-based, pointing to `NEXT_PUBLIC_API_URL`)
- `app/hooks/` — Custom React hooks (shot-on-me, revig)
- `app/types/` or `app/types.ts` — TypeScript interfaces

The consumer apps (shot-on-me, revig) have Sentry + Capacitor (native iOS/Android wrapper) integration.

## Design System

- **Colors**: Primary/gold palette based on `#B8945A` (soft pale gold). See `tailwind.config.js`.
- **Fonts**: Dancing Script (script/logo), Inter (body).
- **Icons**: Lucide React throughout.

## Commit Messages

Do NOT add a "Co-Authored-By" line. Write concise commit messages with no attribution to Claude.

## API Route Prefix

All backend routes are under `/api/`. Key route groups: `/api/auth`, `/api/users`, `/api/venues`, `/api/payments`, `/api/feed`, `/api/revig`, `/api/tap-and-pay`, `/api/virtual-cards`, `/api/checkins`, `/api/loyalty`, `/api/gamification`.
