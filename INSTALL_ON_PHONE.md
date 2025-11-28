# 📱 How to Install Shot On Me on Your Phone

## Quick Steps

### Step 1: Start the Servers

**Open PowerShell and run these commands:**

```powershell
# Terminal 1: Start Backend
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
npm start
```

Wait until you see: `🚀 Server running on http://localhost:5000`

```powershell
# Terminal 2: Start Frontend (in a NEW PowerShell window)
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me
npm start
```

Wait until you see: `✓ Ready` and `Local: http://localhost:3001`

### Step 2: Find Your Computer's IP Address

**In PowerShell, run:**
```powershell
ipconfig
```

**Look for "IPv4 Address"** under your Wi-Fi adapter. It will look like:
- `192.168.1.XXX` or
- `192.168.4.XXX` or
- `10.0.0.XXX`

**Write this down!** (Example: `192.168.4.24`)

### Step 3: Connect Your Phone

**Important:** Your phone must be on the **same Wi-Fi network** as your computer!

1. On your phone, open your browser (Chrome for Android, Safari for iOS)
2. Type in the address bar:
   ```
   http://YOUR_IP_ADDRESS:3001
   ```
   (Replace `YOUR_IP_ADDRESS` with the IP you found in Step 2)
   
   Example: `http://192.168.4.24:3001`

3. The app should load! You should see the login screen.

### Step 4: Install as App

#### **Android (Chrome):**

1. Once the app loads, tap the **menu button** (3 dots) in the top right
2. Look for **"Add to Home screen"** or **"Install app"**
3. Tap it
4. Confirm by tapping **"Add"** or **"Install"**
5. The app icon will appear on your home screen!

#### **iOS (Safari):**

1. Once the app loads, tap the **Share button** (square with arrow) at the bottom
2. Scroll down and tap **"Add to Home Screen"**
3. You can customize the name if you want
4. Tap **"Add"** in the top right
5. The app icon will appear on your home screen!

### Step 5: Open the App

Tap the **Shot On Me** icon on your home screen. It will open like a native app!

---

## 🎉 That's It!

You now have Shot On Me installed on your phone! It will work just like a regular app.

---

## ❌ Troubleshooting

### "Can't connect" or "Site can't be reached"

**Check these:**

1. ✅ **Both servers are running?** 
   - Backend should show: `Server running on http://localhost:5000`
   - Frontend should show: `Ready` and `Local: http://localhost:3001`

2. ✅ **Same Wi-Fi network?**
   - Phone and computer must be on the same Wi-Fi
   - Check your phone's Wi-Fi settings

3. ✅ **Correct IP address?**
   - Run `ipconfig` again to double-check
   - Make sure you're using the IPv4 address (not IPv6)

4. ✅ **Windows Firewall blocking?**
   - Windows may be blocking the connection
   - Go to: Windows Settings → Privacy & Security → Windows Security → Firewall
   - Click "Allow an app through firewall"
   - Make sure Node.js is allowed (or temporarily disable firewall for testing)

### "Add to Home Screen" option not showing?

**Try these:**

1. ✅ **Clear browser cache** and reload the page
2. ✅ **Make sure you're using the IP address** (not localhost)
3. ✅ **Wait a few seconds** after the page loads
4. ✅ **Try a different browser** (Chrome for Android, Safari for iOS)

### App icon looks generic?

The app icons need to be generated. The app will still work, but you can add custom icons later.

---

## 💡 Pro Tips

- **Keep both servers running** while using the app
- **Bookmark the IP address** for easy access later
- The app works **offline** for viewing cached content
- **Close and reopen** the app if something seems stuck

---

## 🚀 Next Steps

Once installed:
1. Create an account or log in
2. Start sending money to friends!
3. Post photos and videos
4. Discover venues nearby
5. Check in at your favorite spots

**Enjoy your Shot On Me app! 🎉**

