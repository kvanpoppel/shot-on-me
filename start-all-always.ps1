# Start All Services and Keep Them Running
# This script starts all services and then monitors them continuously

Write-Host "🚀 Starting All Services (Keep Running Mode)" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PWD

# Start all services
Write-Host "1️⃣ Starting Backend (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; Write-Host '🚀 Backend Server (Port 5000)' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 3

Write-Host "2️⃣ Starting Shot On Me App (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\shot-on-me'; Write-Host '🚀 Shot On Me App (Port 3001)' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 3

Write-Host "3️⃣ Starting Venue Portal (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\venue-portal'; Write-Host '🚀 Venue Portal (Port 3000)' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 3

Write-Host "4️⃣ Starting Owner Portal (Port 3002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\owner-portal'; Write-Host '🚀 Owner Portal (Port 3002)' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host "   Shot On Me: http://localhost:3001" -ForegroundColor White
Write-Host "   Venue Portal: http://localhost:3000" -ForegroundColor White
Write-Host "   Owner Portal: http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Starting keep-alive monitor..." -ForegroundColor Yellow
Write-Host "   (This will restart any service that stops)" -ForegroundColor Gray
Write-Host ""

# Start the keep-alive script in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; .\keep-all-running.ps1"

Write-Host "✅ Monitor started! Services will auto-restart if they stop." -ForegroundColor Green
Write-Host ""
Write-Host "💡 To stop everything, close all PowerShell windows" -ForegroundColor Yellow

