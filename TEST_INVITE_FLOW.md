# 🧪 Testing Invite Friends Flow

## Prerequisites
- ✅ Backend running on port 5000
- ✅ Frontend running on port 3001 (or www.shotonme.com)
- ✅ User account logged in

## Test Steps

### Test 1: Open Invite Modal
1. Open the app: `http://localhost:3001` or `www.shotonme.com`
2. Log in with your account
3. Go to **Home** tab
4. Click the **"Invite"** button (in the Quick Actions section)
5. **Expected:** Invite modal opens showing:
   - Your referral code (e.g., "ABC12345")
   - Your invite link (e.g., "http://localhost:3001/signup?ref=ABC12345")
   - Share options (Share, SMS, Email, Copy Link)

### Test 2: Copy Invite Link
1. In the invite modal, click **"Copy Link"** button
2. **Expected:** 
   - Button shows checkmark
   - Link copied to clipboard
   - Success message appears

### Test 3: Test Native Share (Mobile)
1. On mobile device, open invite modal
2. Click **"Share"** button
3. **Expected:**
   - Native share sheet opens (iOS/Android)
   - Can share via Messages, WhatsApp, etc.
   - Link includes referral code

### Test 4: Test SMS Invite
1. In invite modal, enter a phone number (e.g., "+15555551234")
2. Click **"Send SMS"** button
3. **Expected:**
   - SMS app opens with pre-filled message
   - Message includes invite link with referral code

### Test 5: Test Email Invite
1. In invite modal, enter an email address
2. Click **"Send Email"** button
3. **Expected:**
   - Email client opens with pre-filled subject/body
   - Body includes invite link with referral code

### Test 6: Test Deep Linking (Referral Code Application)
1. Copy your invite link (e.g., `http://localhost:3001/signup?ref=ABC12345`)
2. Open in a new browser/incognito window
3. **Expected:**
   - Registration page loads
   - Referral code is automatically detected from URL
   - URL is cleaned (no visible `?ref=` parameter)

### Test 7: Test Registration with Referral Code
1. Using the invite link from Test 6, sign up as a new user:
   - Email: `test.friend@example.com`
   - Password: `Test123!`
   - First Name: `Test`
   - Last Name: `Friend`
   - Phone: `+15555559999`
2. Click **"Create Account"**
3. **Expected:**
   - Registration succeeds
   - Referral code is automatically applied
   - Both users (referrer and new user) earn points
   - New user can see they were referred

### Test 8: Verify Referral Tracking
1. Log back in as the original user (referrer)
2. Go to **Profile** → **Referrals** (if available) or check backend
3. **Expected:**
   - New referral appears in referral history
   - Status shows as "pending" or "completed"
   - Points/rewards are tracked

## Quick Test Commands

### Check Backend Referral Endpoint
```bash
# Get your referral code (requires auth token)
curl -X GET http://localhost:5000/api/referrals/code \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Referral History
```bash
curl -X GET http://localhost:5000/api/referrals/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Expected Behavior Summary

✅ **Invite Modal:**
- Shows referral code
- Shows invite link
- Multiple share options work
- Copy to clipboard works

✅ **Deep Linking:**
- URL parameter `?ref=CODE` is detected
- Referral code is stored during registration
- URL is cleaned after detection

✅ **Referral Application:**
- Code is applied automatically after registration
- Both users get rewards
- Referral is tracked in database

✅ **Cross-Platform:**
- Native share works on mobile
- Clipboard works on desktop
- SMS/Email work on all platforms
- Fallback to alert if all else fails

## Troubleshooting

**Issue: Modal doesn't open**
- Check browser console for errors
- Verify user is logged in
- Check that `showInviteModal` state is set correctly

**Issue: Referral code not showing**
- Check backend `/api/referrals/code` endpoint
- Verify user has a referral code in database
- Check browser console for API errors

**Issue: Deep linking not working**
- Verify URL has `?ref=CODE` parameter
- Check `LoginScreen.tsx` useEffect for URL parsing
- Check browser console for errors

**Issue: Referral not applied**
- Check backend `/api/referrals/apply` endpoint
- Verify referral code exists in database
- Check that user ID is correct
- Check backend logs for errors



