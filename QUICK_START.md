# 🚀 Quick Start Guide

## Step 1: Set Up Backend

1. Navigate to backend folder:
```bash
cd backend
```

2. Copy the example env file:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# Or manually create .env file
```

3. Edit `.env` and add your API keys:
   - **MongoDB URI** (use local or MongoDB Atlas)
   - **JWT Secret** (create a random string)
   - **Twilio credentials** (for SMS)
   - **Cloudinary credentials** (for media)

4. Install and run:
```bash
npm install
npm run dev
```

Backend will run on `http://localhost:5000`

---

## Step 2: Set Up Venue Portal

1. Navigate to venue-portal folder:
```bash
cd venue-portal
```

2. Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. Install and run:
```bash
npm install
npm run dev
```

Venue Portal will run on `http://localhost:3000`

---

## Step 3: Set Up Shot On Me App

1. Navigate to shot-on-me folder:
```bash
cd shot-on-me
```

2. Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
```

3. Install and run:
```bash
npm install
npm run dev
```

App will run on `http://localhost:3001` (or next available port)

---

## ✅ What You Need

### Already Have:
- ✅ **Google Maps API Key** - Already configured!

### Still Need (in order of priority):

1. **MongoDB** (REQUIRED)
   - Option A: Install MongoDB locally
   - Option B: Use MongoDB Atlas (free tier)
   - Update `backend/.env` → `MONGODB_URI`

2. **JWT Secret** (REQUIRED)
   - Create any random string (32+ characters)
   - Update `backend/.env` → `JWT_SECRET`

3. **Twilio** (REQUIRED for SMS features)
   - Sign up: https://www.twilio.com/
   - Free trial includes $15 credit
   - Get Account SID, Auth Token, Phone Number
   - Update `backend/.env` → Twilio section

4. **Cloudinary** (REQUIRED for photo/video uploads)
   - Sign up: https://cloudinary.com/
   - Free tier includes 25GB
   - Get Cloud Name, API Key, API Secret
   - Update `backend/.env` → Cloudinary section

5. **Stripe** (OPTIONAL - only if processing payments)
   - Sign up: https://stripe.com/
   - Get test keys for development
   - Update `backend/.env` → Stripe section

---

## 🧪 Test It Out

1. **Backend Health Check:**
   - Visit: http://localhost:5000/api/health
   - Should see: `{"status":"ok","timestamp":"..."}`

2. **Venue Portal:**
   - Visit: http://localhost:3000
   - Register as venue owner
   - Explore dashboard

3. **Shot On Me App:**
   - Visit: http://localhost:3001
   - Register as user
   - Try wallet, feed, map features

---

## 📚 More Help

- **API Keys Guide:** See `API_KEYS_GUIDE.md`
- **Full Setup:** See `SETUP.md`
- **Project Summary:** See `PROJECT_SUMMARY.md`

---

## 💡 Pro Tips

1. Start with MongoDB and JWT Secret (minimum to run)
2. Add Twilio when testing SMS features
3. Add Cloudinary when testing photo uploads
4. Add Stripe only when ready for real payments

The app will work without Twilio/Cloudinary/Stripe, but those features won't function until configured.

