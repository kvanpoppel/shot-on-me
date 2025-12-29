# Restart All Development Servers
# This script stops all servers and provides commands to restart them

Write-Host ""
Write-Host "🛑 STOPPING ALL SERVERS" -ForegroundColor Red
Write-Host ""

# Kill processes on common ports
$ports = @(5000, 3000, 3001, 3002, 3003)

foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        foreach ($pid in $process) {
            Write-Host "  Killing process on port $port (PID: $pid)..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "✅ All processes stopped" -ForegroundColor Green
Write-Host ""
Write-Host "📋 TO RESTART SERVERS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. BACKEND (port 5000):" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor White
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



