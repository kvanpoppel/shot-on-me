# Shot On Me Payment Architecture

## Core Principle
**All funds flow through the owner's Stripe account. Users have wallet balances (database records) that represent their share of funds in the owner's account.**

## Architecture Overview

### 1. Wallet System
- **Storage**: Wallet balances stored in MongoDB (`User.wallet.balance`)
- **Backing**: All actual funds held in owner's Stripe account
- **Purpose**: Users can add funds, send to other users, pay venues

### 2. Credit/Debit Cards
- **Storage**: Saved as PaymentMethods in owner's Stripe account (attached to user's Stripe Customer)
- **Usage**: 
  - ✅ Add funds to wallet (top-up)
  - ✅ Send money to other users (charge card → add to recipient wallet)
  - ❌ NOT used for venue payments
  - ❌ NOT used for direct purchases

### 3. Payment Flows

#### A. Wallet Top-Up (Credit Card → Wallet)
1. User adds credit card (saved as PaymentMethod in owner's Stripe account)
2. User selects amount to add
3. Charge card via Payment Intent (owner's Stripe account receives funds)
4. Update user's wallet balance in database
5. Log transaction as `wallet_topup`

#### B. User-to-User Transfer (Wallet → Wallet)
1. User A sends money to User B
2. Deduct from User A's wallet balance (database)
3. Add to User B's wallet balance (database)
4. Log transaction as `transfer`
5. **No Stripe transaction** - just database updates (funds already in owner's account)

#### C. Venue Payment (Wallet → Venue)
1. User pays venue from wallet balance
2. Deduct from user's wallet balance (database)
3. Create Stripe Transfer from owner's account to venue's Stripe Connect account
4. Log transaction as `tap_and_pay` or `venue_payment`
5. Venue receives funds in their Stripe account

### 4. Stripe Customer Structure
- Each user has a Stripe Customer in owner's account (`user.stripeCustomerId`)
- PaymentMethods attached to user's customer
- All charges go to owner's Stripe account
- Owner's account balance = sum of all user wallet balances

### 5. Virtual Card (Wallet Card)
- Visual representation of wallet balance
- Shows balance, transaction history
- Can be used for tap-and-pay at venues (deducts from wallet)

## Current Implementation Status

✅ **Already Built:**
- Wallet balance storage (User model)
- User-to-user transfers (`/payments/send`)
- Payment history tracking
- Stripe customer creation
- Payment Intent creation for top-ups

❌ **Needs Fixing:**
- Credit card addition (400 errors - nested Elements issue)
- Wallet top-up webhook handling (ensure balance updates)
- Venue Stripe Connect integration
- Virtual card display

🔄 **Needs Enhancement:**
- Instant user-to-user transfers (currently uses pendingBalance)
- Social transaction feed
- Gamification integration
- Real-time balance updates

## Legal Considerations
⚠️ **IMPORTANT**: This architecture requires money transmitter licenses. All funds are held in owner's Stripe account, making this a custodial wallet system similar to Venmo/PayPal.

## Next Steps
1. Fix credit card addition (remove nested Elements)
2. Ensure wallet top-ups properly update balances
3. Make user-to-user transfers instant
4. Implement venue Stripe Connect transfers
5. Add social features and gamification



