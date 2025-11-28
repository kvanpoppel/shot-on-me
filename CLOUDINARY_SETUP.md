# Cloudinary Setup for Shot On Me

## Error: "Invalid cloud_name shot-on-me"

This error occurs when Cloudinary environment variables are not set correctly in Render.

## How to Fix

### Step 1: Get Your Cloudinary Credentials

1. Go to [Cloudinary Console](https://console.cloudinary.com/)
2. Sign in or create a free account
3. Once logged in, you'll see your **Dashboard**
4. On the dashboard, you'll find:
   - **Cloud Name** (e.g., `dxyz123abc` - NOT "shot-on-me")
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### Step 2: Add Environment Variables in Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your **shot-on-me** web service
3. Click on **"Environment"** in the left sidebar
4. Click **"Add Environment Variable"** for each of these:

   **Variable 1:**
   - **Key:** `CLOUDINARY_CLOUD_NAME`
   - **Value:** Your actual Cloudinary cloud name (from Step 1)
   - **Example:** `dxyz123abc`
   - ⚠️ **NOT** "shot-on-me" - use your actual cloud name!

   **Variable 2:**
   - **Key:** `CLOUDINARY_API_KEY`
   - **Value:** Your Cloudinary API Key (from Step 1)
   - **Example:** `123456789012345`

   **Variable 3:**
   - **Key:** `CLOUDINARY_API_SECRET`
   - **Value:** Your Cloudinary API Secret (from Step 1)
   - **Example:** `abcdefghijklmnopqrstuvwxyz123456`

5. Click **"Save Changes"** after adding all three variables

### Step 3: Redeploy

After adding the environment variables, Render will automatically redeploy your service. This takes 2-3 minutes.

### Step 4: Verify

Once redeployed, try uploading a profile picture again. The error should be gone!

## Important Notes

- The **Cloud Name** is NOT "shot-on-me" - it's your unique Cloudinary cloud name
- All three environment variables are required
- The API Secret should be kept private (never commit it to Git)
- Free Cloudinary accounts include 25GB storage and 25GB monthly bandwidth

## Troubleshooting

If you still get errors after setting the variables:

1. **Check the variable names** - they must be exactly:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

2. **Check for typos** - make sure you copied the values correctly from Cloudinary

3. **Wait for redeploy** - Render needs to restart the service for new environment variables to take effect

4. **Check Render logs** - Go to your Render service → "Logs" to see if there are any other errors


