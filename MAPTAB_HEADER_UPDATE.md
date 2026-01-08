# MapTab Header Update - Screenshot Match

## Key Changes Needed:

1. **Replace Header Section (lines 607-775)** with new design:
   - Location bar with city name (centered, white rounded bar)
   - Profile icon on left of location bar
   - Settings icon on right of location bar  
   - Exploration percentage badge below location
   - Temperature display below location
   - Remove search bar and filters (keep only for list view)

2. **Update Friend Markers** to include:
   - Friend names as labels
   - Timestamps (now, 1h, etc.)
   - Green dot for active status

3. **Add State Variables:**
   - currentCity (default: 'Indianapolis')
   - explorationPercent (default: 45.1)
   - temperature (default: 73)

4. **Update Props:**
   - Add onOpenSettings prop to interface
   - Pass from page.tsx

## Implementation:

The header should look like:
```
[Profile Icon] [Indianapolis] [Settings Icon]
[45.1% Explored] [73 °F]
```

Then the map view below with friend avatars showing names and timestamps.

