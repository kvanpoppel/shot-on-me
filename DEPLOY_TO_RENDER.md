# Deploy Backend to Render - Step by Step

## Prerequisites
✅ You have a Render account
✅ Your code is in a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Repository

1. **Make sure your code is committed and pushed to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push
   ```

## Step 2: Create Web Service on Render

1. **Log into Render Dashboard:** https://dashboard.render.com
2. **Click "New +" → "Web Service"**
3. **Connect your repository:**
   - If first time: Click "Connect account" and authorize Render
   - Select your repository: `shot-on-me-venue-portal`
   - Click "Connect"

4. **Configure the service:**
   - **Name:** `shot-on-me-backend` (or your preferred name)
   - **Region:** Choose closest to your users (e.g., `Oregon (US West)`)
   - **Branch:** `main` (or `master`)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

5. **Click "Advanced" and add:**
   - **Node Version:** `18` or `20` (check your local version: `node -v`)

## Step 3: Add Environment Variables

Click "Environment" tab and add these variables:

### Required Variables:
```env
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_strong_jwt_secret_here
FRONTEND_URL=https://www.shotonme.com,https://portal.shotonme.com
```

### API Keys (Add your actual values):
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

**Important Notes:**
- Render uses port `10000` by default (or check what Render assigns)
- Use your **production** MongoDB Atlas connection string
- Generate a new, strong JWT_SECRET for production (different from dev)
- Use **production** Stripe keys (not test keys)

## Step 4: Deploy

1. **Click "Create Web Service"**
2. **Render will:**
   - Clone your repository
   - Install dependencies
   - Start your server
3. **Wait for deployment** (usually 2-5 minutes)
4. **Check logs** to ensure it started successfully

## Step 5: Get Your Backend URL

After deployment, Render will provide a URL like:
- `https://shot-on-me-backend.onrender.com`

**Save this URL** - you'll need it for frontend deployments!

## Step 6: Test Your Backend

1. **Health Check:**
   ```
   https://your-backend-url.onrender.com/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test API:**
   ```
   https://your-backend-url.onrender.com/api/auth/register
   ```
   (This should return an error about missing data, which is expected)

## Step 7: Configure Custom Domain (Optional)

1. In Render dashboard → Your service → Settings
2. Scroll to "Custom Domains"
3. Add: `api.shotonme.com`
4. Render will provide DNS instructions
5. Add CNAME record in GoDaddy pointing to Render's provided value

## Troubleshooting

**Build fails?**
- Check logs in Render dashboard
- Ensure `package.json` has correct `start` script
- Verify Node version matches

**Server won't start?**
- Check environment variables are set correctly
- Verify MongoDB connection string is correct
- Check logs for specific error messages

**CORS errors?**
- Make sure `FRONTEND_URL` includes your production domains
- Check backend CORS configuration allows your domains

## Next Steps

Once backend is deployed:
1. ✅ Note your backend URL
2. ✅ Test the health endpoint
3. ✅ Proceed to deploy frontends to Vercel (see `DEPLOY_TO_VERCEL.md`)

