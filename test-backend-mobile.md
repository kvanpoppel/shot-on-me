# Testing Backend from Mobile Device

## Quick Steps

### 1. Find Your Computer's IP Address

**Windows:**
```powershell
ipconfig | findstr IPv4
```

**Mac/Linux:**
```bash
ifconfig | grep "inet "
# or
ip addr show | grep "inet "
```

Look for an IP address like:
- `192.168.1.100`
- `192.168.0.50`
- `10.0.0.5`

### 2. Ensure Backend is Running

Make sure your backend server is running:
```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
MongoDB connected
```

### 3. Test from Mobile Device

**On your mobile device's browser, open:**

1. **Health Check:**
   ```
   http://YOUR_IP:5000/api/health
   ```
   Example: `http://192.168.1.100:5000/api/health`
   
   **Expected Response:**
   ```json
   {
     "status": "OK",
     "database": "connected",
     "timestamp": "2025-12-XX...",
     "service": "Shot On Me API"
   }
   ```

2. **API Root:**
   ```
   http://YOUR_IP:5000/api
   ```
   Example: `http://192.168.1.100:5000/api`
   
   **Expected Response:**
   ```json
   {
     "message": "Shot On Me API",
     "status": "Running",
     "version": "1.0.0",
     "database": "Connected",
     ...
   }
   ```

### 4. Troubleshooting

**If you get "Connection Refused" or "Timeout":**

1. **Check Firewall:**
   - Windows: Allow port 5000 in Windows Firewall
   - Go to: Windows Security → Firewall → Advanced Settings
   - Add inbound rule for port 5000

2. **Check Network:**
   - Ensure mobile device is on the same Wi-Fi network
   - Try pinging your computer's IP from mobile

3. **Check Backend:**
   - Verify backend is running: `http://localhost:5000/api/health`
   - Check backend logs for errors

4. **Check IP Address:**
   - Make sure you're using the correct IP (not localhost)
   - Try both IPv4 addresses if multiple are shown

### 5. Test Mobile App Connection

Once backend is accessible, test the mobile app:
```
http://YOUR_IP:3001
```

The app should automatically detect the IP and connect to:
```
http://YOUR_IP:5000/api
```

Check browser console (mobile) for connection logs:
- Look for: `📱 Mobile device detected, using IP-based API URL`
- Look for: `🔌 Connecting Socket.io to: http://YOUR_IP:5000`


