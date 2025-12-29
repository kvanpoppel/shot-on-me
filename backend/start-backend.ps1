# Backend Server Startup Script
# Double-click this file or run: .\start-backend.ps1

Write-Host "🚀 Starting Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Get the directory where this script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Directory: $scriptDir" -ForegroundColor Gray
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Start the server
Write-Host "Starting server with: npm run dev" -ForegroundColor Yellow
Write-Host ""
npm run dev

