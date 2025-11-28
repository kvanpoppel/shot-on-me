# Accessing Your App from Other Devices

## Quick Answer
**No**, `localhost` only works on the same computer. To access from phones/other computers, use your computer's **local IP address** instead.

## Your Local IP Address
Your computer's local IP address is: **192.168.4.24**

## How to Access from Other Devices

### Prerequisites
1. **All devices must be on the same Wi-Fi network**
2. **Windows Firewall** must allow connections (see below)

### URLs to Use

Instead of:
- ❌ `http://localhost:3000` (Venue Portal)
- ❌ `http://localhost:3001` (Shot On Me)
- ❌ `http://localhost:5000` (Backend API)

Use:
- ✅ `http://192.168.4.24:3000` (Venue Portal)
- ✅ `http://192.168.4.24:3001` (Shot On Me)
- ✅ `http://192.168.4.24:5000` (Backend API)

### Update Environment Variables

You'll need to update your `.env` files to use the IP address:

#### Backend (`backend/.env`)
```env
FRONTEND_URL=http://192.168.4.24:3000,http://192.168.4.24:3001
```

#### Venue Portal (`venue-portal/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://192.168.4.24:5000/api
```

#### Shot On Me (`shot-on-me/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://192.168.4.24:5000/api
```

### Windows Firewall Configuration

1. **Open Windows Defender Firewall**:
   - Press `Win + R`, type `wf.msc`, press Enter

2. **Allow Node.js through Firewall**:
   - Click "Inbound Rules" → "New Rule"
   - Select "Program" → Browse to your Node.js executable
   - Allow the connection for all profiles
   - Name it "Node.js Development"

   OR

3. **Quick Method - Allow Ports**:
   - Run PowerShell as Administrator
   - Execute these commands:
   ```powershell
   New-NetFirewallRule -DisplayName "Node.js Dev Server" -Direction Inbound -LocalPort 3000,3001,5000 -Protocol TCP -Action Allow
   ```

### Testing

1. **On your computer**: Start all servers as usual
2. **On your phone/other device**:
   - Make sure it's on the same Wi-Fi network
   - Open browser and go to:
     - `http://192.168.4.24:3000` (Venue Portal)
     - `http://192.168.4.24:3001` (Shot On Me)

### Troubleshooting

**Can't connect?**
1. ✅ Check all devices are on the same Wi-Fi
2. ✅ Verify Windows Firewall allows connections
3. ✅ Make sure servers are running
4. ✅ Try pinging your computer from the other device:
   - On phone: Use a network scanner app
   - On another computer: `ping 192.168.4.24`

**IP Address Changed?**
- Your IP might change if you reconnect to Wi-Fi
- Find your new IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Look for "IPv4 Address" under your Wi-Fi adapter

**Still Not Working?**
- Check if your router has "AP Isolation" enabled (disables device-to-device communication)
- Some corporate/public Wi-Fi networks block device-to-device connections

### Security Note

⚠️ **Development Only**: This setup is for local development. For production, use proper hosting (Vercel, Railway, etc.) with HTTPS.

