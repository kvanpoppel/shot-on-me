# Shot On Me Backend API

Backend server for Shot On Me and Venue Portal applications.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - MongoDB connection string
   - JWT secret key
   - Twilio credentials (for SMS)
   - Cloudinary credentials (for media uploads)
   - Stripe credentials (for payments)

4. Start MongoDB (if running locally):
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Or use MongoDB Atlas (cloud)
```

5. Run the server:
```bash
# Development
npm run dev

# Production
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/me` - Update profile
- `POST /api/users/friends/:id` - Add friend
- `GET /api/users/search/:query` - Search users

### Payments
- `POST /api/payments/send` - Send money to friend
- `POST /api/payments/redeem` - Redeem payment code
- `GET /api/payments/history` - Get payment history

### Venues
- `GET /api/venues` - Get all venues
- `GET /api/venues/:id` - Get venue by ID
- `POST /api/venues` - Create venue (venue owners)
- `PUT /api/venues/:id` - Update venue
- `POST /api/venues/:id/promotions` - Add promotion
- `PUT /api/venues/:id/schedule` - Update schedule

### Feed
- `GET /api/feed` - Get feed posts
- `POST /api/feed` - Create post
- `POST /api/feed/:id/like` - Like/unlike post
- `POST /api/feed/:id/comments` - Add comment

### Location
- `PUT /api/location/update` - Update user location
- `GET /api/location/friends` - Get nearby friends
- `GET /api/location/venues` - Get nearby venues

### Notifications
- `POST /api/notifications/send` - Send notification (venue owners)
- `GET /api/notifications` - Get notifications

## Features

- ✅ User authentication (JWT)
- ✅ Payment system with escrow
- ✅ SMS notifications via Twilio
- ✅ Real-time updates (WebSocket)
- ✅ Media uploads (Cloudinary)
- ✅ Location tracking
- ✅ Social feed with likes/comments
- ✅ Venue management

