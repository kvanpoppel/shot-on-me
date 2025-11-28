# Update Twilio Configuration
# Adds Twilio Auth Token and Phone Number to backend/.env

Write-Host "Updating Twilio configuration..." -ForegroundColor Cyan
Write-Host ""

$envPath = "backend\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "Error: backend/.env file not found!" -ForegroundColor Red
    Write-Host "Run .\update-config.ps1 first to create the file." -ForegroundColor Yellow
    exit 1
}

# Read current .env file
$content = Get-Content $envPath -Raw

# Twilio credentials
$twilioToken = 'cc9f16a805d1094f723c4b3e4d768f6c'
$twilioPhone = '+18664819511'

# Update Twilio Auth Token
if ($content -match 'TWILIO_AUTH_TOKEN=.*') {
    $content = $content -replace 'TWILIO_AUTH_TOKEN=.*', "TWILIO_AUTH_TOKEN=$twilioToken"
    Write-Host "Updated Twilio Auth Token" -ForegroundColor Green
} else {
    Write-Host "Warning: TWILIO_AUTH_TOKEN not found in .env file" -ForegroundColor Yellow
}

# Update Twilio Phone Number
if ($content -match 'TWILIO_PHONE_NUMBER=.*') {
    $content = $content -replace 'TWILIO_PHONE_NUMBER=.*', "TWILIO_PHONE_NUMBER=$twilioPhone"
    Write-Host "Updated Twilio Phone Number" -ForegroundColor Green
} else {
    Write-Host "Warning: TWILIO_PHONE_NUMBER not found in .env file" -ForegroundColor Yellow
}

# Write updated content back to file
Set-Content -Path $envPath -Value $content -NoNewline

Write-Host ""
Write-Host "Twilio configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Configured:" -ForegroundColor Cyan
Write-Host "  Twilio Account SID: [Configured]" -ForegroundColor White
Write-Host "  Twilio Auth Token: $twilioToken" -ForegroundColor White
Write-Host "  Twilio Phone Number: $twilioPhone" -ForegroundColor White
Write-Host ""
Write-Host "Everything is now configured!" -ForegroundColor Green
Write-Host "You can test the backend with: cd backend && npm run dev" -ForegroundColor Cyan
Write-Host ""

