# Start All Servers Script
# Run this from the project root to start all 4 servers

Write-Host "🚀 Starting All Servers..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PWD

# Backend (Port 5000)
Write-Host "1️⃣ Starting Backend (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; Write-Host '🚀 Backend Server (Port 5000)' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 2

# Shot On Me (Port 3001)
Write-Host "2️⃣ Starting Shot On Me App (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\shot-on-me'; Write-Host '🚀 Shot On Me App (Port 3001)' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 2

# Venue Portal (Port 3000)
Write-Host "3️⃣ Starting Venue Portal (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\venue-portal'; Write-Host '🚀 Venue Portal (Port 3000)' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 2

# Owner Portal (Port 3002)
Write-Host "4️⃣ Starting Owner Portal (Port 3002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\owner-portal'; Write-Host '🚀 Owner Portal (Port 3002)' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "✅ All 4 servers starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Wait 15-20 seconds for all servers to fully start" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host "   Shot On Me: http://localhost:3001" -ForegroundColor White
Write-Host "   Venue Portal: http://localhost:3000" -ForegroundColor White
Write-Host "   Owner Portal: http://localhost:3002" -ForegroundColor White
