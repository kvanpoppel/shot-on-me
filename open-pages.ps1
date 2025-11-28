# Open all services in browser
Write-Host "Opening services in browser..." -ForegroundColor Cyan

Start-Process "http://localhost:5000"
Start-Sleep -Milliseconds 500

Start-Process "http://localhost:3000"
Start-Sleep -Milliseconds 500

Start-Process "http://localhost:3001"

Write-Host "✅ All pages opened!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  Backend API:    http://localhost:5000" -ForegroundColor White
Write-Host "  Venue Portal:  http://localhost:3000" -ForegroundColor White
Write-Host "  Shot On Me:     http://localhost:3001" -ForegroundColor White


