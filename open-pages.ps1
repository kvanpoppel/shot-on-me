# Open all services in browser
Write-Host "Opening services in browser..." -ForegroundColor Cyan

# Check if servers are running
Write-Host "Checking server status..." -ForegroundColor Yellow
$backendRunning = (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue) -ne $null
$ownerPortalRunning = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue) -ne $null
$shotOnMeRunning = (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue) -ne $null
$venuePortalRunning = (Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue) -ne $null

if ($backendRunning) {
    Write-Host "Backend (5000) is running" -ForegroundColor Green
    Start-Process "http://localhost:5000"
} else {
    Write-Host "Backend (5000) is NOT running" -ForegroundColor Red
}
Start-Sleep -Milliseconds 500

if ($ownerPortalRunning) {
    Write-Host "Owner Portal (3000) is running" -ForegroundColor Green
    Start-Process "http://localhost:3000"
} else {
    Write-Host "Owner Portal (3000) is NOT running" -ForegroundColor Red
}
Start-Sleep -Milliseconds 500

if ($shotOnMeRunning) {
    Write-Host "Shot On Me (3001) is running" -ForegroundColor Green
    # Open with cache-busting parameter to force fresh load
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    Start-Process "http://localhost:3001?_t=$timestamp"
} else {
    Write-Host "Shot On Me (3001) is NOT running" -ForegroundColor Red
    Write-Host "  Please start the server first!" -ForegroundColor Yellow
}
Start-Sleep -Milliseconds 500

if ($venuePortalRunning) {
    Write-Host "Venue Portal (3002) is running" -ForegroundColor Green
    Start-Process "http://localhost:3002"
} else {
    Write-Host "Venue Portal (3002) is NOT running" -ForegroundColor Red
}

Write-Host ""
Write-Host "All pages opened!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  Backend API:    http://localhost:5000" -ForegroundColor White
Write-Host "  Owner Portal:   http://localhost:3000" -ForegroundColor White
Write-Host "  Shot On Me:     http://localhost:3001" -ForegroundColor White
Write-Host "  Venue Portal:   http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Tip: If Shot On Me shows a blank page, try:" -ForegroundColor Yellow
Write-Host "   1. Hard refresh (Ctrl+Shift+R or Ctrl+F5)" -ForegroundColor White
Write-Host "   2. Clear browser cache" -ForegroundColor White
Write-Host "   3. Check browser console for errors" -ForegroundColor White
