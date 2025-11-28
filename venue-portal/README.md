# Venue Portal

Web portal for venue owners to manage promotions, schedules, and customer engagement.

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

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- ✅ Beautiful, modern UI with Tailwind CSS
- ✅ Authentication system
- ✅ Dashboard with statistics
- ✅ Promotions management (happy hours, events, specials)
- ✅ Operating schedule management
- ✅ Notification system for customers
- ✅ Real-time updates

## Pages

- `/` - Login page
- `/dashboard` - Main dashboard
- `/dashboard/promotions` - Manage promotions
- `/dashboard/schedule` - Manage operating hours
- `/dashboard/notifications` - Send notifications

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Axios for API calls

