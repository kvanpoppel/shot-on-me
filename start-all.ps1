# Start All Servers Script
# Run this from the project root to start all 4 servers

Write-Host "Starting all servers..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PWD

function Start-ServiceIfNotRunning {
  param(
    [string]$ServiceName,
    [string]$Directory,
    [int]$Port
  )

  $running = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($running) {
    Write-Host "   $ServiceName already running on port $Port, skipping..." -ForegroundColor Gray
    return
  }

  Write-Host "   Launching $ServiceName on port $Port..." -ForegroundColor Yellow
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\$Directory'; Write-Host '$ServiceName (Port $Port)' -ForegroundColor Cyan; npm run dev"
  Start-Sleep -Seconds 2
}

# Backend (Port 5000)
Write-Host "1) Starting Backend (Port 5000)..." -ForegroundColor Yellow
Start-ServiceIfNotRunning -ServiceName "Backend Server" -Directory "backend" -Port 5000

# Shot On Me (Port 3001)
Write-Host "2) Starting Shot On Me App (Port 3001)..." -ForegroundColor Yellow
Start-ServiceIfNotRunning -ServiceName "Shot On Me App" -Directory "shot-on-me" -Port 3001

# Venue Portal (Port 3002)
Write-Host "3) Starting Venue Portal (Port 3002)..." -ForegroundColor Yellow
Start-ServiceIfNotRunning -ServiceName "Venue Portal" -Directory "venue-portal" -Port 3002

# Owner Portal (Port 3000)
Write-Host "4) Starting Owner Portal (Port 3000)..." -ForegroundColor Yellow
Start-ServiceIfNotRunning -ServiceName "Owner Portal" -Directory "owner-portal" -Port 3000

Write-Host ""
Write-Host "All 4 servers are starting in separate windows." -ForegroundColor Green
Write-Host ""
Write-Host "Wait 15-20 seconds for all servers to fully start." -ForegroundColor Yellow
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host "   Shot On Me: http://localhost:3001" -ForegroundColor White
Write-Host "   Owner Portal: http://localhost:3000" -ForegroundColor White
Write-Host "   Venue Portal: http://localhost:3002" -ForegroundColor White
