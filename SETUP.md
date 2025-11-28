# Shot On Me & Venue Portal - Complete Setup Guide

This guide will help you set up the entire project from scratch.

## Prerequisites

- Node.js 18+ installed
- MongoDB installed (or MongoDB Atlas account)
- Git installed

## Project Structure

```
shot-on-me-venue-portal/
├── backend/          # Express.js API server
├── venue-portal/     # Next.js web app for venue owners
└── shot-on-me/       # Next.js mobile app for users
```

## Step 1: Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
# Copy the example file
cp .env.example .env
```

4. Edit `.env` with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/shotonme
JWT_SECRET=your-super-secret-jwt-key-change-this
FRONTEND_URL=http://localhost:3000

# Twilio (for SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary (for media uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe (for payments - optional for now)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

5. Start MongoDB (if running locally):
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Or use MongoDB Atlas (recommended for production)
```

6. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

## Step 2: Venue Portal Setup

1. Open a new terminal and navigate to venue-portal:
```bash
cd venue-portal
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The venue portal will run on `http://localhost:3000`

## Step 3: Shot On Me App Setup

1. Open another terminal and navigate to shot-on-me:
```bash
cd shot-on-me
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
MAPBOX_TOKEN=your_mapbox_token_here
```

4. Start the development server:
```bash
npm run dev
```

The app will run on `http://localhost:3001` (or next available port)

## Step 4: Testing the Setup

### Test Backend
Visit: `http://localhost:5000/api/health`
Should return: `{"status":"ok","timestamp":"..."}`

### Test Venue Portal
1. Visit: `http://localhost:3000`
2. Register as a venue owner
3. Login and explore the dashboard

### Test Shot On Me App
1. Visit: `http://localhost:3001`
2. Register as a user
3. Explore the wallet, feed, and map features

## Key Features Implemented

### Venue Portal
✅ User authentication
✅ Dashboard with statistics
✅ Promotions management (happy hours, events, specials)
✅ Operating schedule management
✅ Notification system
✅ Beautiful, modern UI

### Shot On Me App
✅ User authentication
✅ Wallet system with balance tracking
✅ Send money to friends (via phone number)
✅ SMS notifications (no app required)
✅ Redemption code system
✅ Social feed (Facebook-style)
✅ Location tracking
✅ Friend discovery
✅ Nearby venues

### Backend API
✅ RESTful API with Express.js
✅ MongoDB database
✅ JWT authentication
✅ Real-time updates (WebSocket)
✅ Payment system with escrow
✅ SMS integration (Twilio)
✅ Media uploads (Cloudinary ready)

## Next Steps

1. **Configure Twilio** for SMS notifications
2. **Set up Cloudinary** for media uploads
3. **Configure Stripe** for payment processing
4. **Set up MongoDB Atlas** for production database
5. **Deploy** to production (Vercel for frontend, Heroku/Railway for backend)

## Development Tips

- Use MongoDB Compass to view your database
- Check browser console for API errors
- Use Postman/Insomnia to test API endpoints
- Enable CORS for local development
- Use environment variables for all secrets

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check your `MONGODB_URI` in `.env`
- Try using MongoDB Atlas if local setup fails

### Port Already in Use
- Change the port in `.env` or `package.json`
- Kill the process using the port: `lsof -ti:5000 | xargs kill`

### CORS Errors
- Make sure `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check that CORS middleware is enabled in `server.js`

## Production Deployment

1. Set `NODE_ENV=production` in all `.env` files
2. Use MongoDB Atlas for database
3. Set up proper JWT secrets
4. Configure production URLs
5. Enable HTTPS
6. Set up monitoring and logging

## Support

For issues or questions, check the individual README files in each directory:
- `backend/README.md`
- `venue-portal/README.md`
- `shot-on-me/README.md`

