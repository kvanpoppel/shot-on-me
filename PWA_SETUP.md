# PWA Setup Guide for Shot On Me

## ✅ What's Been Configured

1. **next-pwa** - Installed and configured for service worker management
2. **manifest.json** - Updated with complete PWA configuration
3. **Layout** - Updated with PWA meta tags and manifest link
4. **Service Worker** - Will be auto-generated on build

## 📱 Creating App Icons

You need to create app icons in multiple sizes. Here are your options:

### Option 1: Use an Online Tool (Recommended)
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your logo/icon (at least 512x512px)
3. Download the generated icons
4. Place them in the `public/` folder with these names:
   - `icon-72x72.png`
   - `icon-96x96.png`
   - `icon-128x128.png`
   - `icon-144x144.png`
   - `icon-152x152.png`
   - `icon-192x192.png` (already exists)
   - `icon-384x384.png`
   - `icon-512x512.png`

### Option 2: Use a Design Tool
Create icons with these specifications:
- **Format**: PNG
- **Background**: Transparent or solid color
- **Design**: Your app logo/icon
- **Sizes**: 72, 96, 128, 144, 152, 192, 384, 512 pixels (square)

### Option 3: Quick Placeholder (For Testing)
If you just want to test the PWA functionality, you can:
1. Copy `icon-192x192.png` to create all other sizes
2. Use an image editor to resize it

## 🚀 Building for Production

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **The service worker will be generated automatically** in the `public/` folder

## 📲 Installing on Mobile Devices

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (3 dots)
3. Select "Add to Home screen" or "Install app"
4. Confirm installation

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Customize the name if needed
5. Tap "Add"

### Testing Locally
1. Make sure you're accessing via HTTPS or localhost
2. Use Chrome DevTools → Application → Service Workers to verify
3. Check the "Add to Home Screen" prompt appears

## 🔧 Configuration

The PWA is configured in:
- `next.config.js` - Service worker and caching strategies
- `public/manifest.json` - App metadata and icons
- `app/layout.tsx` - Meta tags and manifest link

## ⚠️ Important Notes

- **Development**: PWA is disabled in development mode for faster reloads
- **Production**: Service worker only works in production builds
- **HTTPS Required**: PWA features require HTTPS (except localhost)
- **Icons**: All icon sizes must exist for best compatibility

## 🐛 Troubleshooting

If the "Add to Home Screen" prompt doesn't appear:
1. Check that you're on HTTPS or localhost
2. Verify manifest.json is accessible at `/manifest.json`
3. Check browser console for errors
4. Ensure all required icons exist
5. Clear browser cache and try again

