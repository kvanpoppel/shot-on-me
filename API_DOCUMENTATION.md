# 📚 Shot On Me API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production: https://api.yourdomain.com/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

Tokens are obtained through `/api/auth/login` or `/api/auth/register` and expire after 7 days.

---

## 🔐 Authentication Endpoints

### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "user",
    "wallet": { "balance": 0, "pendingBalance": 0 },
    "friends": [],
    "location": { "isVisible": true }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes per IP

---

### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phoneNumber": "+1234567890"
}
```

**Response:** Same as login

---

### POST `/api/auth/register-venue`
Register a new venue owner with initial venue.

**Request Body:**
```json
{
  "email": "venue@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+1234567890",
  "venueName": "The Bar",
  "venueAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  }
}
```

---

## 👤 User Endpoints

### GET `/api/users/me`
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "user",
    "wallet": { "balance": 100, "pendingBalance": 0 },
    "friends": ["friend_id_1", "friend_id_2"],
    "location": { "isVisible": true, "latitude": 40.7128, "longitude": -74.0060 },
    "profilePicture": "https://..."
  }
}
```

---

### PUT `/api/users/me`
Update current user profile.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

---

### GET `/api/users/suggestions`
Get friend suggestions.

**Response:**
```json
{
  "suggestions": [
    {
      "id": "user_id",
      "name": "Jane Doe",
      "firstName": "Jane",
      "lastName": "Doe",
      "profilePicture": "https://..."
    }
  ]
}
```

---

### POST `/api/users/friends/:userId`
Add a friend.

**Response:**
```json
{
  "message": "Friend added successfully"
}
```

---

## 💰 Payment Endpoints

### GET `/api/payments/stripe-key`
Get Stripe publishable key.

**Response:**
```json
{
  "publishableKey": "pk_test_...",
  "configured": true
}
```

---

### POST `/api/payments/send`
Send money to a friend.

**Request Body:**
```json
{
  "recipientPhone": "+1234567890",
  "amount": 25.00,
  "message": "Happy birthday!"
}
```

**Response:**
```json
{
  "payment": {
    "_id": "payment_id",
    "redemptionCode": "ABC123",
    "amount": 25.00,
    "status": "pending"
  }
}
```

**Rate Limit:** 10 requests per hour per IP

---

### POST `/api/payments/redeem`
Redeem a payment code at a venue.

**Request Body:**
```json
{
  "code": "ABC123",
  "venueId": "venue_id"
}
```

---

## 📍 Venue Endpoints

### GET `/api/venues`
Get all venues (or user's venues if venue owner).

**Response:**
```json
[
  {
    "_id": "venue_id",
    "name": "The Bar",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY"
    },
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "promotions": [...],
    "isActive": true
  }
]
```

---

### GET `/api/venues/:venueId`
Get a specific venue with filtered promotions based on targeting.

**Response:**
```json
{
  "venue": {
    "_id": "venue_id",
    "name": "The Bar",
    "promotions": [
      {
        "title": "Happy Hour",
        "description": "50% off drinks",
        "targeting": {
          "followersOnly": false,
          "locationBased": true,
          "radiusMiles": 5
        }
      }
    ]
  }
}
```

---

### POST `/api/venues/:venueId/promotions`
Create a new promotion (venue owners only).

**Request Body:**
```json
{
  "title": "Happy Hour",
  "description": "50% off all drinks",
  "type": "happy-hour",
  "startTime": "2024-01-01T17:00:00Z",
  "endTime": "2024-01-01T19:00:00Z",
  "discount": 50,
  "isFlashDeal": true,
  "flashDealEndsAt": "2024-01-01T20:00:00Z",
  "pointsReward": 10,
  "targeting": {
    "followersOnly": false,
    "locationBased": true,
    "radiusMiles": 5,
    "userSegments": ["frequent", "vip"],
    "minCheckIns": 3,
    "timeBased": true,
    "timeWindow": {
      "start": "17:00",
      "end": "19:00"
    }
  }
}
```

**Targeting Options:**
- `followersOnly`: Only show to venue followers
- `locationBased`: Target users within radius
- `radiusMiles`: Radius in miles (default: 5)
- `userSegments`: Array of `["all", "frequent", "vip", "new"]`
- `minCheckIns`: Minimum check-ins required
- `timeBased`: Only show during time window
- `timeWindow`: `{ start: "17:00", end: "19:00" }`

---

## ✅ Check-in Endpoints

### POST `/api/checkins`
Check in at a venue.

**Request Body:**
```json
{
  "venueId": "venue_id",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "notes": "Great place!"
}
```

**Response:**
```json
{
  "message": "Checked in successfully!",
  "checkIn": { ... },
  "pointsEarned": 10,
  "totalPoints": 150,
  "streak": 5,
  "reward": "Streak bonus! 5 day streak!"
}
```

**Points System:**
- Base: 10 points per check-in
- Streak bonus: +2 points per day (max 50 bonus)
- Promotion bonus: Additional points if promotion has `pointsReward`

---

### GET `/api/checkins/history`
Get user's check-in history.

**Query Parameters:**
- `limit`: Number of results (default: 50)

**Response:**
```json
{
  "checkIns": [
    {
      "_id": "checkin_id",
      "venue": { "name": "The Bar" },
      "points": 10,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

### GET `/api/checkins/stats`
Get user's check-in statistics.

**Response:**
```json
{
  "totalCheckIns": 25,
  "uniqueVenues": 10,
  "totalPoints": 350,
  "currentPoints": 150,
  "streak": {
    "current": 5,
    "longest": 10
  },
  "favoriteVenues": 3
}
```

---

## 🏆 Loyalty Endpoints

### GET `/api/loyalty/venue/:venueId`
Get user's loyalty stats for a specific venue.

**Response:**
```json
{
  "checkInCount": 15,
  "tier": "gold",
  "streak": {
    "current": 3,
    "longest": 7
  },
  "badges": [],
  "totalSpent": 250.00
}
```

**Tiers:**
- Bronze: 0-1 check-ins
- Silver: 2-4 check-ins
- Gold: 5-9 check-ins
- Platinum: 10-19 check-ins
- VIP: 20+ check-ins

---

### GET `/api/loyalty/user`
Get user's overall loyalty stats across all venues.

**Response:**
```json
{
  "totalCheckIns": 50,
  "uniqueVenues": 15,
  "totalSpent": 500.00,
  "topVenues": [
    {
      "venue": { "name": "The Bar" },
      "checkInCount": 20,
      "tier": "vip"
    }
  ],
  "badges": []
}
```

---

### GET `/api/loyalty/venue/:venueId/leaderboard`
Get venue leaderboard.

**Query Parameters:**
- `limit`: Number of results (default: 20)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "profilePicture": "https://..."
      },
      "checkInCount": 25,
      "tier": "vip",
      "streak": { "current": 10, "longest": 15 }
    }
  ]
}
```

---

## 📰 Feed Endpoints

### GET `/api/feed`
Get social feed posts.

**Response:**
```json
{
  "posts": [
    {
      "_id": "post_id",
      "author": {
        "firstName": "John",
        "lastName": "Doe",
        "profilePicture": "https://..."
      },
      "content": "Having a great time!",
      "media": [
        { "type": "image", "url": "https://..." }
      ],
      "reactionCounts": {
        "❤️": { "count": 5, "users": [...] }
      },
      "userReaction": "❤️",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

### POST `/api/feed`
Create a new post.

**Request Body (multipart/form-data):**
```
content: "Having a great time!"
media: [files]
```

---

## 🔔 Notification Endpoints

### GET `/api/notifications`
Get user's notifications.

**Query Parameters:**
- `limit`: Number of results (default: 50)

**Response:**
```json
{
  "notifications": [
    {
      "_id": "notification_id",
      "type": "check_in",
      "content": "John checked in at The Bar",
      "read": false,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

### GET `/api/notifications/unread-count`
Get unread notification count.

**Response:**
```json
{
  "unreadCount": 5
}
```

---

### PUT `/api/notifications/:notificationId/read`
Mark notification as read.

---

## 🏢 Venue Follow Endpoints

### POST `/api/venue-follows/:venueId/follow`
Follow a venue.

### DELETE `/api/venue-follows/:venueId/follow`
Unfollow a venue.

### GET `/api/venue-follows/:venueId/follow-status`
Check if user is following a venue.

**Response:**
```json
{
  "isFollowing": true
}
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

**Common Status Codes:**
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

---

## 🔒 Rate Limits

- **General API**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **Payment endpoints**: 10 requests per hour per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## 📊 WebSocket Events

### Connection
```javascript
socket.emit('join-user-room', userId)
```

### Events Received

**New Notification:**
```javascript
socket.on('new-notification', (data) => {
  // data: { type, message, venueId }
})
```

**New Promotion:**
```javascript
socket.on('new-promotion', (data) => {
  // data: { venueId, promotion }
})
```

**Venue Updated:**
```javascript
socket.on('venue-updated', (data) => {
  // data: { venueId, venue }
})
```

---

## 🧪 Testing

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 3600,
  "mongodb": "connected"
}
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- All monetary amounts are in USD
- Location coordinates use decimal degrees (latitude, longitude)
- User IDs are MongoDB ObjectIds (24 character hex strings)
- JWT tokens expire after 7 days

---

## 🔗 Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Production Readiness](./PRODUCTION_READINESS.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)


