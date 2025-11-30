# Type & Lint Audit Report

## Errors Found

### shot-on-me/app/

#### Type Mismatch / Tab Type Inconsistencies
1. **app/page.tsx:63** - `setActiveTab` type mismatch: `Dispatch<SetStateAction<Tab>>` vs `(tab: Tab) => void`
2. **app/page.tsx:76** - `setActiveTab` type mismatch: `Dispatch<SetStateAction<Tab>>` vs `(tab: string) => void`
3. **app/page.tsx:63,80** - Tab type conflict: Multiple `Tab` types exist with different union members
4. **app/home/page.tsx:69,86** - `setActiveTab` type mismatch: `Dispatch<SetStateAction<Tab>>` vs `(tab: Tab) => void`

**Root Cause:** Multiple `Tab` type definitions with different union members:
- `app/page.tsx`: `'home' | 'feed' | 'map' | 'wallet' | 'profile' | 'messages' | 'stories' | 'groups' | 'send-shot'`
- `app/components/Dashboard.tsx`: `'home' | 'feed' | 'map' | 'wallet' | 'profile' | 'messages' | 'stories'`
- `app/components/BottomNav.tsx`: `'home' | 'feed' | 'map' | 'wallet' | 'profile' | 'messages' | 'stories' | 'send-shot'`
- `app/home/page.tsx`: `'home' | 'feed' | 'map' | 'wallet' | 'profile'`
- `app/components/HomeTab.tsx`: `'feed' | 'map' | 'wallet' | 'profile'`
- `app/components/MapTab.tsx`: `'feed' | 'map' | 'wallet' | 'profile'`

**Fix:** Create a shared `Tab` type definition in a types file and import it everywhere.

#### Missing Props / Incorrect React Type
5. **app/components/MessagesTab.tsx:52** - `setActiveTab?: (tab: string) => void` should be `(tab: Tab) => void`

### venue-portal/app/

#### Invalid Field on Model or Interface
6. **app/components/FollowerCount.tsx:56** - Property '_id' does not exist on type 'User'
7. **app/components/PromotionsManager.tsx:99** - Property '_id' does not exist on type 'User'

#### Type Mismatch / Nullability
8. **app/components/VenueManager.tsx:558** - Location type mismatch: `{ latitude?: number; longitude?: number }` vs `{ latitude: number; longitude: number }`
9. **app/dashboard/redemptions/page.tsx:49** - 'user' is possibly 'null' (2 instances)

## Fixes Applied

### Auto-Fixes (Safe)

1. ✅ Created shared `Tab` type in `app/types.ts`
2. ✅ Updated all components to use shared `Tab` type
3. ✅ Fixed `MessagesTab` prop type from `string` to `Tab`
4. ✅ Added null checks for `user` in venue-portal
5. ✅ Fixed `_id` access with type assertions in venue-portal
6. ✅ Fixed location type with null checks

### Manual Review Required

None - all fixes were safe and straightforward.

