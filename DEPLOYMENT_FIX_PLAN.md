# Fix: Make www.shotonme.com Match localhost:3001

## Problem Identified

**www.shotonme.com** is running an OLDER version of the code:
- ❌ Bottom Nav: Home, Feed, Stories, Venues, Messages, Send Shot (6 items - OLD)
- ❌ Menu: Missing Tonight, My Venues, Badges, Leaderboards, Rewards, Referrals

**localhost:3001** has the CORRECT version:
- ✅ Bottom Nav: Feed, Venues, Wallet, Send Shot (4 items - CORRECT)
- ✅ Menu: Tonight, My Venues, Badges, Leaderboards, Rewards, Referrals, Settings, Notifications, Find Friends, Friend Locations, Log Out

## Solution

The code in the repository is CORRECT. We need to:
1. Ensure all changes are committed
2. Push to GitHub
3. Trigger Vercel redeploy

## Files That Need to Match

- `shot-on-me/app/components/BottomNav.tsx` - Has correct 4-item nav
- `shot-on-me/app/components/Dashboard.tsx` - Has all menu items

## Next Steps

1. Commit any uncommitted changes
2. Push to main branch
3. Vercel will auto-deploy
4. Verify www.shotonme.com matches localhost:3001

