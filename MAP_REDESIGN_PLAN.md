# Map Redesign Plan - Matching Screenshot

## Changes Needed:

1. **Header Redesign:**
   - Replace current header with location bar showing city name
   - Add profile icon on left of location bar
   - Add settings icon on right of location bar
   - Add exploration percentage badge below location
   - Add temperature display below location

2. **Friend Markers Enhancement:**
   - Show friend names as labels below avatars
   - Show timestamps (now, 1h, etc.) next to names
   - Add green dot indicator for active friends

3. **Contact Permissions:**
   - Ensure contact permissions are properly requested
   - Add to PermissionsManager if not already there

4. **Map View:**
   - Remove search bar from header (moved to bottom nav)
   - Remove filter dropdown (can be added back later if needed)
   - Focus on map view with friend locations

## Implementation Steps:

1. Update MapTab header to match screenshot design
2. Enhance friend markers with labels and timestamps
3. Add exploration percentage calculation
4. Add temperature display (can use weather API or mock)
5. Verify contact permissions integration

