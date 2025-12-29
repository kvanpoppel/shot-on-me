# 🎯 Comprehensive Referral System Design

## Overview
The referral system should support **three distinct types** of referrals, each serving different business goals:

1. **App Referrals** - Invite friends to join the app
2. **Venue Check-in Referrals** - Invite friends to check in at a specific venue
3. **Venue Attendance Invites** - Invite friends to attend venue events/promotions

---

## 1. App Referrals (Current - Enhanced)

### Purpose
- Drive app user growth
- Build user network
- Increase overall engagement

### How It Works
- User shares their referral code/link
- Friend signs up using the link
- Both users get rewards

### Current Rewards
- **On Signup:** 5 points each (referrer + new user)
- **On Completion:** +10 points for referrer (when friend completes all actions)

### Actions Tracked
- ✅ Signed up
- ✅ First payment sent
- ✅ First check-in at any venue

---

## 2. Venue Check-in Referrals (NEW)

### Purpose
- Drive foot traffic to specific venues
- Reward users for bringing friends
- Create venue-specific engagement

### How It Works
1. User A is at Venue X (or viewing Venue X)
2. User A clicks "Invite Friends to Check In"
3. System generates venue-specific invite link: `app.com/venue/VENUE_ID/checkin?ref=USER_ID`
4. Friend receives invite and checks in at that venue
5. **Both users get venue-specific rewards**

### Rewards Structure
- **Referrer (User A):** 
  - Base: 10 points (for bringing friend)
  - Venue-specific bonus: 5-20 points (configurable per venue)
  - Total: 15-30 points per friend check-in
  
- **Recipient (Friend):**
  - Base check-in: 10 points (standard check-in reward)
  - Referral bonus: 5-10 points (for checking in via invite)
  - Total: 15-20 points

### Venue-Specific Benefits
- Venues can set their own referral rewards
- Higher rewards for popular venues
- Special rewards during events/promotions
- Venue owners can track who's bringing friends

### Example Flow
```
User A at "The Bar":
1. Clicks "Invite Friends to Check In"
2. Shares link: app.com/venue/123/checkin?ref=USER_A
3. Friend B clicks link → Opens venue page
4. Friend B checks in at "The Bar"
5. User A gets: 10 base + 10 venue bonus = 20 points
6. Friend B gets: 10 check-in + 5 referral = 15 points
```

---

## 3. Venue Attendance Invites (NEW)

### Purpose
- Promote specific events/promotions
- Drive attendance to venue events
- Time-sensitive engagement

### How It Works
1. User sees an event/promotion at a venue
2. User clicks "Invite Friends to This Event"
3. System generates event-specific invite: `app.com/venue/VENUE_ID/event/EVENT_ID?ref=USER_ID`
4. Friend receives invite with event details
5. Friend attends (checks in during event time)
6. **Both users get event-specific rewards**

### Rewards Structure
- **Referrer:**
  - Base: 15 points (for promoting event)
  - Event bonus: 10-25 points (higher for special events)
  - Total: 25-40 points per friend attendance
  
- **Recipient:**
  - Base check-in: 10 points
  - Event attendance: 10-15 points
  - Referral bonus: 5 points
  - Total: 25-30 points

### Event-Specific Features
- Time-sensitive (only valid during event window)
- Event details included in invite
- Special rewards for first-time attendees
- Venue can set event-specific rewards

### Example Flow
```
Event: "Happy Hour at The Bar (5-7pm)"
1. User A sees event, clicks "Invite Friends"
2. Shares: app.com/venue/123/event/456?ref=USER_A
3. Friend B receives invite with event details
4. Friend B checks in during 5-7pm window
5. User A gets: 15 base + 15 event = 30 points
6. Friend B gets: 10 check-in + 10 event + 5 referral = 25 points
```

---

## Venue-Specific Rewards System

### Why Venue-Specific?
- **Venue Benefits:**
  - Track who's bringing customers
  - Reward top referrers
  - Drive foot traffic during slow times
  - Promote specific events

- **User Benefits:**
  - Earn more for bringing friends to favorite venues
  - Venue-specific leaderboards
  - Special perks at venues you frequent

### Implementation
- Each venue can set:
  - Base referral reward (default: 10 points)
  - Event referral reward (default: 15 points)
  - Maximum rewards per day/week
  - Special promotions for referrals

### Tracking
- Track venue-specific referrals separately
- Show in user profile: "You've brought 5 friends to The Bar"
- Venue dashboard: "User X brought 10 friends this month"

---

## Recommended Reward Structure

### App Referrals (Current)
- Signup: 5 points each
- Completion: +10 points for referrer
- **Total possible: 15 points per referral**

### Venue Check-in Referrals (Proposed)
- Referrer: 10 base + 10 venue = **20 points**
- Recipient: 10 check-in + 5 referral = **15 points**
- **Venue-specific, can be customized**

### Venue Attendance Invites (Proposed)
- Referrer: 15 base + 15 event = **30 points**
- Recipient: 10 check-in + 10 event + 5 referral = **25 points**
- **Event-specific, time-limited**

---

## Database Schema Changes Needed

### New Models

1. **VenueReferral** (for venue check-in referrals)
   - referrer (User)
   - recipient (User)
   - venue (Venue)
   - checkIn (CheckIn) - link to actual check-in
   - pointsAwarded: { referrer: Number, recipient: Number }
   - status: 'pending' | 'completed'
   - createdAt

2. **EventInvite** (for venue attendance invites)
   - inviter (User)
   - invitee (User)
   - venue (Venue)
   - event/promotion (reference)
   - checkIn (CheckIn) - if invitee checks in
   - pointsAwarded: { inviter: Number, invitee: Number }
   - status: 'pending' | 'attended' | 'expired'
   - expiresAt (event end time)
   - createdAt

### Enhanced Models

1. **CheckIn** - Add:
   - referredBy (User) - who invited them
   - referralType: 'app' | 'venue' | 'event' | null
   - referralPoints: Number

2. **Venue** - Add:
   - referralRewards: {
     - baseCheckIn: Number (default: 10)
     - eventCheckIn: Number (default: 15)
     - maxPerDay: Number
     - maxPerWeek: Number
   }

---

## User Experience Flow

### Scenario 1: Venue Check-in Referral
1. User opens venue page
2. Sees "Invite Friends to Check In" button
3. Clicks → Opens invite modal
4. Shares link via SMS/Email/Share
5. Friend receives: "John invited you to check in at The Bar!"
6. Friend clicks link → Opens venue page
7. Friend checks in
8. **Both get points immediately**

### Scenario 2: Event Attendance Invite
1. User sees event: "Happy Hour 5-7pm"
2. Clicks "Invite Friends to This Event"
3. Shares event-specific link
4. Friend receives: "John invited you to Happy Hour at The Bar (5-7pm)!"
5. Friend clicks → Opens event details
6. Friend checks in during event window
7. **Both get event-specific rewards**

---

## Benefits of This System

### For Users
- ✅ Multiple ways to earn points
- ✅ Venue-specific rewards
- ✅ Event-specific bonuses
- ✅ Track referrals across different types

### For Venues
- ✅ Drive foot traffic
- ✅ Track who's bringing customers
- ✅ Reward top referrers
- ✅ Promote events effectively

### For Business
- ✅ Increased engagement
- ✅ Venue partnerships
- ✅ Event promotion
- ✅ Network effects

---

## Implementation Priority

### Phase 1: Venue Check-in Referrals (High Priority)
- Most impactful for venues
- Drives immediate foot traffic
- Relatively simple to implement

### Phase 2: Event Attendance Invites (Medium Priority)
- More complex (time-sensitive)
- Higher rewards = more engagement
- Great for promoting events

### Phase 3: Enhanced Tracking & Analytics (Low Priority)
- Venue dashboards
- Referrer leaderboards
- Advanced analytics

---

## Questions to Consider

1. **Should venue check-in referrals be one-time or repeatable?**
   - One-time: Each friend can only be referred once per venue
   - Repeatable: Can refer same friend multiple times (with cooldown)

2. **Should there be limits on venue referrals?**
   - Per day: Max 5 venue referrals per day
   - Per venue: Max 3 referrals per venue per day
   - Per friend: Can only refer same friend once per venue

3. **Should venues be able to customize rewards?**
   - Yes: Venues set their own referral rewards
   - No: Fixed rewards across all venues

4. **Should event invites expire?**
   - Yes: Only valid during event window
   - No: Valid until friend checks in (with time limit)

---

## Recommendation

**YES, implement all three types with venue-specific rewards:**

1. **App Referrals** - Keep current system (it works!)
2. **Venue Check-in Referrals** - Add this (high value for venues)
3. **Venue Attendance Invites** - Add this (great for events)

**Venue-Specific Rewards:**
- ✅ Both referrer and recipient should get venue-specific points
- ✅ Venues can customize rewards
- ✅ Track separately from app referrals
- ✅ Show in venue dashboards

This creates a comprehensive referral ecosystem that benefits users, venues, and the platform!



