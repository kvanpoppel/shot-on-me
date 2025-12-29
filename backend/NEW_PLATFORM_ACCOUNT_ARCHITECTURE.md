# New Platform Account Architecture

## Overview

**All funds are held in the Platform Owner's Stripe account. User wallets are ledger-only accounting systems.**

## Key Principles

1. **Platform Stripe Account** = Owner's Stripe account (managed via Owner Portal)
   - All actual money is held here
   - No user-specific Stripe accounts
   - Single source of truth for funds

2. **User Wallets = Ledger System**
   - `user.wallet.balance` = accounting record only
   - Represents user's share of funds in platform account
   - No actual Stripe balance per user

3. **Virtual Cards (Stripe Issuing)**
   - Auto-created on user signup
   - Added to Apple Pay/Google Pay automatically
   - Draws from platform account when used
   - NOT tied to user's personal credit card

4. **User Personal Credit Cards**
   - Only used to ADD funds to wallet
   - Money goes: User Card → Platform Account → Wallet Ledger
   - Never used for tap-and-pay

## Money Flow

### 1. User Registration
```
User Signs Up
  ↓
Auto-create Virtual Card (Stripe Issuing)
  ↓
Card added to user's phone wallet (Apple/Google Pay)
  ↓
Card draws from Platform Account
```

### 2. Adding Funds (User's Credit Card)
```
User adds $50 via credit card
  ↓
Charge user's personal card (Payment Intent)
  ↓
$50 goes to Platform Stripe Account
  ↓
Update user.wallet.balance += $50 (ledger only)
  ↓
Money stays in Platform Account
```

### 3. User-to-User Transfer
```
User A sends $20 to User B
  ↓
Update User A wallet.balance -= $20 (ledger)
  ↓
Update User B wallet.balance += $20 (ledger)
  ↓
NO Stripe transaction (money stays in Platform Account)
  ↓
Create Payment record for tracking
```

### 4. Tap-and-Pay at Venue
```
User taps phone at venue
  ↓
Virtual card charges (Stripe Issuing)
  ↓
Check user.wallet.balance >= amount (ledger check)
  ↓
Charge draws from Platform Account
  ↓
Update user.wallet.balance -= amount (ledger)
  ↓
Create Stripe Transfer: Platform Account → Venue Account
  ↓
Venue receives funds
```

## Database Schema Changes

### User Model
- `wallet.balance` = Ledger balance (accounting only)
- `wallet.pendingBalance` = Pending transfers (ledger only)
- `stripeCustomerId` = Customer in Platform Account (for saving payment methods)
- `virtualCardId` = Reference to VirtualCard model

### Payment Model
- `type`: 'wallet_topup', 'shot_sent', 'tap_and_pay', 'platform_transfer'
- `stripePaymentIntentId` = When user adds funds (charges their card)
- `stripeChargeId` = When virtual card is used (Issuing charge)
- `stripeTransferId` = Platform Account → Venue Account transfer

### VirtualCard Model
- Already exists and is correct
- Links to user
- Managed via Stripe Issuing

## Implementation Steps

1. ✅ Auto-create virtual card on signup (already exists)
2. ⚠️ Modify add funds: Charge user card → Platform account → Update ledger
3. ⚠️ Modify send money: Ledger-only updates (mostly correct, verify)
4. ⚠️ Modify tap-and-pay: Use virtual card → Platform account → Transfer to venue
5. ⚠️ Update webhooks: Track platform account transactions
6. ⚠️ Add platform account balance tracking

## Stripe Configuration

- **Platform Account**: Owner's Stripe account (STRIPE_SECRET_KEY)
- **Stripe Issuing**: Must be enabled for virtual cards
- **Stripe Connect**: For venue accounts (venues receive transfers)

## Security & Compliance

⚠️ **IMPORTANT**: This is a custodial wallet system. All funds are held in the platform account, which may require:
- Money transmitter licenses
- Compliance with financial regulations
- Proper accounting and reporting
- User fund protection measures


