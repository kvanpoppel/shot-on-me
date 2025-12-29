# 🚀 Deploy Mobile Backend Connection Fix

## ✅ Fix Applied:

### Changed Backend URLs:
- **API URL**: Now uses `https://shot-on-me.onrender.com/api` (direct Render URL)
- **Socket URL**: Now uses `wss://shot-on-me.onrender.com` (direct Render URL)
- **CORS**: Added Render URL to allowed origins

### Why This Fixes the Issue:

1. **Direct URL Works**: `shot-on-me.onrender.com` is always accessible
2. **No Custom Domain Required**: Doesn't rely on `api.shotonme.com` being configured
3. **Handles Sleeping Service**: First request wakes it up (30-60 second delay is normal)

---

## ⚠️ Important: Free Tier Behavior

### What You'll Experience:
- **First Request**: Takes 30-60 seconds (service waking up from sleep)
- **Subsequent Requests**: Fast and normal
- **After 15 Minutes Inactivity**: Service sleeps again

**This is normal for free tier - not an error!**

---

## 🚀 Deploy Now:

```powershell
git add .
git commit -m "Fix: Use Render direct URL for mobile backend connection"
git push origin main
```

### What Happens:
1. **Vercel**: Will auto-deploy (~3-5 minutes)
2. **Render**: No redeploy needed (backend code unchanged, just CORS update)
3. **Mobile**: Will now connect to `https://shot-on-me.onrender.com/api`

---

## 📱 After Deployment:

### Test on Mobile:
1. Visit: `https://www.shotonme.com` on mobile
2. **First load**: Wait 30-60 seconds (service waking up)
3. **After that**: Should work normally!

### Expected Behavior:
- ✅ Connection works
- ⏱️ First request: 30-60 seconds (normal for free tier)
- ✅ Subsequent requests: Fast

---

## 💡 Long-term Solutions:

### Option 1: Upgrade Render Plan
- **Paid plans don't sleep**
- Instant responses
- Better for production

### Option 2: Keep-Alive Script
- Ping service every 10 minutes
- Prevents sleeping
- Free solution

---

## ✅ Summary:

**Fix Applied:**
- ✅ Changed to use Render direct URL
- ✅ Added Render URL to CORS
- ✅ Mobile will now connect successfully

**Action Required:**
- Commit and push changes
- Wait for Vercel deployment
- Test on mobile (expect 30-60 second delay on first request)

**Note:** The delay is normal for free tier. Consider upgrading for production use.

