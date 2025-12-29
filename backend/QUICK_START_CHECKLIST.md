# Quick Start Checklist - Fix Stripe & Test

## Step 1: Fix Stripe Key Mismatch (CRITICAL - DO THIS FIRST)

### 1.1 Check Current Keys
```bash
node backend/scripts/check-stripe-keys.js
```
This will show you which keys don't match.

### 1.2 Get Matching Keys from Stripe
1. Go to: https://dashboard.stripe.com
2. Make sure you're in the **correct account** (the one you want to use)
3. Click **"Developers"** → **"API keys"**
4. You should see:
   - **Secret key** (starts with `sk_test_...` or `sk_live_...`)
   - **Publishable key** (starts with `pk_test_...` or `pk_live_...`)
5. **IMPORTANT:** Both keys must start with the **SAME account ID**
   - Example: `sk_test_51XXXXX...` and `pk_test_51XXXXX...`
   - The `51XXXXX` part must match!

### 1.3 Update backend/.env
1. Open `backend/.env` file
2. Update these lines:
   ```
   STRIPE_SECRET_KEY=sk_test_51XXXXX... (your secret key)
   STRIPE_PUBLISHABLE_KEY=pk_test_51XXXXX... (your publishable key)
   ```
3. Save the file

### 1.4 Verify Keys Match
```bash
node backend/scripts/check-stripe-keys.js
```
Should now show: ✅ Keys are from the SAME account!

---

## Step 2: Full Verification

### 2.1 Run Full Verification
```bash
node backend/scripts/verify-stripe-setup.js
```

This will check:
- ✅ API keys are valid
- ⚠️ Stripe Issuing (for virtual cards)
- ⚠️ Webhook setup (for auto wallet updates)
- ⚠️ Account verification

### 2.2 Fix Any Warnings (Optional but Recommended)

**If Stripe Issuing not enabled:**
- Go to: https://dashboard.stripe.com/issuing
- Click "Enable Issuing"
- Follow setup steps

**If Webhook not set up:**
- Go to: https://dashboard.stripe.com/webhooks
- Click "Add endpoint"
- URL: `http://localhost:5000/api/payments/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy the Signing secret (starts with `whsec_...`)
- Add to `backend/.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

**If Account not verified:**
- Go to: https://dashboard.stripe.com/account
- Complete verification steps

### 2.3 Verify Again
```bash
node backend/scripts/verify-stripe-setup.js
```
Should show mostly ✅ now (warnings are OK, but fix if you can)

---

## Step 3: Restart Backend

### 3.1 Stop Backend (if running)
Press `Ctrl+C` in the backend terminal

### 3.2 Start Backend
```bash
cd backend
npm start
```
Or use your restart script:
```bash
cd backend
.\restart-backend.ps1
```

### 3.3 Check for Errors
Look for:
- ✅ "Connected to MongoDB"
- ✅ "Server running on port 5000"
- ❌ Any Stripe errors (if you see errors, check keys again)

---

## Step 4: Test Functionality

### 4.1 Test Adding Funds
1. Open the app: http://localhost:3001
2. Log in
3. Go to Wallet
4. Click "Add Funds"
5. Try adding $10
6. **Expected:** Payment form loads, you can enter card details

### 4.2 Test Virtual Card (if Issuing enabled)
1. After adding funds, check if virtual card was created
2. Go to Settings or Wallet
3. Look for virtual card info
4. **Expected:** Card details shown (last 4 digits, etc.)

### 4.3 Check Backend Logs
Look for:
- ✅ "Payment succeeded" messages
- ✅ "Wallet updated" messages
- ❌ Any error messages

---

## Step 5: If Something Doesn't Work

### Check Backend Logs
Look at the backend terminal for error messages

### Common Issues:

**"Invalid API Key"**
- Keys still don't match → Run `check-stripe-keys.js` again
- Wrong keys in .env → Update .env with correct keys

**"Stripe Issuing not enabled"**
- Virtual cards won't be created automatically
- This is OK - cards can be created manually later

**"Webhook error"**
- Wallet might not update automatically
- Check webhook is set up in Stripe Dashboard
- Check `STRIPE_WEBHOOK_SECRET` in .env

**Payment form doesn't load**
- Check backend is running
- Check browser console for errors
- Check backend logs

---

## Quick Commands Reference

```bash
# Check if keys match
node backend/scripts/check-stripe-keys.js

# Full verification
node backend/scripts/verify-stripe-setup.js

# Restart backend (Windows PowerShell)
cd backend
.\restart-backend.ps1
```

---

## Success Criteria

✅ Keys match (check-stripe-keys.js shows success)
✅ Backend starts without Stripe errors
✅ Can open "Add Funds" modal
✅ Payment form loads
✅ Can enter card details (test mode: use 4242 4242 4242 4242)

If all these work, you're good to go! 🎉

