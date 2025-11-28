# Shot On Me Mobile App

Mobile-first social payment app for sending money to friends and discovering venues.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
RENDER_SERVICE_ID=srv-d3i7318dl3ps73cvlv00
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3001](http://localhost:3001) in your browser (or use a different port)

## Features

- ✅ Mobile-first responsive design
- ✅ User authentication
- ✅ Wallet system with balance tracking
- ✅ Send money to friends via phone number
- ✅ SMS notifications (no app required for recipients)
- ✅ Redemption code system
- ✅ Social feed (Facebook-style)
- ✅ Location tracking and friend discovery
- ✅ Nearby venues discovery
- ✅ Real-time updates

## Tabs

- **Feed** - Social feed with posts, photos, videos
- **Map** - Discover friends and venues nearby
- **Wallet** - Send money, view balance, payment history
- **Profile** - User profile and settings

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Axios for API calls
- Socket.io for real-time features

## Converting to React Native

This app is built mobile-first and can be easily converted to React Native:
1. Replace Next.js routing with React Navigation
2. Replace web components with React Native components
3. Keep the same API integration and business logic

