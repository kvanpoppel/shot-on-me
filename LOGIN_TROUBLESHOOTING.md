# Login Troubleshooting Guide

## Common Login Errors & Solutions

### 1. "Network Error" or "Connection Refused"
**Problem:** Backend server is not running

**Solution:**
```powershell
# Make sure backend is running
cd backend
npm run dev
```

**Check:**
- Backend should be running on http://localhost:5000
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_API_URL` in `.env.local` is correct

### 2. "Invalid credentials"
**Problem:** Wrong email/password or user doesn't exist

**Solution:**
- Double-check email and password
- Try registering a new account first
- Check if user exists in database

### 3. "User not found" after login
**Problem:** User data structure mismatch

**Solution:**
- This has been fixed in the code
- Clear browser cache and localStorage
- Try logging in again

### 4. CORS Errors
**Problem:** Backend not allowing requests from frontend

**Solution:**
- Check `backend/server.js` has CORS enabled
- Verify frontend URL is allowed
- Check browser console for specific CORS error

### 5. "Failed to fetch user"
**Problem:** Token is invalid or expired

**Solution:**
```javascript
// Clear localStorage and try again
localStorage.clear()
// Then log in again
```

## Quick Debug Steps

1. **Check Backend is Running:**
   ```powershell
   # In backend terminal, you should see:
   ✅ Connected to MongoDB
   🚀 Server running on port 5000
   ```

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed requests

3. **Check Environment Variables:**
   ```powershell
   # shot-on-me/.env.local should have:
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. **Test API Directly:**
   ```powershell
   # Test if backend is responding
   curl http://localhost:5000/api/health
   # Should return: {"status":"ok",...}
   ```

5. **Clear Everything and Retry:**
   ```javascript
   // In browser console:
   localStorage.clear()
   // Then refresh page and try logging in again
   ```

## What Was Fixed

- ✅ User data normalization (`_id` → `id`)
- ✅ Better error handling and logging
- ✅ Network error detection
- ✅ Token validation improvements

## Still Having Issues?

1. Check backend terminal for errors
2. Check browser console for specific error messages
3. Verify MongoDB is connected
4. Make sure all services are running:
   - Backend (port 5000)
   - Shot On Me app (port 3001)

