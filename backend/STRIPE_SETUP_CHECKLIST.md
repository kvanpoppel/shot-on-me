# Stripe Setup Checklist

## ✅ CRITICAL: Fix Key Mismatch (MUST DO FIRST)

Your Stripe keys are from **DIFFERENT accounts**:
- Secret key: `51SFljxPAN...`
- Publishable key: `51RJR7R4E5...`

### Steps to Fix:
1. Go to https://dashboard.stripe.com
2. Make sure you're in the **correct account**
3. Navigate to **Developers → API keys**
4. Copy **BOTH** keys from the **SAME account**:
   - Secret key (starts with `sk_test_...`)
   - Publishable key (starts with `pk_test_...`)
5. Update `backend/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_51XXXXX...
   STRIPE_PUBLISHABLE_KEY=pk_test_51XXXXX...
   ```
   **Both must start with the SAME account ID!**
6. Verify: Run `node backend/scripts/check-stripe-keys.js`

---

## ⚠️ Enable Stripe Issuing (For Virtual Cards)

**Why:** Virtual cards won't be created automatically without this.

### Steps:
1. Go to https://dashboard.stripe.com/issuing
2. Click **"Enable Issuing"**
3. Complete the setup steps
4. Verify: Run `node backend/scripts/verify-stripe-setup.js`

---

## ⚠️ Set Up Webhook (For Auto Wallet Updates)

**Why:** Wallet balance won't update automatically after payment without this.

### Steps:
1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   http://localhost:5000/api/payments/webhook
   ```
   (For production, use your actual backend URL)
4. Select events to listen to:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add to `backend/.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
8. Verify: Run `node backend/scripts/verify-stripe-setup.js`

---

## ⚠️ Verify Account (If Needed)

**Why:** Account must be verified to accept charges.

### Steps:
1. Go to https://dashboard.stripe.com/account
2. Complete any pending verification steps
3. Verify: Run `node backend/scripts/verify-stripe-setup.js`

---

## ✅ Verification Commands

After completing the steps above, run:

```bash
# Quick check if keys match
node backend/scripts/check-stripe-keys.js

# Full verification
node backend/scripts/verify-stripe-setup.js
```

---

## 📝 Current Status

Run the verification script to see current status:
```bash
node backend/scripts/verify-stripe-setup.js
```

---

## 🚨 Common Issues

### "Keys are from different accounts"
- **Fix:** Get both keys from the same Stripe account
- **Verify:** Run `check-stripe-keys.js`

### "Stripe Issuing not enabled"
- **Fix:** Enable Issuing in Stripe Dashboard
- **Impact:** Virtual cards won't be created automatically

### "Webhook not found"
- **Fix:** Add webhook endpoint in Stripe Dashboard
- **Impact:** Wallet won't update automatically after payment

### "Account cannot accept charges"
- **Fix:** Complete account verification in Stripe Dashboard
- **Impact:** Payments will fail

---

## ✅ After Everything is Fixed

1. Restart backend server
2. Test adding funds
3. Test virtual card creation
4. Test payment flow

