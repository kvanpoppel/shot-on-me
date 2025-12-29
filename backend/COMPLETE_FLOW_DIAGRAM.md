# Complete Platform Account Flow - How It Works

## 🎯 Complete Money Flow

### 1. User Registration
```
User Signs Up
  ↓
Auto-create Virtual Card (Stripe Issuing)
  ↓
Card saved to database
  ↓
Card can be added to Apple Pay/Google Pay
```

### 2. Adding Funds (User's Credit Card)
```
User adds $50 via credit card
  ↓
POST /api/payments/create-intent
  ↓
Create Payment Intent (charges user's card)
  ↓
Money goes to Platform Stripe Account
  ↓
Webhook: payment_intent.succeeded
  ↓
Update user.wallet.balance += $50 (ledger only)
  ↓
Money stays in Platform Account
```

### 3. User-to-User Transfer
```
User A sends $20 to User B
  ↓
POST /api/payments/send
  ↓
Update User A wallet.balance -= $20 (ledger)
  ↓
Update User B wallet.pendingBalance += $20 (ledger)
  ↓
NO Stripe transaction (money stays in Platform Account)
  ↓
Create Payment record (type: 'shot_sent')
```

### 4. Tap-and-Pay at Venue (Virtual Card)

#### Flow A: Virtual Card Authorization (Automatic via Webhook)
```
User taps phone at venue
  ↓
Stripe sends: issuing.authorization.request webhook
  ↓
Check user.wallet.balance >= amount
  ↓
If sufficient: Approve authorization
  ↓
Create Payment record (type: 'tap_and_pay', status: 'processing')
  ↓
Stripe sends: issuing.authorization.updated webhook
  ↓
Deduct user.wallet.balance -= amount (ledger)
  ↓
If payment.venueId exists: Create transfer Platform → Venue
  ↓
Update Payment status to 'succeeded'
```

#### Flow B: Venue Processes Payment (Manual via /redeem)
```
Venue calls POST /api/payments/redeem
  ↓
Find Payment by paymentId or redemptionCode
  ↓
If virtual card payment already processed:
  - Wallet already deducted (via webhook)
  - Transfer may already exist
  - Just update status and return
  ↓
If not processed yet:
  - Check wallet balance
  - Deduct wallet (if not already deducted)
  - Create transfer Platform → Venue
  - Update Payment status
```

## 🔑 Key Points

1. **All money stays in Platform Account** - User wallets are just ledgers
2. **Virtual cards draw from platform account** - Not from user's personal card
3. **User credit cards only add funds** - Never used for tap-and-pay
4. **Transfers created automatically** - When authorization finalized (if venueId known)
5. **Idempotent operations** - Can be called multiple times safely
6. **Atomic transactions** - Wallet deductions and transfers are atomic

## 📊 Database State

### Payment Record States:
- `pending` - Created but not processed
- `processing` - Being processed (wallet deducted, transfer pending)
- `succeeded` - Fully processed (wallet deducted, transfer created)
- `failed` - Processing failed

### Virtual Card Payment Flow:
1. Authorization request → Payment created (status: 'processing')
2. Authorization updated → Wallet deducted, transfer created (if venueId known)
3. Payment status → 'succeeded'

## ✅ Implementation Status

- ✅ Virtual card auto-creation on signup
- ✅ Add funds charges user card → Platform account
- ✅ Send money is ledger-only
- ✅ Virtual card authorization webhook handlers
- ✅ Wallet ledger deduction
- ✅ Transfer creation from platform to venue
- ✅ Redeem endpoint handles both flows
- ✅ Idempotency and atomicity

The system is **fully functional**!


