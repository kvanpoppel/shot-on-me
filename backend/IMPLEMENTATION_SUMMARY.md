# New Platform Account Architecture - Implementation Summary

## ✅ What Has Been Implemented

### 1. Architecture Design
- **Documented**: `backend/NEW_PLATFORM_ACCOUNT_ARCHITECTURE.md`
- All funds held in Platform Owner's Stripe account
- User wallets are ledger-only accounting systems
- Virtual cards draw from platform account

### 2. Auto-Create Virtual Card on Signup
- **Already exists** in `backend/routes/auth.js` (lines 151-202)
- Automatically creates Stripe Issuing virtual card when user registers
- Card is saved to database and linked to user

### 3. Add Funds Flow (User's Credit Card)
- **Already correct** in `backend/routes/payments.js` (POST `/create-intent`)
- Charges user's personal credit card
- Money goes to Platform Stripe Account (via platform Stripe key)
- Updates user wallet ledger (`user.wallet.balance`)
- Webhook handler updates wallet when payment succeeds

### 4. Send Money Flow (User-to-User)
- **Already correct** in `backend/routes/payments.js` (POST `/send`)
- Updates sender and recipient wallet ledgers only
- No Stripe transaction (money stays in platform account)
- Creates Payment record for tracking

### 5. Tap-and-Pay Flow (Virtual Card)
- **NEW**: Webhook handler for `issuing.authorization.request`
- When user taps phone:
  1. Stripe sends authorization request webhook
  2. System checks user wallet balance (ledger)
  3. If sufficient: Approve authorization (draws from platform account)
  4. If insufficient: Decline authorization
  5. Create Payment record for tracking
- **NEW**: Webhook handler for `issuing.authorization.updated`
- When authorization is finalized:
  1. Deduct from user wallet ledger (atomic)
  2. Update Payment record status
  3. Emit real-time wallet update

### 6. Payment Model Updates
- Added `stripeAuthorizationId` field to track Issuing authorizations
- Supports both Payment Intent IDs and Authorization IDs

## 🔧 How It Works

### Money Flow Diagram

```
User Registration
  ↓
Auto-create Virtual Card (Stripe Issuing)
  ↓
Card added to Apple Pay/Google Pay
  ↓
[User adds funds via credit card]
  ↓
Charge user's card → Platform Account → Update wallet ledger
  ↓
[User sends money to friend]
  ↓
Update both wallet ledgers (money stays in platform account)
  ↓
[User taps phone at venue]
  ↓
Virtual card charge → Check wallet ledger → Approve/Decline
  ↓
If approved: Draw from platform account → Deduct wallet ledger
  ↓
Create transfer: Platform Account → Venue Account
```

## 📋 Webhook Events Required

You must configure these webhook events in your Stripe Dashboard:

1. **`payment_intent.succeeded`** - When user adds funds
2. **`payment_intent.payment_failed`** - When add funds fails
3. **`transfer.paid`** - When transfer to venue succeeds
4. **`transfer.failed`** - When transfer to venue fails
5. **`issuing.authorization.request`** ⭐ NEW - When virtual card is used
6. **`issuing.authorization.updated`** ⭐ NEW - When authorization is finalized

## 🚀 Next Steps

1. **Configure Stripe Webhooks**:
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/payments/webhook`
   - Subscribe to the events listed above

2. **Test Virtual Card Flow**:
   - Register a new user (virtual card auto-created)
   - Add funds to wallet
   - Tap phone at a test venue
   - Verify wallet ledger updates correctly

3. **Venue Transfer Integration**:
   - When venue processes payment, create transfer from platform account
   - This can be done via the existing `/redeem` endpoint or a new endpoint

## ⚠️ Important Notes

- **All money stays in Platform Account**: User wallets are just ledgers
- **Virtual cards draw from platform account**: Not from user's personal card
- **User credit cards only add funds**: Never used for tap-and-pay
- **Compliance**: This is a custodial wallet system - may require money transmitter licenses

## 📝 Files Modified

1. `backend/models/Payment.js` - Added `stripeAuthorizationId` field
2. `backend/routes/payments.js` - Added webhook handlers for Issuing events
3. `backend/NEW_PLATFORM_ACCOUNT_ARCHITECTURE.md` - Architecture documentation

## 🔍 Testing Checklist

- [ ] User registration creates virtual card
- [ ] Add funds charges user card and updates wallet ledger
- [ ] Send money updates ledgers only (no Stripe transaction)
- [ ] Virtual card tap triggers authorization request webhook
- [ ] Authorization approved/declined based on wallet balance
- [ ] Wallet ledger deducted when authorization finalized
- [ ] Real-time wallet updates via Socket.io


