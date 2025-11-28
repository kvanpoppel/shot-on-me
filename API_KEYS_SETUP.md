# API Keys Setup

## Google Maps API Key & Render Service ID Configuration

The following API keys have been configured in both applications:

### Google Maps API Key
```
AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
```

### Render Service ID
```
srv-d3i7318dl3ps73cvlv00
```

## Configuration Status

### ✅ Shot On Me App (`shot-on-me/`)
- **next.config.js**: Updated with Google Maps API key and Render Service ID
- **Google Maps Integration**: 
  - Places Autocomplete for venue search
  - Google Maps component for displaying venues
  - Location-based features enabled

### ✅ Venue Portal (`venue-portal/`)
- **next.config.js**: Updated with Google Maps API key and Render Service ID
- **Google Maps Package**: Installed `@react-google-maps/api`

## Environment Variables

Both applications are configured to use these values. The API keys are set as defaults in `next.config.js` files, but you should also create `.env.local` files for local development:

### Shot On Me App - `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
RENDER_SERVICE_ID=srv-d3i7318dl3ps73cvlv00
```

### Venue Portal - `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
RENDER_SERVICE_ID=srv-d3i7318dl3ps73cvlv00
```

## Features Enabled

### Shot On Me App
- ✅ Google Places Autocomplete in venue search
- ✅ Google Maps display for venues
- ✅ Location-based venue discovery
- ✅ Directions integration

### Venue Portal
- ✅ Google Maps API configured
- ✅ Ready for address autocomplete (can be added to VenueManager)

## Next Steps

1. **Restart Development Servers**: After updating `.env.local` files, restart both apps:
   ```bash
   # Shot On Me
   cd shot-on-me
   npm run dev
   
   # Venue Portal
   cd venue-portal
   npm run dev
   ```

2. **Verify Google Maps API**: 
   - Ensure the API key has the following APIs enabled in Google Cloud Console:
     - Maps JavaScript API
     - Places API
     - Geocoding API (if needed)

3. **Production Deployment**:
   - Add these environment variables to your Render/Vercel deployment settings
   - The Render Service ID can be used for backend service identification

## Security Note

⚠️ **Important**: These API keys are now in the codebase. For production:
- Set up API key restrictions in Google Cloud Console
- Restrict the key to specific domains/IPs
- Use environment variables in production deployments
- Never commit `.env.local` files to version control

