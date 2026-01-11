# 🔧 Fix Next.js 404 Errors for Static Chunks

## ⚠️ Error
```
Failed to load resource: the server responded with a status of 404 (Not Found)
:3001/_next/static/chunks/app-pages-internals.js:1
```

## 🎯 Solution: Restart Next.js Dev Server

The Next.js dev server needs to be restarted to rebuild the static chunks.

### Quick Fix Steps:

1. **Stop the current dev server** (if running)
   - Find the PowerShell window running `npm run dev` for shot-on-me
   - Press `Ctrl+C` to stop it

2. **Clear the build cache** (optional but recommended):
   ```powershell
   cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   ```

3. **Restart the dev server**:
   ```powershell
   cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me
   npm run dev
   ```

4. **Wait for the server to start** (you should see "Ready" message)

5. **Refresh your browser** at `http://localhost:3001`

---

## 🔄 Alternative: Use the Start Script

Or use the start-all script to restart everything:

```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal
.\start-all.ps1
```

This will restart all 4 servers (backend, shot-on-me, venue-portal, owner-portal).

---

## 💡 Why This Happens

Next.js 404 errors for static chunks usually happen when:
- The dev server crashed or was stopped incorrectly
- The `.next` build cache is corrupted
- Code changes weren't properly compiled
- The server needs to rebuild the chunks

**Solution:** Restart the dev server to rebuild everything.
