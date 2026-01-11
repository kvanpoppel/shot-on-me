# Fix: Geocoding API Key Authorization Error

## Error Message
```
Geocoding Service: This API key is not authorized to use this service or API.
```

## Solution

Your Geocoding API is **enabled**, but your **API key doesn't have permission** to use it. This happens when your API key has restrictions.

### Quick Fix (Recommended for Development)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API key: `AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8`
3. Find **"API restrictions"** section
4. Select: **"Don't restrict key"** (for development)
5. Click **"Save"**
6. Wait 1-2 minutes
7. Refresh your browser (Ctrl+Shift+R)

### Alternative Fix (If You Want Restrictions)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API key
3. Under **"API restrictions"**, select **"Restrict key"**
4. Under **"Select APIs"**, make sure these are checked:
   - ✅ **Geocoding API** (REQUIRED - this is what's missing!)
   - ✅ Maps JavaScript API
   - ✅ Places API (if you use places)
5. Click **"Save"**
6. Wait 1-2 minutes
7. Refresh your browser

## What APIs Do You Need?

Based on your codebase, you need:
- ✅ **Geocoding API** - For converting coordinates to addresses (city names)
- ✅ **Maps JavaScript API** - For displaying maps
- ✅ **Places API** - For place autocomplete

## Verify It's Working

After making changes:
1. Wait 1-2 minutes for Google to propagate changes
2. Hard refresh browser (Ctrl+Shift+R)
3. Check console - the Geocoding error should be gone
4. The geocoding should work automatically (no code changes needed)

## Notes

- **Billing must be enabled** for Geocoding API (but Google gives $200/month free credit)
- Changes can take 1-2 minutes to propagate
- The code already handles errors gracefully, so your app won't break if geocoding fails
