# Rewards System Implementation Plan

## Overview
Implementing a Starbucks-style rewards system where users earn "stars" (points) through spending and check-ins, with a maximum of 3 points per venue per day.

## New Points System

### Points Earning Rules:
1. **Tap n Pay Transaction**: 2 points
2. **Check-in at Venue**: 1 point
3. **Both (Tap n Pay + Check-in)**: 3 points total (max per venue per day)
4. **Referral Bonus**: Points for referring new users (to be determined)

### Daily Limits:
- Maximum 3 points per venue per day
- If user uses Tap n Pay without check-in: 2 points
- If user checks in without Tap n Pay: 1 point
- If user does both: 3 points (not 2+1=3, but capped at 3)

### Reward Redemption:
- **100 points = $5 reward cash**
- Points can be redeemed for cash credit to wallet

## Implementation Details

### 1. Daily Venue Points Tracking
Create a new model to track points earned per venue per day:
- `DailyVenuePoints` model
- Tracks: userId, venueId, date, tapAndPayPoints, checkInPoints, totalPoints
- Ensures max 3 points per venue per day

### 2. Payment Redemption (Tap n Pay)
- When payment is redeemed at venue via `/api/payments/redeem`
- Award 2 points for Tap n Pay transaction
- Check if user already checked in today at same venue
- If yes, ensure total doesn't exceed 3 points

### 3. Check-in Points
- When user checks in at venue via `/api/checkins`
- Award 1 point for check-in
- Check if user already used Tap n Pay today at same venue
- If yes, ensure total doesn't exceed 3 points

### 4. Reward Redemption System
- Create endpoint to redeem 100 points for $5 cash
- Add points to wallet as cash credit
- Track redemption history

### 5. Referral Points
- Track referral points separately
- Award points when referred user completes first transaction or check-in

### 6. Wallet Funding Streamlining
- Add quick amount buttons ($10, $25, $50, $100)
- Save payment methods for faster checkout
- One-click funding with saved cards

## Database Changes

### New Model: DailyVenuePoints
```javascript
{
  user: ObjectId (ref: User),
  venue: ObjectId (ref: Venue),
  date: Date (start of day),
  tapAndPayPoints: Number (default: 0),
  checkInPoints: Number (default: 0),
  totalPoints: Number (max: 3),
  transactions: [{
    type: String ('tap_and_pay' | 'check_in'),
    points: Number,
    timestamp: Date,
    paymentId: ObjectId (optional, for tap_and_pay)
  }]
}
```

### User Model Updates
- Keep existing `points` field
- Add `rewardCashBalance` field (cash from redeemed points)
- Add `totalPointsEarned` field (lifetime points)
- Add `totalPointsRedeemed` field

### Reward Model Updates
- Add default reward: "100 Points = $5 Cash"
- Ensure this reward is always available

## API Endpoints

### New Endpoints:
1. `POST /api/rewards/redeem-cash` - Redeem 100 points for $5 cash
2. `GET /api/rewards/daily-stats` - Get daily points earned per venue
3. `GET /api/rewards/venue-history/:venueId` - Get points history for a venue

### Modified Endpoints:
1. `POST /api/payments/redeem` - Award 2 points for Tap n Pay
2. `POST /api/checkins` - Award 1 point for check-in, check for Tap n Pay

## Frontend Updates

### Wallet Tab:
- Display points balance prominently
- Show "Redeem 100 points for $5" button
- Quick funding amounts ($10, $25, $50, $100)
- Saved payment methods

### Rewards Screen:
- Show points balance
- Show available rewards
- Show redemption history
- Show daily points earned per venue

### Profile Tab:
- Show lifetime points earned
- Show points redeemed
- Show reward cash balance

## Testing Checklist

- [ ] Tap n Pay awards 2 points
- [ ] Check-in awards 1 point
- [ ] Both at same venue same day = 3 points (not 4)
- [ ] Max 3 points per venue per day enforced
- [ ] Points reset daily per venue
- [ ] 100 points = $5 cash redemption works
- [ ] Referral points tracked correctly
- [ ] Wallet funding streamlined
- [ ] Saved payment methods work

