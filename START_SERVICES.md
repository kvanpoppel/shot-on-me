# How to Start All Services

## Quick Start (All at Once)

Run this command in PowerShell from the project root:

```powershell
.\start-all.ps1
```

This will open 3 separate PowerShell windows, one for each service.

## Individual Services

### Option 1: Using PowerShell Scripts

**Backend:**
```powershell
.\start-backend.ps1
```

**Venue Portal:**
```powershell
.\start-venueportal.ps1
```

**Shot On Me:**
```powershell
.\start-shot-on-me.ps1
```

### Option 2: Manual Commands

**Backend (Port 5000):**
```powershell
cd backend
npm run dev
```

**Venue Portal (Port 3000):**
```powershell
cd venue-portal
npm run dev
```

**Shot On Me (Port 3001):**
```powershell
cd shot-on-me
npm run dev
```

## Access URLs

Once started, access the services at:

- **Backend API**: http://localhost:5000
- **Venue Portal**: http://localhost:3000
- **Shot On Me App**: http://localhost:3001

## Open Pages in Browser

To open all pages at once:

```powershell
.\open-pages.ps1
```

## Notes

- Each service runs in its own terminal window
- Press `Ctrl+C` in each window to stop that service
- Make sure MongoDB is running (or using MongoDB Atlas)
- First time? Run `npm install` in each directory if needed

