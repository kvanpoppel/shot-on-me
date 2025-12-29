# Check Which Servers Are Running
Write-Host "🔍 Checking Server Status..." -ForegroundColor Cyan
Write-Host ""

# Check Backend (Port 5000)
Write-Host "1️⃣ Backend (Port 5000):" -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($backend) {
    $process = Get-Process -Id $backend.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "   ✅ Running (PID: $($backend.OwningProcess))" -ForegroundColor Green
    Write-Host "   Process: $($process.ProcessName)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Not Running" -ForegroundColor Red
}
Write-Host ""

# Check Shot On Me (Port 3001)
Write-Host "2️⃣ Shot On Me App (Port 3001):" -ForegroundColor Yellow
$shotOnMe = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($shotOnMe) {
    $process = Get-Process -Id $shotOnMe.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "   ✅ Running (PID: $($shotOnMe.OwningProcess))" -ForegroundColor Green
    Write-Host "   Process: $($process.ProcessName)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Not Running" -ForegroundColor Red
}
Write-Host ""

# Check Venue Portal (Port 3000)
Write-Host "3️⃣ Venue Portal (Port 3000):" -ForegroundColor Yellow
$venuePortal = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($venuePortal) {
    $process = Get-Process -Id $venuePortal.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "   ✅ Running (PID: $($venuePortal.OwningProcess))" -ForegroundColor Green
    Write-Host "   Process: $($process.ProcessName)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Not Running" -ForegroundColor Red
}
Write-Host ""

# Check Owner Portal (Port 3002)
Write-Host "4️⃣ Owner Portal (Port 3002):" -ForegroundColor Yellow
$ownerPortal = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($ownerPortal) {
    $process = Get-Process -Id $ownerPortal.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "   ✅ Running (PID: $($ownerPortal.OwningProcess))" -ForegroundColor Green
    Write-Host "   Process: $($process.ProcessName)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Not Running" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "📊 Summary:" -ForegroundColor Cyan
$allRunning = $backend -and $shotOnMe
if ($allRunning) {
    Write-Host "   ✅ Essential servers are running" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Some servers are not running" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 To start all servers, run:" -ForegroundColor Cyan
    Write-Host "   .\start-all.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "   Or start individually:" -ForegroundColor Cyan
    if (-not $backend) {
        Write-Host "   • Backend: cd backend; npm run dev" -ForegroundColor White
    }
    if (-not $shotOnMe) {
        Write-Host "   • Shot On Me: cd shot-on-me; npm run dev" -ForegroundColor White
    }
}

