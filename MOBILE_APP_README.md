# 📱 Shot On Me - Mobile App Setup

Your Shot On Me app is now configured as a **Progressive Web App (PWA)**! This means users can install it on their mobile devices just like a native app.

## ✅ What's Done

- ✅ **PWA Configuration** - Complete setup with next-pwa
- ✅ **Service Worker** - Auto-generated for offline functionality
- ✅ **Manifest** - Full app manifest with metadata
- ✅ **Caching Strategy** - Smart caching for fast performance
- ✅ **Mobile Meta Tags** - iOS and Android support

## 🚀 Quick Start

### 1. Build for Production

```bash
cd shot-on-me
npm run build
npm start
```

### 2. Create App Icons

You need icons in multiple sizes. Choose one:

**Option A: Use Online Tool (Easiest)**
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your logo (512x512px minimum)
3. Download and extract to `public/` folder

**Option B: Use Script**
1. Place your icon as `public/icon-source.png` (512x512px)
2. Install sharp: `npm install sharp --save-dev`
3. Run: `node scripts/generate-icons.js`

**Required Icons:**
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png (you may already have this)
- icon-384x384.png
- icon-512x512.png

### 3. Test Installation

**On Android (Chrome):**
1. Open `http://localhost:3001` (or your production URL)
2. Tap menu (3 dots) → "Add to Home screen"
3. Confirm installation

**On iOS (Safari):**
1. Open `http://localhost:3001` (or your production URL)
2. Tap Share button → "Add to Home Screen"
3. Customize name → "Add"

## 📋 Features

### Offline Support
- Pages cached for offline access
- API calls cached with network-first strategy
- Images and assets cached for fast loading

### App-Like Experience
- Standalone display (no browser UI)
- Custom splash screen
- App shortcuts (Send Shot, Find Venues)
- Full-screen experience

### Performance
- Smart caching strategies
- Fast page loads
- Reduced data usage

## 🔧 Configuration Files

- `next.config.js` - PWA and service worker config
- `public/manifest.json` - App metadata
- `app/layout.tsx` - Meta tags and manifest link

## 📱 Production Deployment

### For Vercel/Netlify:
1. Build: `npm run build`
2. Deploy (service worker auto-generated)
3. Ensure HTTPS is enabled
4. Test installation on mobile devices

### For Custom Server:
1. Build: `npm run build`
2. Start: `npm start`
3. Ensure HTTPS is configured
4. Service worker files will be in `public/` folder

## ⚠️ Important Notes

1. **HTTPS Required** - PWA features only work on HTTPS (or localhost)
2. **Production Build** - Service worker only generated in production
3. **Icons Required** - All icon sizes must exist for best compatibility
4. **Development** - PWA disabled in dev mode for faster reloads

## 🐛 Troubleshooting

**"Add to Home Screen" not appearing?**
- ✅ Check you're on HTTPS or localhost
- ✅ Verify `/manifest.json` is accessible
- ✅ Check browser console for errors
- ✅ Ensure all icons exist
- ✅ Clear browser cache

**Service worker not working?**
- ✅ Make sure you ran `npm run build`
- ✅ Check `public/` folder for `sw.js`
- ✅ Verify in Chrome DevTools → Application → Service Workers

**Icons not showing?**
- ✅ Verify all icon files exist in `public/`
- ✅ Check manifest.json references correct paths
- ✅ Clear browser cache

## 🎨 Customization

### Change App Name
Edit `public/manifest.json`:
```json
{
  "name": "Your App Name",
  "short_name": "Short Name"
}
```

### Change Theme Color
Edit `public/manifest.json` and `app/layout.tsx`:
- `theme_color` in manifest
- `themeColor` in layout metadata

### Add More Shortcuts
Edit `public/manifest.json` → `shortcuts` array

## 📚 Resources

- [PWA Builder](https://www.pwabuilder.com/) - Icon generator and PWA tools
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)

---

**Your app is ready to be installed! 🎉**

Build it, deploy it, and users can install it on their phones just like a native app!

