# Restart all services script
# Stops listeners on known dev ports and prints restart commands.

Write-Host "Stopping all node listeners..." -ForegroundColor Yellow

$ports = @(5000, 3000, 3001, 3002)
foreach ($port in $ports) {
    $processIds = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    if ($processIds) {
        foreach ($processId in $processIds) {
            Write-Host "Killing process $processId on port $port..." -ForegroundColor Cyan
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

Start-Sleep -Seconds 2

Write-Host "All configured ports have been cleaned up." -ForegroundColor Green
Write-Host ""
Write-Host "To restart, open 4 PowerShell windows and run:" -ForegroundColor Cyan
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
Write-Host "Window 4 - Owner Portal:" -ForegroundColor Yellow
Write-Host "  cd owner-portal" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

