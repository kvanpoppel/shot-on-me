# Configuration Update Script
# Updates backend/.env with MongoDB and Twilio credentials

Write-Host "Updating backend/.env file..." -ForegroundColor Cyan
Write-Host ""

$envPath = "backend\.env"

# Check if .env exists, create if not
if (-not (Test-Path $envPath)) {
    Write-Host "Creating backend/.env file..." -ForegroundColor Yellow
    
    $mongoUri = 'mongodb+srv://katevanpoppel_db_user:ws0HmJskZzm6yvtW@cluster0.uoylpxu.mongodb.net/shotonme?retryWrites=true&w=majority'
    
    $defaultContent = @"
# Server Configuration
PORT=5000
NODE_ENV=development

# Database - MongoDB Atlas
MONGODB_URI=$mongoUri

# JWT Authentication Secret
JWT_SECRET=129831f2872adbeedbf19335b5a0d0d5cabd5bf93721c2b314441371adae85d8

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Twilio - SMS Notifications
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary - Media Uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe - Payment Processing (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
"@
    
    Set-Content -Path $envPath -Value $defaultContent
    Write-Host "Created backend/.env file" -ForegroundColor Green
} else {
    # Update existing .env file
    Write-Host "Updating existing backend/.env file..." -ForegroundColor Yellow
    $content = Get-Content $envPath -Raw
    
    # Update MongoDB URI
    $mongoUri = 'mongodb+srv://katevanpoppel_db_user:ws0HmJskZzm6yvtW@cluster0.uoylpxu.mongodb.net/shotonme?retryWrites=true&w=majority'
    $content = $content -replace "MONGODB_URI=.*", "MONGODB_URI=$mongoUri"
    
    # Update Twilio Account SID
    $content = $content -replace "TWILIO_ACCOUNT_SID=.*", "TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    
    Set-Content -Path $envPath -Value $content -NoNewline
    Write-Host "Updated MongoDB URI and Twilio Account SID" -ForegroundColor Green
}

Write-Host ""
Write-Host "Configuration updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Updated:" -ForegroundColor Cyan
Write-Host "  MongoDB URI" -ForegroundColor White
Write-Host "  Twilio Account SID: [Configured]" -ForegroundColor White
Write-Host ""
Write-Host "Still needed:" -ForegroundColor Yellow
Write-Host "  Twilio Auth Token" -ForegroundColor White
Write-Host "  Twilio Phone Number (format: plus-sign followed by digits)" -ForegroundColor White
Write-Host ""
Write-Host "Run this script again after you provide the remaining Twilio info," -ForegroundColor Gray
Write-Host "or edit backend/.env manually to add:" -ForegroundColor Gray
Write-Host "  TWILIO_AUTH_TOKEN=your_auth_token" -ForegroundColor Gray
Write-Host "  TWILIO_PHONE_NUMBER=(format: plus-sign followed by digits)" -ForegroundColor Gray
Write-Host ""

