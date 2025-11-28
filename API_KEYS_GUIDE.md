# API Keys Configuration Guide

This guide explains all the API keys you need and how to configure them.

## 🔑 Required API Keys

### 1. **Google Maps API** ✅ (You provided this!)
**Key:** `AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8`

**What it's for:**
- Location tracking and friend discovery map
- Nearby venues display
- Interactive map in the Shot On Me app

**Where to use it:**
- `shot-on-me/.env.local` → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

**How to get it (if you need a new one):**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable "Maps JavaScript API"
4. Create credentials → API Key
5. Restrict the key to your domain (for production)

---

### 2. **Twilio** (SMS Notifications) ⚠️ REQUIRED
**What it's for:**
- Sending SMS notifications when users receive money
- Sending redemption codes via text
- Venue notifications to customers

**What you need:**
- Account SID
- Auth Token
- Phone Number (Twilio phone number)

**Where to use it:**
- `backend/.env` → `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

**How to get it:**
1. Sign up at [Twilio.com](https://www.twilio.com/)
2. Get a free trial account (includes $15 credit)
3. Go to Console → Get your Account SID and Auth Token
4. Get a phone number from Twilio

**Cost:** ~$0.0075 per SMS (very affordable)

---

### 3. **Cloudinary** (Media Uploads) ⚠️ REQUIRED
**What it's for:**
- Uploading photos to the social feed
- Uploading videos
- Image optimization and storage

**What you need:**
- Cloud Name
- API Key
- API Secret

**Where to use it:**
- `backend/.env` → `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**How to get it:**
1. Sign up at [Cloudinary.com](https://cloudinary.com/)
2. Free tier includes 25GB storage
3. Go to Dashboard → Copy your credentials

**Cost:** Free tier is generous for starting out

---

### 4. **MongoDB** (Database) ⚠️ REQUIRED
**What it's for:**
- Storing all app data (users, payments, venues, posts)

**What you need:**
- MongoDB connection string (URI)

**Where to use it:**
- `backend/.env` → `MONGODB_URI`

**Options:**
1. **Local MongoDB:** `mongodb://localhost:27017/shotonme`
2. **MongoDB Atlas (Cloud - Recommended):**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Get connection string

**Cost:** Free tier available (512MB storage)

---

### 5. **JWT Secret** (Authentication) ⚠️ REQUIRED
**What it's for:**
- Securing user authentication tokens
- Session management

**What you need:**
- A random secret string (you create this)

**Where to use it:**
- `backend/.env` → `JWT_SECRET`

**How to create:**
- Use any random string (at least 32 characters)
- Example: `my-super-secret-jwt-key-2024-change-this-in-production`

**Cost:** Free (you create it yourself)

---

### 6. **Stripe** (Payment Processing) ⚠️ OPTIONAL
**What it's for:**
- Processing actual credit card payments
- Adding money to wallet
- Withdrawing funds

**What you need:**
- Secret Key (starts with `sk_`)
- Publishable Key (starts with `pk_`)

**Where to use it:**
- `backend/.env` → `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

**How to get it:**
1. Sign up at [Stripe.com](https://stripe.com/)
2. Go to Developers → API Keys
3. Use test keys for development

**Cost:** 2.9% + $0.30 per transaction (only when processing payments)

---

## 📝 Quick Setup Checklist

### Backend `.env` file:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/shotonme
# OR MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/shotonme

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend
FRONTEND_URL=http://localhost:3000

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary (Media)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe (Optional - for payment processing)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### Shot On Me `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
```

### Venue Portal `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🚀 Priority Order

1. **MongoDB** - Required to run the app
2. **JWT Secret** - Required for authentication
3. **Google Maps** - Already have it! ✅
4. **Twilio** - Required for SMS features
5. **Cloudinary** - Required for photo/video uploads
6. **Stripe** - Optional, only if processing real payments

---

## 💡 Development vs Production

### For Development:
- Use free tiers where possible
- Use test API keys (Stripe test mode)
- Local MongoDB or free Atlas cluster

### For Production:
- Restrict API keys to your domain
- Use production Stripe keys
- Set up MongoDB Atlas with proper security
- Use environment-specific secrets
- Enable HTTPS

---

## 🔒 Security Tips

1. **Never commit `.env` files to Git** (already in `.gitignore`)
2. **Use different keys for dev/production**
3. **Restrict API keys** to specific domains/IPs
4. **Rotate keys** if compromised
5. **Use strong JWT secrets** (32+ characters, random)

---

## ❓ Need Help?

- **Twilio:** [Twilio Docs](https://www.twilio.com/docs)
- **Cloudinary:** [Cloudinary Docs](https://cloudinary.com/documentation)
- **Google Maps:** [Google Maps API Docs](https://developers.google.com/maps/documentation)
- **MongoDB:** [MongoDB Docs](https://docs.mongodb.com/)
- **Stripe:** [Stripe Docs](https://stripe.com/docs)

