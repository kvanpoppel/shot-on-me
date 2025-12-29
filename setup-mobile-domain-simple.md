# 📱 Using www.shotonme.com on Mobile Device

## Quick Setup

To use `www.shotonme.com` on your mobile device instead of the IP address:

### Step 1: Set Up DNS Override on Your Phone

**For Android:**
1. Install **"DNS Override"** app from Play Store (or similar DNS app)
2. Add entry: `www.shotonme.com` → `10.100.160.100`
3. Enable the DNS override
4. The app will now resolve `www.shotonme.com` to your computer's IP

**For iOS:**
1. Install **"DNS Override"** or **"AdGuard"** app
2. Add custom DNS entry: `www.shotonme.com` → `10.100.160.100`
3. Enable the override

### Step 2: Access the App

1. Open your mobile browser
2. Go to: `http://www.shotonme.com:3001`
3. The app will automatically:
   - Detect the IP address (from DNS resolution)
   - Connect to backend at the same IP
   - Work exactly like on desktop!

## How It Works

When you access `www.shotonme.com:3001` on mobile:
1. DNS override resolves `www.shotonme.com` → `10.100.160.100`
2. Browser loads the app from `10.100.160.100:3001`
3. App detects the IP address in `window.location.hostname`
4. App automatically connects backend to `10.100.160.100:5000`
5. Everything works seamlessly!

## Alternative: Router DNS (If You Have Access)

If you have router admin access:
1. Log into router (usually `192.168.1.1`)
2. Find "DNS" or "Hosts" settings
3. Add: `www.shotonme.com` → `10.100.160.100`
4. All devices on your network will resolve the domain

## Test It

After setting up DNS override:
1. Open mobile browser
2. Go to: `http://www.shotonme.com:3001`
3. App should load and work normally!

