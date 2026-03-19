# Start Backend Server
# PowerShell script to start the backend API

Write-Host "Starting Backend API..." -ForegroundColor Cyan
Write-Host ""

Set-Location backend
npm run dev
