# Restart All Services Script
# This script kills all Node processes and provides instructions to restart

Write-Host "🛑 Stopping all Node processes..." -ForegroundColor Yellow

# Kill processes on our ports
$ports = @(5000, 3000, 3001)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Write-Host "Killing process $process on port $port..." -ForegroundColor Cyan
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    }
}

# Kill all node processes (be careful with this)
# Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "✅ All processes stopped!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 To restart, open 3 separate PowerShell windows and run:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Window 1 - Backend:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Window 2 - Shot On Me App:" -ForegroundColor Yellow
Write-Host "  cd shot-on-me" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Window 3 - Venue Portal:" -ForegroundColor Yellow
Write-Host "  cd venue-portal" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

