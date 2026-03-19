# Backend Server Restart Script
# Stops existing listeners on port 5000 and starts exactly one backend dev server

Write-Host "Stopping backend server on port 5000..." -ForegroundColor Yellow

# Kill any process currently listening on port 5000
$listenerPids = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

if ($listenerPids) {
    foreach ($pid in $listenerPids) {
        Write-Host "  Found listener process: $pid" -ForegroundColor Cyan
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "  Listener processes stopped" -ForegroundColor Green
} else {
    Write-Host "  No process found on port 5000" -ForegroundColor Gray
}

# Kill duplicate backend nodemon/npm processes to prevent EADDRINUSE loops
$backendProcs = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -like "*shot-on-me-venue-portal\backend*" -and
    ($_.CommandLine -like "*nodemon*" -or $_.CommandLine -like "*npm-cli.js* run dev*" -or $_.CommandLine -like "*server.js*")
}

if ($backendProcs) {
    foreach ($proc in $backendProcs) {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Cyan
Write-Host "  Directory: $PWD" -ForegroundColor Gray
Write-Host "  Command: npm run dev" -ForegroundColor Gray
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'Backend Server (Port 5000)' -ForegroundColor Cyan; npm run dev"

Write-Host "Backend server started in new window." -ForegroundColor Green
Write-Host "Wait 5-10 seconds for server startup." -ForegroundColor Gray
Write-Host ""
Write-Host "Health check: http://localhost:5000/health" -ForegroundColor Yellow

