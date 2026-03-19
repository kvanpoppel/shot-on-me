# Start All Services and Keep Them Running
# This script starts all services and then monitors them continuously

Write-Host "Starting all services (keep-running mode)" -ForegroundColor Cyan
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
    Start-Sleep -Seconds 3
}

# Start all services
Write-Host "1) Starting Backend (Port 5000)..." -ForegroundColor Yellow
Start-ServiceIfNotRunning -ServiceName "Backend Server" -Directory "backend" -Port 5000

Write-Host "2) Starting Shot On Me App (Port 3001)..." -ForegroundColor Yellow
Start-ServiceIfNotRunning -ServiceName "Shot On Me App" -Directory "shot-on-me" -Port 3001

Write-Host "3) Starting Venue Portal (Port 3002)..." -ForegroundColor Yellow
Start-ServiceIfNotRunning -ServiceName "Venue Portal" -Directory "venue-portal" -Port 3002

Write-Host "4) Starting Owner Portal (Port 3000)..." -ForegroundColor Yellow
Start-ServiceIfNotRunning -ServiceName "Owner Portal" -Directory "owner-portal" -Port 3000

Write-Host ""
Write-Host "All services started." -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host "   Shot On Me: http://localhost:3001" -ForegroundColor White
Write-Host "   Owner Portal: http://localhost:3000" -ForegroundColor White
Write-Host "   Venue Portal: http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Starting keep-alive monitor..." -ForegroundColor Yellow
Write-Host "   (This will restart any service that stops)" -ForegroundColor Gray
Write-Host ""

# Start the keep-alive script in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; .\keep-all-running.ps1"

Write-Host "Monitor started. Services will auto-restart if they stop." -ForegroundColor Green
Write-Host ""
Write-Host "To stop everything, close all PowerShell windows." -ForegroundColor Yellow

