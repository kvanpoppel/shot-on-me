# Configuration Files Template

Copy these contents to your `.env` files:

## backend/.env

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database - MongoDB
MONGODB_URI=mongodb://localhost:27017/shotonme

# JWT Authentication Secret (Auto-generated)
JWT_SECRET=129831f2872adbeedbf19335b5a0d0d5cabd5bf93721c2b314441371adae85d8

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Twilio - SMS Notifications
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary - Media Uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe - Payment Processing (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

## shot-on-me/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
```

## venue-portal/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

