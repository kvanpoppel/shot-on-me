# App Diagnostic & Fix Guide

**Checking for Errors and Missing Components**

---

## ✅ SERVICES STARTED

I've opened 4 PowerShell windows:
1. **Backend** - Port 5000
2. **Shot On Me App** - Port 3001  
3. **Venue Portal** - Port 3000
4. **Owner Portal** - Port 3002

**Check each window for:**
- ✅ "Server running on port XXXX"
- ✅ "Connected to MongoDB"
- ❌ Any error messages

---

## 🔍 COMMON ERRORS TO CHECK

### 1. Missing Dependencies

**Check each service:**
```powershell
# In each PowerShell window, if you see "Cannot find module" errors:
cd backend  # or shot-on-me, venue-portal, owner-portal
npm install
```

### 2. Environment Variables Missing

**Backend (.env file needed):**
- `MONGODB_URI`
- `JWT_SECRET`
- `PORT=5000`
- `TWILIO_ACCOUNT_SID` (optional)
- `TWILIO_AUTH_TOKEN` (optional)
- `TWILIO_PHONE_NUMBER` (optional)
- `STRIPE_SECRET_KEY` (optional)
- `STRIPE_PUBLISHABLE_KEY` (optional)

**Shot On Me (.env.local needed):**
- `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

**Venue Portal (.env.local needed):**
- `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

**Owner Portal (.env.local needed):**
- `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

### 3. Port Already in Use

**If you see "Port XXXX already in use":**
```powershell
# Find what's using the port
netstat -ano | findstr :5000
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :3002

# Kill the process (replace PID with actual number)
taskkill /PID <PID_NUMBER> /F
```

### 4. MongoDB Connection Issues

**If backend shows MongoDB errors:**
- Check `MONGODB_URI` in `backend/.env`
- Verify MongoDB Atlas connection string is correct
- Check if IP is whitelisted in MongoDB Atlas

### 5. Import Errors

**Common import issues:**
- Missing `@/app/types` - Check if `types.ts` exists
- Missing components - Check if component files exist
- Missing contexts - Check if context files exist

---

## 📋 COMPONENT CHECKLIST

### Shot On Me App Components (All Present ✅)

- ✅ LoginScreen.tsx
- ✅ Dashboard.tsx
- ✅ BottomNav.tsx
- ✅ FeedTab.tsx
- ✅ WalletTab.tsx
- ✅ MapTab.tsx
- ✅ ProfileTab.tsx
- ✅ HomeTab.tsx
- ✅ MessagesTab.tsx
- ✅ GroupChatsTab.tsx
- ✅ FriendProfile.tsx
- ✅ ProximityNotifications.tsx
- ✅ PermissionsManager.tsx
- ✅ TonightTab.tsx
- ✅ BadgesScreen.tsx
- ✅ LeaderboardsScreen.tsx
- ✅ RewardsScreen.tsx
- ✅ ReferralScreen.tsx
- ✅ MyVenuesTab.tsx
- ✅ ErrorBoundary.tsx
- ✅ types.ts

### Contexts (All Present ✅)

- ✅ AuthContext.tsx
- ✅ SocketContext.tsx
- ✅ Providers.tsx
- ✅ AppWrapper.tsx

### Utils (All Present ✅)

- ✅ api.ts

---

## 🔧 QUICK FIXES

### Fix 1: Install All Dependencies

```powershell
# Backend
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
npm install

# Shot On Me
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me
npm install

# Venue Portal
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\venue-portal
npm install

# Owner Portal
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\owner-portal
npm install
```

### Fix 2: Check Environment Files

**Backend .env:**
```env
MONGODB_URI=mongodb+srv://katevanpoppel_db_user:ws0HmJskZzm6yvtW@cluster0.uoylpxu.mongodb.net/shotonme?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
PORT=5000
NODE_ENV=development
```

**Shot On Me .env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
```

**Venue Portal .env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Owner Portal .env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Fix 3: Clear Cache and Restart

```powershell
# Stop all services (Ctrl+C in each window)

# Clear Next.js cache
cd shot-on-me
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

cd ..\venue-portal
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

cd ..\owner-portal
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Restart all services
cd ..
.\start-all.ps1
```

---

## 🐛 SPECIFIC ERRORS TO LOOK FOR

### Error: "Cannot find module '@/app/types'"
**Fix:** Check `tsconfig.json` has correct path mapping:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./app/*"]
    }
  }
}
```

### Error: "Module not found: Can't resolve 'xyz'"
**Fix:** Run `npm install` in that directory

### Error: "Hydration error" or "#310"
**Fix:** Already addressed in previous fixes, but check:
- `suppressHydrationWarning` on html/body tags
- `isMounted` checks in components
- No SSR for dynamic content

### Error: "API connection failed"
**Fix:** 
- Check backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` in .env.local
- Check CORS is enabled in backend

### Error: "MongoDB connection failed"
**Fix:**
- Check `MONGODB_URI` in backend/.env
- Verify connection string is correct
- Check MongoDB Atlas IP whitelist

---

## 📊 NEXT STEPS

1. **Check each PowerShell window** for error messages
2. **Note any specific errors** you see
3. **Check browser console** (F12) for frontend errors
4. **Verify environment files** exist and have correct values
5. **Run npm install** in any directory showing module errors

---

## 🆘 IF SERVICES DON'T START

**Manual Start (one at a time):**

```powershell
# Terminal 1 - Backend
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
npm run dev

# Terminal 2 - Shot On Me
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me
npm run dev

# Terminal 3 - Venue Portal
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\venue-portal
npm run dev

# Terminal 4 - Owner Portal
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\owner-portal
npm run dev
```

---

**Please check the PowerShell windows and let me know what specific errors you're seeing. I can then fix them one by one.**

