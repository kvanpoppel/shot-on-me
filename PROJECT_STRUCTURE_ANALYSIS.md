# Shot On Me - Complete Project Structure Analysis

## 📊 System Architecture Overview

### **Communication Model: Shared Backend API + Shared Database**

Both the **User App** (shot-on-me) and **Venue Portal** communicate with the **same backend API server** and share the **same MongoDB database**. They are separate frontend applications but use identical authentication and data models.

```
┌─────────────────┐         ┌─────────────────┐
│   User App      │         │  Venue Portal   │
│  (shot-on-me)   │         │ (venue-portal)  │
│                 │         │                 │
│  Next.js 14     │         │  Next.js 14     │
│  Port: 3001     │         │  Port: 3000     │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │  HTTP/REST API            │
         │  Socket.io (WebSocket)    │
         │                           │
         └───────────┬───────────────┘
                     │
         ┌───────────▼───────────┐
         │   Backend API Server  │
         │   (backend/)          │
         │   Express.js           │
         │   Port: 5000           │
         │   Deployed: Render     │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   MongoDB Atlas       │
         │   Cloud Database      │
         │   Shared by both apps │
         └───────────────────────┘
```

---

## 🗂️ Folder Structure Map

### **1. Backend API Server** (`backend/`)

**Location:** `backend/`
**Deployment:** Render (Production)
**Port:** 5000 (local) / Environment PORT (Render)
**Main Entry:** `backend/server.js`

#### **Core Files:**
- `server.js` - Express server, Socket.io setup, MongoDB connection, route mounting
- `package.json` - Dependencies: express, mongoose, socket.io, stripe, cloudinary, twilio

#### **API Routes** (`backend/routes/`):
| File | Endpoints | Purpose | Stripe? |
|------|-----------|---------|---------|
| `auth.js` | `/api/auth/login`, `/api/auth/register`, `/api/auth/register-venue` | User authentication | ❌ |
| `users.js` | `/api/users/me`, `/api/users/:userId`, `/api/users/search`, `/api/users/friends/:userId` | User management, profiles, friends | ❌ |
| `venues.js` | `/api/venues`, `/api/venues/:venueId`, `/api/venues/:venueId/promotions`, `/api/venues/debug/all` | Venue CRUD, promotions | ❌ |
| `payments.js` | `/api/payments/send`, `/api/payments/history`, `/api/payments/redeem` | Wallet payments, redemption codes | ⚠️ **Stripe installed but NOT used** |
| `feed.js` | `/api/feed`, `/api/feed/:postId/reaction`, `/api/feed/:postId/comment` | Social feed posts, reactions, comments | ❌ |
| `messages.js` | `/api/messages/send`, `/api/messages/conversations`, `/api/messages/unread-count` | Direct messaging | ❌ |
| `stories.js` | `/api/stories`, `/api/stories/:storyId/view`, `/api/stories/:storyId/reaction` | 24-hour stories | ❌ |
| `notifications.js` | `/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/:id/read` | User notifications | ❌ |
| `groups.js` | `/api/groups`, `/api/groups/:groupId/messages` | Group chats | ❌ |
| `checkins.js` | `/api/checkins`, `/api/checkins/history`, `/api/checkins/leaderboard` | Venue check-ins, points, streaks | ❌ |
| `location.js` | `/api/location/update`, `/api/location/friends`, `/api/location/check-proximity` | Location tracking, proximity alerts | ❌ |
| `favorites.js` | `/api/favorites/venues/:venueId`, `/api/favorites/posts/:postId`, `/api/favorites/popular-areas` | User favorites | ❌ |
| `venue-activity.js` | `/api/venue-activity/:venueId`, `/api/venue-activity/trending/list` | Venue activity metrics | ❌ |

#### **Database Models** (`backend/models/`):
- `User.js` - User accounts (userType: 'user' | 'venue'), wallet, friends, location
- `Venue.js` - Venue info, promotions, schedule, location (GeoJSON)
- `FeedPost.js` - Social feed posts, media, reactions, comments
- `Message.js` - Direct messages between users
- `Story.js` - 24-hour stories with TTL index
- `Notification.js` - User notifications
- `Group.js` - Group chat rooms
- `GroupMessage.js` - Messages in groups
- `CheckIn.js` - User check-ins at venues

#### **Middleware:**
- `middleware/auth.js` - JWT authentication middleware

#### **Stripe Status:**
- ✅ **Stripe package installed** (`stripe: ^14.9.0` in `backend/package.json`)
- ❌ **NOT implemented in payments.js** - Currently uses simple wallet balance system
- ⚠️ **Venue Portal references Stripe** - But backend endpoints don't exist yet

---

### **2. User Mobile App** (`shot-on-me/`)

**Location:** `shot-on-me/`
**Deployment:** Vercel (Production)
**Port:** 3001 (local)
**Framework:** Next.js 14 (Pages Router + App Router hybrid)

#### **Main Entry Points:**
- `pages/index.tsx` - Main app entry (Pages Router)
- `app/page.tsx` - Alternative entry (App Router)
- `app/layout.tsx` - Root layout

#### **Key Components** (`shot-on-me/app/components/`):
| Component | Purpose | API Calls |
|-----------|---------|-----------|
| `LoginScreen.tsx` | User authentication | `/api/auth/login`, `/api/auth/register` |
| `HomeTab.tsx` | Dashboard, trending venues, wallet balance | `/api/users/me`, `/api/venue-activity/trending/list` |
| `FeedTab.tsx` | Social feed, posts, reactions | `/api/feed`, `/api/feed/:postId/reaction` |
| `SendShotTab.tsx` | Send payments to friends | `/api/payments/send`, `/api/payments/history` |
| `WalletTab.tsx` | Wallet management, add funds | `/api/payments/*` |
| `MapTab.tsx` | Venue map, search, check-ins | `/api/venues`, `/api/checkins` |
| `MessagesTab.tsx` | Direct messaging | `/api/messages/*` |
| `StoriesTab.tsx` | View/create stories | `/api/stories/*` |
| `ProfileTab.tsx` | User profile, settings | `/api/users/me`, `/api/users/me` (PUT) |
| `ActivityFeed.tsx` | Notifications feed | `/api/notifications/*` |
| `BottomNav.tsx` | Navigation bar | - |

#### **Contexts** (`shot-on-me/app/contexts/`):
- `AuthContext.tsx` - User authentication state
- `SocketContext.tsx` - Socket.io real-time connection
- `GoogleMapsContext.tsx` - Google Maps API loader

#### **API Configuration:**
- `app/utils/api.ts` - Dynamic API URL resolution (handles IP addresses for mobile)
- `app/hooks/useApiUrl.ts` - Hook for API URL

#### **Stripe Status:**
- ✅ **Stripe packages installed** (`@stripe/react-stripe-js`, `@stripe/stripe-js` in `shot-on-me/package.json`)
- ❌ **NOT used in WalletTab.tsx** - Currently placeholder UI
- ⚠️ **CardElement.tsx exists** - But not integrated

---

### **3. Venue Portal** (`venue-portal/`)

**Location:** `venue-portal/`
**Deployment:** Vercel (Production)
**Port:** 3000 (local)
**Framework:** Next.js 14 (App Router)

#### **Main Entry:**
- `app/page.tsx` - Login page
- `app/dashboard/page.tsx` - Main dashboard

#### **Key Components** (`venue-portal/app/components/`):
| Component | Purpose | API Calls |
|-----------|---------|-----------|
| `LoginForm.tsx` | Venue owner authentication | `/api/auth/login`, `/api/auth/register-venue` |
| `DashboardLayout.tsx` | Main layout wrapper | - |
| `PromotionsManager.tsx` | Create/edit/delete promotions | `/api/venues/:venueId/promotions` |
| `VenueManager.tsx` | Venue info, location, address | `/api/venues`, `/api/venues/:venueId` (PUT) |
| `ScheduleManager.tsx` | Operating hours | `/api/venues/:venueId` (PUT) |
| `NotificationCenter.tsx` | Send notifications to customers | `/api/notifications/send` |
| `StripeStatusIndicator.tsx` | Check Stripe Connect status | `/api/venues/connect/status` ⚠️ **Doesn't exist** |
| `FollowerCount.tsx` | Display venue followers | `/api/venues/:venueId/followers` ⚠️ **Doesn't exist** |
| `StatsCard.tsx` | Dashboard statistics | Various |
| `VenueMap.tsx` | Google Maps venue location | - |

#### **Dashboard Pages** (`venue-portal/app/dashboard/`):
- `page.tsx` - Main dashboard
- `promotions/page.tsx` - Promotions management
- `analytics/page.tsx` - Analytics (placeholder)
- `redemptions/page.tsx` - Payment redemptions
- `settings/page.tsx` - Settings, Stripe Connect onboarding

#### **Contexts:**
- `AuthContext.tsx` - Venue owner authentication (userType: 'venue')
- `SocketContext.tsx` - Real-time updates
- `GoogleMapsContext.tsx` - Google Maps API

#### **Stripe Status:**
- ⚠️ **References Stripe Connect** in:
  - `StripeStatusIndicator.tsx` - Calls `/api/venues/connect/status` (doesn't exist)
  - `settings/page.tsx` - Calls `/api/venues/connect/onboard` (doesn't exist)
- ❌ **Backend endpoints NOT implemented** - Stripe Connect integration incomplete

---

## 🔌 API Communication Summary

### **Shared Backend Endpoints:**

Both apps use the same API base URL:
- **Local:** `http://localhost:5000/api`
- **Production:** `https://[render-backend-url]/api`

### **Authentication:**
- Both apps use JWT tokens stored in `localStorage`
- Same `/api/auth/login` endpoint
- Different registration: `/api/auth/register` (users) vs `/api/auth/register-venue` (venues)

### **Real-time Communication:**
- Both apps connect to same Socket.io server
- Events: `new-post`, `new-promotion`, `venue-updated`, `new-notification`, `new-message`

### **Database:**
- **MongoDB Atlas** (cloud)
- Same `User` model (differentiated by `userType` field)
- Same `Venue` model
- Shared collections: `users`, `venues`, `feedposts`, `messages`, `stories`, `notifications`, etc.

---

## 💳 Stripe Integration Status

### **Current State:**

| Component | Stripe Package | Implementation Status | Notes |
|-----------|----------------|----------------------|-------|
| **Backend** | ✅ Installed (`stripe: ^14.9.0`) | ❌ **NOT implemented** | Payments use simple wallet balance |
| **User App** | ✅ Installed (`@stripe/react-stripe-js`, `@stripe/stripe-js`) | ❌ **NOT implemented** | WalletTab has placeholder UI |
| **Venue Portal** | ❌ Not installed | ⚠️ **References exist** | Calls non-existent endpoints |

### **Missing Stripe Endpoints:**
- `/api/venues/connect/status` - Check Stripe Connect status
- `/api/venues/connect/onboard` - Start Stripe Connect onboarding
- `/api/payments/create-intent` - Create payment intent (for adding funds)
- `/api/payments/confirm` - Confirm payment

### **What Needs to Be Built:**
1. **Stripe Connect** integration for venues (receive payments)
2. **Stripe Payment Intents** for users (add funds to wallet)
3. **Webhook handler** for Stripe events
4. **Payment model** to track transactions

---

## 📁 Complete File Path Reference

### **Backend:**
```
backend/
├── server.js                    # Main Express server
├── package.json                 # Dependencies (includes stripe)
├── routes/
│   ├── auth.js                  # Authentication
│   ├── users.js                 # User management
│   ├── venues.js                # Venue CRUD, promotions
│   ├── payments.js              # Wallet payments (NO Stripe)
│   ├── feed.js                  # Social feed
│   ├── messages.js              # Direct messages
│   ├── stories.js               # Stories
│   ├── notifications.js         # Notifications
│   ├── groups.js                # Group chats
│   ├── checkins.js              # Check-ins
│   ├── location.js              # Location tracking
│   ├── favorites.js              # Favorites
│   └── venue-activity.js        # Activity metrics
├── models/
│   ├── User.js                  # User model
│   ├── Venue.js                 # Venue model
│   ├── FeedPost.js              # Posts
│   ├── Message.js               # Messages
│   ├── Story.js                 # Stories
│   ├── Notification.js          # Notifications
│   ├── Group.js                 # Groups
│   ├── GroupMessage.js          # Group messages
│   └── CheckIn.js               # Check-ins
└── middleware/
    └── auth.js                  # JWT middleware
```

### **User App:**
```
shot-on-me/
├── pages/
│   ├── index.tsx                # Main entry (Pages Router)
│   └── _app.tsx                 # App wrapper
├── app/
│   ├── page.tsx                 # Alternative entry
│   ├── layout.tsx               # Root layout
│   ├── components/              # 23 components
│   ├── contexts/                # Auth, Socket, GoogleMaps
│   ├── utils/
│   │   └── api.ts               # API URL resolver
│   └── hooks/
│       └── useApiUrl.ts         # API URL hook
└── package.json                 # Includes Stripe packages (unused)
```

### **Venue Portal:**
```
venue-portal/
├── app/
│   ├── page.tsx                 # Login page
│   ├── layout.tsx               # Root layout
│   ├── dashboard/
│   │   ├── page.tsx             # Main dashboard
│   │   ├── promotions/
│   │   ├── analytics/
│   │   ├── redemptions/
│   │   └── settings/            # Stripe Connect (incomplete)
│   ├── components/              # 11 components
│   └── contexts/                # Auth, Socket, GoogleMaps
└── package.json                 # No Stripe packages
```

---

## 🚀 Deployment Status

| Service | Platform | Status | URL |
|---------|----------|--------|-----|
| **Backend API** | Render | ✅ Deployed | Production URL |
| **User App** | Vercel | ✅ Deployed | `https://shotonme.com` |
| **Venue Portal** | Vercel | ✅ Deployed | `https://shot-on-me-venue-portal.vercel.app` |
| **Database** | MongoDB Atlas | ✅ Active | Cloud cluster |

---

## ⚠️ Known Issues & Missing Features

1. **Stripe Integration:**
   - Backend has Stripe package but no implementation
   - Venue Portal references non-existent Stripe endpoints
   - User App has Stripe packages but not used

2. **Missing Backend Endpoints:**
   - `/api/venues/connect/status`
   - `/api/venues/connect/onboard`
   - `/api/venues/:venueId/followers`
   - `/api/notifications/send` (may exist, needs verification)

3. **Payment System:**
   - Currently uses simple wallet balance (no real money)
   - No payment history tracking model
   - Redemption codes generated but not stored

---

## 📝 Summary

**Architecture:** Monolithic backend API shared by two separate frontend applications.

**Database:** Single MongoDB Atlas database shared by both apps.

**Stripe:** Installed but not implemented. Payment system uses simple wallet balances.

**Real-time:** Socket.io for live updates (promotions, posts, messages, notifications).

**Deployment:** Backend on Render, both frontends on Vercel.

