# Backend Server Restart Script
# This script stops any process on port 5000 and restarts the backend server

Write-Host "🛑 Stopping backend server on port 5000..." -ForegroundColor Yellow

# Find and stop process on port 5000
$process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "   Found process: $process" -ForegroundColor Cyan
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   ✅ Process stopped" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No process found on port 5000" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 Starting backend server..." -ForegroundColor Cyan
Write-Host "   Directory: $PWD" -ForegroundColor Gray
Write-Host "   Command: npm run dev" -ForegroundColor Gray
Write-Host ""

# Start backend server in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host '🚀 Backend Server (Port 5000)' -ForegroundColor Cyan; npm run dev"

Write-Host "✅ Backend server starting in new window!" -ForegroundColor Green
Write-Host "   Wait 5-10 seconds for server to fully start" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 To test if it's ready, run:" -ForegroundColor Yellow
Write-Host "   Invoke-RestMethod -Uri http://localhost:5000/api/payments/stripe-key -Method GET" -ForegroundColor Gray

