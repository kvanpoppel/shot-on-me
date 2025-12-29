# Keep All Services Running - Auto-Restart Script
# This script ensures all services stay running at all times

Write-Host "🔄 Keep All Services Running Script" -ForegroundColor Cyan
Write-Host "This will check and restart services every 30 seconds" -ForegroundColor Yellow
Write-Host ""

$projectRoot = $PWD
$checkInterval = 30 # seconds

function CheckAndStartService {
    param(
        [string]$ServiceName,
        [string]$Directory,
        [int]$Port,
        [string]$Command
    )
    
    # Check if port is in use
    $portInUse = netstat -ano | findstr "LISTENING" | findstr ":$Port"
    
    if (-not $portInUse) {
        Write-Host "⚠️  $ServiceName (Port $Port) is NOT running - Starting now..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\$Directory'; Write-Host '🚀 $ServiceName (Port $Port)' -ForegroundColor Cyan; $Command"
        Start-Sleep -Seconds 3
        return $true
    } else {
        Write-Host "✅ $ServiceName (Port $Port) is running" -ForegroundColor Green
        return $false
    }
}

# Main loop
while ($true) {
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Checking services..." -ForegroundColor Cyan
    
    $restarted = $false
    
    # Check and start Backend
    if (CheckAndStartService -ServiceName "Backend API" -Directory "backend" -Port 5000 -Command "npm run dev") {
        $restarted = $true
    }
    
    # Check and start Shot On Me
    if (CheckAndStartService -ServiceName "Shot On Me App" -Directory "shot-on-me" -Port 3001 -Command "npm run dev") {
        $restarted = $true
    }
    
    # Check and start Venue Portal
    if (CheckAndStartService -ServiceName "Venue Portal" -Directory "venue-portal" -Port 3000 -Command "npm run dev") {
        $restarted = $true
    }
    
    # Check and start Owner Portal
    if (CheckAndStartService -ServiceName "Owner Portal" -Directory "owner-portal" -Port 3002 -Command "npm run dev") {
        $restarted = $true
    }
    
    if ($restarted) {
        Write-Host "`n⏳ Waiting 10 seconds for services to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
    
    Write-Host "`n✅ All services checked. Next check in $checkInterval seconds..." -ForegroundColor Green
    Start-Sleep -Seconds $checkInterval
}

