# 📦 Deployment Requirements - What Needs to Be Deployed

## ✅ Summary

**Vercel (Frontend)**: ✅ **YES - NEEDS REDEPLOYMENT**
**Render (Backend)**: ❌ **NO - NO CHANGES MADE**

---

## 🔍 What Changed

### Frontend Changes (Vercel):
1. ✅ **NEW**: `shot-on-me/app/components/WalletOnboarding.tsx` - New onboarding component
2. ✅ **NEW**: `shot-on-me/app/components/EnhancedPermissions.tsx` - New permissions component
3. ✅ **MODIFIED**: `shot-on-me/app/components/LoginScreen.tsx` - Updated to use WalletOnboarding

### Backend Changes (Render):
- ❌ **NONE** - No backend files were modified
- ✅ Only verified that endpoints exist (they do!)

---

## 🚀 Deployment Steps

### 1. Vercel (Frontend) - REQUIRED

**Why**: We created new components and modified LoginScreen.tsx

**Steps**:
```powershell
# Commit the changes
git add shot-on-me/app/components/WalletOnboarding.tsx
git add shot-on-me/app/components/EnhancedPermissions.tsx
git add shot-on-me/app/components/LoginScreen.tsx

git commit -m "Feat: Add tap-and-pay card onboarding flow"

# Push to trigger Vercel auto-deploy
git push origin main
```

**What happens**:
- Vercel will automatically detect the push
- Will build the new components
- Will deploy to www.shotonme.com
- Takes 2-5 minutes

**OR** manually redeploy in Vercel dashboard:
- Go to Vercel Dashboard → Your Project → Deployments
- Click "Redeploy" on latest deployment

---

### 2. Render (Backend) - NOT NEEDED

**Why**: We didn't modify any backend code

**What we did**:
- ✅ Only READ backend files to verify endpoints exist
- ✅ Verified `/api/virtual-cards/status` exists
- ✅ Verified `/api/virtual-cards/create` exists
- ✅ Verified Socket.io is configured

**No action needed** - Backend is already ready!

---

## ⚠️ Important Notes

### Before Deploying to Vercel:

1. **Set Environment Variable** (if not already set):
   - `NEXT_PUBLIC_SOCKET_URL=wss://shot-on-me.onrender.com`
   - This is CRITICAL for Socket.io to work

2. **Verify Stripe Issuing**:
   - Must be enabled in Stripe Dashboard
   - Card creation will fail without it

---

## ✅ Quick Answer

**Do you need to redeploy?**

- **Vercel**: ✅ **YES** - Push your changes to GitHub (Vercel auto-deploys)
- **Render**: ❌ **NO** - No backend changes were made

**Time needed**: ~2 minutes to commit and push, then Vercel auto-deploys in 2-5 minutes.

---

## 🎯 Recommended Action

**Just push your changes to GitHub:**
```powershell
git add shot-on-me/app/components/
git commit -m "Feat: Add tap-and-pay card onboarding flow"
git push origin main
```

Vercel will automatically deploy. No manual action needed!

