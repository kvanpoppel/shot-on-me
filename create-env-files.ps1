# Create .env.local files for frontend apps

Write-Host "Creating .env.local files..." -ForegroundColor Cyan
Write-Host ""

# Venue Portal .env.local
$venuePortalEnv = "NEXT_PUBLIC_API_URL=http://localhost:5000/api"
Set-Content -Path "venue-portal\.env.local" -Value $venuePortalEnv
Write-Host "Created venue-portal/.env.local" -ForegroundColor Green

# Shot On Me .env.local
$shotOnMeEnv = @"
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
"@
Set-Content -Path "shot-on-me\.env.local" -Value $shotOnMeEnv
Write-Host "Created shot-on-me/.env.local" -ForegroundColor Green

# Owner Portal .env.local
$ownerPortalEnv = "NEXT_PUBLIC_API_URL=http://localhost:5000/api"
Set-Content -Path "owner-portal\.env.local" -Value $ownerPortalEnv
Write-Host "Created owner-portal/.env.local" -ForegroundColor Green

Write-Host ""
Write-Host "All .env.local files created!" -ForegroundColor Green
Write-Host ""
Write-Host "You're now ready to start everything:" -ForegroundColor Cyan
Write-Host "  1. Start backend: Set-Location backend; npm run dev" -ForegroundColor White
Write-Host "  2. Start shot-on-me: Set-Location shot-on-me; npm run dev" -ForegroundColor White
Write-Host "  3. Start owner-portal: Set-Location owner-portal; npm run dev" -ForegroundColor White
Write-Host "  4. Start venue-portal: Set-Location venue-portal; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or use: .\start-all.ps1" -ForegroundColor Cyan

