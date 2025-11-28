# 📱 Access Shot On Me on Your Phone

## ✅ FIXED: Backend Connection Issue

The app now **automatically detects** your IP address when accessed from a phone. You no longer need to configure anything!

## Quick Setup

### Step 1: Start the Backend Server
**IMPORTANT:** The backend must be running for the app to work!

```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
npm start
```

Wait for: `🚀 Server running on http://localhost:5000`
And: `🌐 Network access: http://192.168.4.24:5000`

### Step 2: Start the Frontend Server
```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me
npm start
```

Wait for: `✓ Ready in X.Xs` and `Local: http://localhost:3001`

**Your computer's IP address:** **192.168.4.24**

### Step 3: Access on Your Phone

**On your phone's browser, go to:**
```
http://192.168.4.24:3001
```

**Important:** 
- Make sure your phone is on the **same Wi-Fi network** as your computer
- Use the IP address `192.168.4.24:3001` (NOT localhost)

### Step 4: Install as App

**Android (Chrome):**
1. Open `http://192.168.4.24:3001` in Chrome
2. Tap menu (3 dots) → "Add to Home screen" or "Install app"
3. Confirm installation

**iOS (Safari):**
1. Open `http://192.168.4.24:3001` in Safari
2. Tap Share button → "Add to Home Screen"
3. Customize name if needed → "Add"

## Troubleshooting

### "Backend not running" Error?

**This means the backend server is not started!**

1. **Start the backend:**
   ```powershell
   cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
   npm start
   ```

2. **Verify backend is running:**
   - Should see: `🚀 Server running on http://localhost:5000`
   - Should see: `🌐 Network access: http://192.168.4.24:5000`

3. **Check if backend is accessible:**
   - On your computer, open: `http://localhost:5000/api/health`
   - Should return: `{"status":"ok"}`
   - On your phone, try: `http://192.168.4.24:5000/api/health`

### Can't Connect to Frontend?

1. **Check Firewall:**
   - Windows may block the connection
   - Go to Windows Defender Firewall → Allow an app
   - Allow Node.js through firewall (for both ports 3001 and 5000)

2. **Verify Same Network:**
   - Phone and computer must be on same Wi-Fi
   - Check phone's Wi-Fi settings

3. **Check Both Servers are Running:**
   - Backend: `http://localhost:5000` should work
   - Frontend: `http://localhost:3001` should work
   - Both must be running!

4. **Verify IP Address:**
   - Run: `ipconfig` in PowerShell
   - Look for "IPv4 Address" under your Wi-Fi adapter
   - Use that IP instead of 192.168.4.24 if different

### Still Not Working?

1. **Disable Windows Firewall Temporarily** (for testing only)
2. **Check Router Settings** - Some routers block device-to-device communication
3. **Use Mobile Hotspot** - Create hotspot on phone, connect computer to it
4. **Try Different Port** - Change port in package.json if 3001 is blocked

## Alternative: Use ngrok (For Testing)

If local network doesn't work, use ngrok for a public URL:

1. Install ngrok: https://ngrok.com/download
2. Run: `ngrok http 3001`
3. Use the ngrok URL on your phone (works from anywhere)

---

**Your app URL:** `http://192.168.4.24:3001`

