# 🔄 Backend Restart Commands

## Quick Restart (Copy & Paste)

```powershell
# Stop process on port 5000
Get-NetTCPConnection -LocalPort 5000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force

# Navigate to backend directory
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend

# Start server
npm run dev
```

## Or Use the Script

```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
.\restart-backend.ps1
```

## One-Liner (If already in backend directory)

```powershell
Get-NetTCPConnection -LocalPort 5000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force; npm run dev
```

