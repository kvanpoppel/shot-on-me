# 📱 Setting Up www.shotonme.com on Mobile Device

## Option 1: Use DNS Override App (Easiest - No Root/Jailbreak)

### For Android:
1. Install **"DNS Override"** or **"Private DNS"** app from Play Store
2. Add entry: `www.shotonme.com` → `10.100.160.100`
3. Enable the DNS override
4. Open browser and go to: `http://www.shotonme.com:3001`

### For iOS:
1. Install **"DNS Override"** or use **"AdGuard"** app
2. Add custom DNS entry: `www.shotonme.com` → `10.100.160.100`
3. Enable the override
4. Open Safari and go to: `http://www.shotonme.com:3001`

## Option 2: Modify Router DNS (If You Have Access)

If you have access to your router's admin panel:
1. Log into your router (usually `192.168.1.1` or `192.168.0.1`)
2. Find "DNS" or "Hosts" settings
3. Add entry: `www.shotonme.com` → `10.100.160.100`
4. All devices on your network will now resolve the domain

## Option 3: Use Local DNS Server (Advanced)

Set up a local DNS server like Pi-hole or dnsmasq on your network.

## Option 4: Use IP with Domain Detection (Current Setup)

The app already detects when accessed via IP and works correctly. You can bookmark:
- `http://10.100.160.100:3001` as "Shot On Me" on your phone

## Quick Test

After setting up DNS override:
1. Open mobile browser
2. Go to: `http://www.shotonme.com:3001`
3. The app should load and work normally

