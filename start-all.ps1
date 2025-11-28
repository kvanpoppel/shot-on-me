# Start All Services Script
# This script starts the backend, venue-portal, and shot-on-me apps

Write-Host "🚀 Starting Shot On Me & Venue Portal..." -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running (basic check)
Write-Host "Checking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongoCheck = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($mongoCheck) {
        Write-Host "✅ MongoDB appears to be running on port 27017" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB may not be running. Make sure MongoDB is started." -ForegroundColor Yellow
        Write-Host "   Or update MONGODB_URI in backend/.env to use MongoDB Atlas" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not check MongoDB. Make sure it's running." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting services in separate windows..." -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "📡 Starting Backend API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'Backend API - Port 5000' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 3

# Start Venue Portal
Write-Host "🌐 Starting Venue Portal..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\venue-portal'; Write-Host 'Venue Portal - Port 3000' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Start Shot On Me App
Write-Host "📱 Starting Shot On Me App..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\shot-on-me'; Write-Host 'Shot On Me App - Port 3001' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "All services starting!" -ForegroundColor Green
Write-Host ""
Write-Host "Services will open in separate windows:" -ForegroundColor Cyan
Write-Host "  Backend API:    http://localhost:5000" -ForegroundColor White
Write-Host "  Venue Portal:  http://venueportal:3000" -ForegroundColor White
Write-Host "  Shot On Me:     http://shotonme:3001" -ForegroundColor White
Write-Host ""
Write-Host "Note: Make sure to run setup-hosts.ps1 as Administrator first!" -ForegroundColor Yellow
Write-Host "     This will add venueportal and shotonme to your hosts file" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop that service" -ForegroundColor Gray


