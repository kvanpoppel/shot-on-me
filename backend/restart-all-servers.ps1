# Restart all development servers
# Stops listeners on common dev ports and prints restart commands.

Write-Host ""
Write-Host "STOPPING ALL SERVERS" -ForegroundColor Red
Write-Host ""

$ports = @(5000, 3000, 3001, 3002, 3003)
foreach ($port in $ports) {
    $processIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    if ($processIds) {
        foreach ($processId in $processIds) {
            Write-Host "  Killing process on port $port (PID: $processId)..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "All target processes stopped." -ForegroundColor Green
Write-Host ""
Write-Host "TO RESTART SERVERS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. BACKEND (port 5000):" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "2. SHOT ON ME APP (port 3001):" -ForegroundColor Yellow
Write-Host "   cd shot-on-me" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "3. VENUE PORTAL (if needed):" -ForegroundColor Yellow
Write-Host "   cd venue-portal" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. OWNER PORTAL (if needed):" -ForegroundColor Yellow
Write-Host "   cd owner-portal" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")



