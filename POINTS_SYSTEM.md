# Points Reward System

## Overview
The Points Reward System is a gamification feature that encourages customer engagement and loyalty at venues. Users earn points for various activities and can track their progress through loyalty tiers.

## How Points Work

### Earning Points

1. **Check-ins**
   - Users earn points each time they check in at a venue
   - Base points per check-in: Configurable by venue (default: 10 points)
   - Points are awarded immediately upon successful check-in

2. **Promotion Rewards**
   - Venues can set `pointsReward` on any promotion
   - When a user uses a promotion, they earn the specified points
   - Example: A "Happy Hour" promotion might offer 25 bonus points

3. **Streak Bonuses**
   - Users build check-in streaks at venues
   - Longer streaks may earn bonus points (future enhancement)

### Points Display

- Points are shown in the user's wallet/profile
- Points earned from check-ins are displayed in the `CheckInSuccessModal`
- Users can see their total points balance

## Loyalty Tiers

Users progress through loyalty tiers based on their engagement with a venue:

### Tier Levels

1. **Bronze** (0-4 check-ins)
   - Entry level
   - Basic benefits

2. **Silver** (5-9 check-ins)
   - Frequent visitor
   - Enhanced benefits

3. **Gold** (10-19 check-ins)
   - VIP status
   - Premium benefits

4. **Platinum** (20+ check-ins)
   - Top tier
   - Maximum benefits

### Tier Benefits

- **Promotion Access**: Higher tiers may unlock exclusive promotions
- **Priority Notifications**: VIP users get first access to new promotions
- **Special Rewards**: Tier-specific rewards and discounts

## Tracking

### User Loyalty Data

Each user-venue relationship is tracked in the `VenueLoyalty` model:

- `checkInCount`: Total number of check-ins at this venue
- `tier`: Current loyalty tier (bronze, silver, gold, platinum)
- `streak`: Current consecutive check-in streak
- `badges`: Earned achievement badges
- `totalSpent`: Total amount spent at venue (for future use)

### Leaderboards

Venues can view leaderboards showing:
- Top check-in counts
- Longest streaks
- Most points earned

## Promotion Targeting

Points and loyalty data enable advanced promotion targeting:

- **User Segments**: Target promotions to "frequent" (5+ check-ins), "VIP" (10+ check-ins), or "new" (0-2 check-ins) users
- **Minimum Check-ins**: Require a minimum number of check-ins to see a promotion
- **Points Rewards**: Incentivize promotion usage with bonus points

## Future Enhancements

1. **Points Redemption**
   - Users can redeem points for discounts, free items, or special perks
   - Venues can set redemption rates and available rewards

2. **Points Transfer**
   - Users might be able to transfer points between venues (if configured)

3. **Achievement Badges**
   - Unlock badges for milestones (10 check-ins, 30-day streak, etc.)
   - Badges displayed on user profile

4. **Referral Rewards**
   - Earn points for referring friends to the app or venue

5. **Social Features**
   - Compare points with friends
   - Compete on leaderboards

## Technical Implementation

### Backend

- Points are tracked in the `User` model's wallet
- Loyalty data stored in `VenueLoyalty` model
- Points awarded in `checkins.js` route
- Promotion points set in `promotions` sub-schema

### Frontend

- Points displayed in `CheckInSuccessModal`
- Loyalty stats shown in `VenueProfilePage`
- Leaderboards available in venue portal

## Configuration

Venues can configure:
- Points per check-in (via promotion `pointsReward`)
- Promotion targeting based on loyalty tiers
- Minimum check-ins required for promotions

## Best Practices

1. **Set Reasonable Point Values**
   - Base check-in: 10-20 points
   - Promotion bonus: 25-50 points
   - Special events: 100+ points

2. **Use Points for Engagement**
   - Offer points for promotions to increase usage
   - Create point-based challenges
   - Reward loyalty milestones

3. **Clear Communication**
   - Show users how many points they earned
   - Display progress to next tier
   - Explain how to earn more points


