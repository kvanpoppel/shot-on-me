# Progress Report — Shot On Me Platform
_Last updated: 2026-04-17_

---

## Platform Overview

Three apps, one backend, deployed on Vercel (frontends) + Render (backend).

| App | Folder | URL |
|-----|--------|-----|
| Backend API | `backend/` | Render — Express + MongoDB + Socket.io |
| Shot On Me | `shot-on-me/` | shotonme.com — customer mobile PWA |
| Fizz | `fizz/` | fizz.shotonme.com — non-alcohol gifting PWA |
| Venue Portal | `venue-portal/` | venues.shotonme.com — venue owner dashboard |

---

## Fizz App — ~95% Complete

### What's Built (all wired to live backend)
- **Auth:** Register, sign in, forgot password, remember me, Face ID/biometric, reset-password page
- **Home tab:** Wallet balance, quick-send, friend activity feed
- **Sips tab (Venue Discovery):** Browse non-alcohol venues, check-in with GPS, send Fizz to venue
- **Feed tab:** Posts with photo upload, likes, comments (CommentsSheet), share post, report post, delete/edit own posts, infinite scroll + pagination, StoriesRow at top
- **Stories:** 24h expiry, grouped by author, auto-advance viewer, create/delete
- **Send Fizz:** P2P gifting with prefill from venue or friend profile
- **Wallet tab:** Balance, add funds (AddFundsModal), transaction history
- **Messages tab (DMs):** Real-time via Socket.io, photo uploads in DMs, typing indicators, unread count
- **Profile tab:** Edit profile + photo upload, stats, friends list, rewards, referrals, crews, settings
- **Friend system:** Send/accept/decline requests, friend suggestions (friends-of-friends + active fallback), block/report users, FriendProfile overlay
- **Search:** SearchModal — search users and venues
- **Find Friends:** FindFriends component
- **Notifications:** Real-time (socket) + persisted list (/fizz/notifications), per-type settings (messages, fizzReceived, friendRequests, feedActivity), read-all
- **Push notifications:** PWA web-push with VAPID, service worker at /sw.js — wired but needs Kate's VAPID keys in Render
- **Rewards / Gamification:** RewardsScreen component
- **Referrals:** ReferralScreen component
- **Crews:** CrewsTab component
- **Settings:** SettingsMenu with notification preferences
- **Legal:** Terms (/terms) + Privacy (/privacy) pages, Cookie consent banner
- **Venue signup:** /venue-signup page
- **PWA:** manifest.json, icons, apple-web-app meta, OG tags, Twitter card
- **Error handling:** ErrorBoundary component

### What's NOT Done / Kate's Action Items
- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys` → add to Render env
- [ ] Create Sentry account → add NEXT_PUBLIC_SENTRY_DSN to Vercel (fizz project)
- [ ] TonightTab and CookieConsent components exist but TonightTab is disabled (hidden from nav)

---

## Shot On Me App — ~85% Complete

- Wallet, payments, Tap-n-Pay virtual card, social feed, venue discovery, friend discovery, location tracking, bottom nav (pill style), Shot On Me-style dropdown, Stories row
- Cookie consent banner added
- Sentry wired (needs NEXT_PUBLIC_SENTRY_DSN in Vercel)

---

## Venue Portal — ~90% Complete

- Dashboard, promotions management, schedule management, notification center (Notify Guests)
- Simplified nav (April 2026): renamed tabs, removed clutter
- Terms of Service (12 sections) + Privacy Policy (10 sections) — production grade (April 12)
- Deployed to Vercel

---

## Backend — ~95% Complete

All `/api/fizz/*` and `/api/*` endpoints built:
- Auth, profiles, wallet, send, friends, user search
- Feed CRUD + likes/comments/share/report
- Messages + unread count + typing indicators
- Stories (CRUD + view tracking)
- Check-ins
- Notifications (persist + list + read-all)
- Push subscriptions (web-push delivery)
- Block/unblock/blocked list
- Friend requests (send/accept/decline/pending)
- Friend suggestions
- CORS fix applied (no-origin gap closed)
- Sentry integrated (needs SENTRY_DSN in Render)

---

## Kate's Remaining Tasks (All Ops — No More Code)

### Must-do Before Real Money Flows
- [ ] Rotate ALL credentials: Stripe, Twilio, MongoDB, Cloudinary, JWT secret
- [ ] Verify .env is NOT in git history
- [ ] Switch Stripe to live mode in Render env vars
- [ ] Connect live Stripe to business bank account

### Push Notifications
- [ ] `npx web-push generate-vapid-keys`
- [ ] Add to Render: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL=admin@fizz.app

### Error Tracking
- [ ] Create Sentry account + 4 projects (backend, shot-on-me, fizz, venue-portal)
- [ ] Add SENTRY_DSN to Render (backend + venue-portal backend)
- [ ] Add NEXT_PUBLIC_SENTRY_DSN to Vercel (shot-on-me + fizz)

### Business Setup
- [ ] Form LLC (state SOS or Stripe Atlas)
- [ ] Get EIN (IRS.gov — free, instant)
- [ ] Open business bank account (Mercury or Relay)
- [ ] Set up privacy@shotonme.com email

### Infrastructure
- [ ] Set up Cloudflare in front of all 3 domains
- [ ] Enable MongoDB Atlas automated backups (daily, 7-day retention)
