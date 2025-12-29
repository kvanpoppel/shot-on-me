# 📱 Mobile Device Access Guide

## Quick Setup

Your app is already configured for mobile access! Here's how to use it:

### 1. Find Your Computer's IP Address

Run this command in PowerShell:
```powershell
.\get-local-ip.ps1
```

Or manually find it:
- Open PowerShell
- Run: `ipconfig`
- Look for "IPv4 Address" under your active network adapter (usually WiFi or Ethernet)
- It will look like: `192.168.1.100` or `10.0.0.5`

### 2. Make Sure Servers Are Running

Both servers must be running and accessible:

**Backend (Port 5000):**
- Should show: `🚀 Server running on 0.0.0.0:5000`
- Must be listening on `0.0.0.0` (not just `localhost`)

**Frontend (Port 3001):**
- Should show: `✓ Ready` and `Local: http://0.0.0.0:3001`
- Must be listening on `0.0.0.0` (not just `localhost`)

### 3. Connect Your Mobile Device

1. **Connect to the same WiFi network** as your computer
2. **Open your mobile browser** (Chrome, Safari, etc.)
3. **Navigate to:** `http://YOUR_IP_ADDRESS:3001`
   - Example: `http://192.168.1.100:3001`

### 4. The App Will Auto-Detect

The app automatically detects when you're accessing via IP address and:
- ✅ Connects to the backend at the same IP address
- ✅ Uses the correct Socket.io URL
- ✅ Works exactly like on desktop

## Troubleshooting

### "Can't connect" or "Connection refused"

**Check Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Firewall"
3. Make sure Node.js is allowed for both Private and Public networks
4. Or temporarily disable firewall to test (not recommended for production)

**Check Network:**
- Both devices must be on the **same WiFi network**
- Make sure your computer's WiFi isn't set to "Public" (should be "Private")
- Try pinging your computer's IP from your phone

**Check Servers:**
- Backend must show: `Server running on 0.0.0.0:5000`
- Frontend must show: `Local: http://0.0.0.0:3001`
- If they show `localhost` instead, they won't be accessible from mobile

### "API calls failing" or "Socket.io not connecting"

The app automatically detects IP addresses and adjusts API URLs. If you see errors:
1. Check browser console on mobile (use remote debugging)
2. Verify the IP address is correct
3. Make sure backend CORS allows your IP address (it should automatically)

### Test Connection

From your phone's browser, try:
- `http://YOUR_IP:5000/api/health` - Should return `{"status":"ok"}`
- `http://YOUR_IP:3001` - Should load the app

## Pro Tips

1. **Bookmark the IP address** on your phone for easy access
2. **Use a static IP** on your computer to avoid changing the address
3. **Install as PWA** - The app can be installed on your phone's home screen
4. **Use Chrome DevTools** - Connect your phone for debugging:
   - Chrome → `chrome://inspect`
   - Enable "Discover USB devices"
   - Connect phone via USB

## Security Note

⚠️ **Development Only**: This setup is for local development. In production, use HTTPS and proper domain names.
