# Check which servers are running
Write-Host "Checking server status..." -ForegroundColor Cyan
Write-Host ""

function Show-ServiceStatus {
    param(
        [string]$Label,
        [int]$Port
    )

    Write-Host "$Label (Port $Port):" -ForegroundColor Yellow
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -gt 0 } |
        Select-Object -First 1
    if ($connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  [OK] Running (PID: $($connection.OwningProcess))" -ForegroundColor Green
        if ($process) {
            Write-Host "  Process: $($process.ProcessName)" -ForegroundColor Gray
        }
        return $true
    }

    Write-Host "  [X] Not running" -ForegroundColor Red
    return $false
}

$backendRunning = Show-ServiceStatus -Label "1) Backend" -Port 5000
Write-Host ""
$shotOnMeRunning = Show-ServiceStatus -Label "2) Shot On Me App" -Port 3001
Write-Host ""
$venueRunning = Show-ServiceStatus -Label "3) Venue Portal" -Port 3002
Write-Host ""
$ownerRunning = Show-ServiceStatus -Label "4) Owner Portal" -Port 3000
Write-Host ""

Write-Host "Summary:" -ForegroundColor Cyan
$allRunning = $backendRunning -and $shotOnMeRunning -and $venueRunning -and $ownerRunning
if ($allRunning) {
    Write-Host "  [OK] All services are running." -ForegroundColor Green
    return
}

Write-Host "  [!] Some services are not running." -ForegroundColor Yellow
Write-Host ""
Write-Host "Start all services with:" -ForegroundColor Cyan
Write-Host "  .\start-all.ps1" -ForegroundColor White

