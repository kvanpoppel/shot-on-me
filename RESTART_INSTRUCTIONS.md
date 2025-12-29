# Post-Restart Instructions

## After your computer restarts:

### 1. Start Backend Server
```powershell
cd backend
npm run dev
```
Wait for: "✅ Connected to MongoDB" and "🚀 Server running on 0.0.0.0:5000"

### 2. Start Shot On Me App (in a NEW terminal)
```powershell
cd shot-on-me
npm run dev
```
Wait for: "Ready on http://localhost:3001"

### 3. Start Venue Portal (in a NEW terminal)
```powershell
cd venue-portal
npm run dev
```
Wait for: "Ready on http://localhost:3000"

### 4. Test Login
1. Open http://localhost:3001 in your browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Try to log in
5. Check the console for: `🔐 Login URL: http://localhost:5000/api/auth/login`
6. Check Network tab for the actual request

### 5. If Still Getting 405 Error:
- Check the Network tab in browser DevTools
- Look at the failed request
- Share:
  - The exact URL being called
  - The HTTP method (should be POST)
  - The status code
  - Any error message

## What Was Fixed:
✅ Centralized API URL management in `shot-on-me/app/utils/api.ts`
✅ Fixed rate limiter conflicts in `backend/server.js`
✅ All components now use `getApiUrl()` and `buildApiUrl()`
✅ Login uses `buildApiUrl('auth/login')` which ensures correct URL format

## Verification:
The login endpoint should be: `http://localhost:5000/api/auth/login` (POST)
If you see a different URL or GET method, that's the issue.


