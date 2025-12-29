# 🚀 Quick Test: Invite Friends

## ✅ Ready to Test!

**Backend Status:** ✅ Running on port 5000  
**Referrals Route:** ✅ `/api/referrals/code` and `/api/referrals/apply`

---

## 📱 Step-by-Step Test

### 1️⃣ Open the App
- Go to: `http://localhost:3001` or `www.shotonme.com`
- Log in with your account

### 2️⃣ Open Invite Modal
- Click **"Invite"** button on Home tab
- **Expected:** Modal opens with:
  - Your referral code (8-character code like "A1B2C3D4")
  - Your invite link
  - Share options

### 3️⃣ Test Copy Link
- Click the **copy icon** next to the invite link
- **Expected:** 
  - ✅ Checkmark appears
  - Link copied to clipboard
  - You can paste it somewhere to verify

### 4️⃣ Test Deep Linking (Most Important!)
1. Copy your invite link (e.g., `http://localhost:3001/signup?ref=A1B2C3D4`)
2. Open it in a **new incognito/private window**
3. **Expected:**
   - Registration page loads
   - URL parameter is detected (you won't see it, but it's processed)
   - You can sign up normally

### 5️⃣ Test Registration with Referral
1. Using the invite link, create a new account:
   - Email: `friend.test@example.com`
   - Password: `Test123!`
   - First Name: `Friend`
   - Last Name: `Test`
   - Phone: `+15555559999`
2. Click **"Create Account"**
3. **Expected:**
   - ✅ Registration succeeds
   - ✅ Referral code is automatically applied
   - ✅ Both users earn 5 points each
   - ✅ Permissions modal appears

### 6️⃣ Verify Referral Applied
1. Log back in as the **original user** (referrer)
2. Check your points (should have increased by 5)
3. **Expected:**
   - Points increased
   - Referral tracked in database

---

## 🔍 What to Check

### In Browser Console (F12)
- ✅ No errors when opening invite modal
- ✅ API call to `/api/referrals/code` succeeds
- ✅ Referral code is displayed
- ✅ No errors when copying/sharing

### In Backend Terminal
- ✅ `GET /api/referrals/code` returns 200
- ✅ `POST /api/referrals/apply` returns 200 (after friend signs up)
- ✅ No errors in console

### Visual Checks
- ✅ Modal opens smoothly
- ✅ Referral code is visible
- ✅ Invite link is visible
- ✅ Copy button works
- ✅ Share buttons are clickable

---

## 🐛 Common Issues & Fixes

**Modal doesn't open:**
- Check if user is logged in
- Check browser console for errors
- Verify `showInviteModal` state

**No referral code:**
- Backend creates it automatically on first request
- Check `/api/referrals/code` endpoint
- Check browser console for API errors

**Deep linking not working:**
- Verify URL has `?ref=CODE`
- Check `LoginScreen.tsx` useEffect
- Check browser console

**Referral not applied:**
- Check backend logs
- Verify referral code exists
- Check `/api/referrals/apply` endpoint

---

## 🎯 Success Criteria

✅ Modal opens and shows referral code  
✅ Copy link works  
✅ Invite link contains referral code  
✅ Deep linking detects referral code  
✅ Registration applies referral code  
✅ Both users earn points  
✅ Referral is tracked in database  

---

**Ready? Let's test!** 🚀



