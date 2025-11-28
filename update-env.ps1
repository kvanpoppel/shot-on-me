# Update .env File Script
# Helps you add MongoDB and Twilio credentials to backend/.env

Write-Host "🔧 Updating backend/.env file..." -ForegroundColor Cyan
Write-Host ""

$envPath = "backend\.env"

# Check if .env file exists
if (-not (Test-Path $envPath)) {
    Write-Host "Creating backend/.env file..." -ForegroundColor Yellow
    
    # Create basic .env file
    $defaultContent = @"
# Server Configuration
PORT=5000
NODE_ENV=development

# Database - MongoDB
# Replace with your MongoDB Atlas connection string
MONGODB_URI=mongodb://localhost:27017/shotonme

# JWT Authentication Secret
JWT_SECRET=129831f2872adbeedbf19335b5a0d0d5cabd5bf93721c2b314441371adae85d8

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Twilio - SMS Notifications
TWILIO_ACCOUNT_SID=your_twilio_account_sid
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
    Write-Host "✅ Created backend/.env file" -ForegroundColor Green
}

# Ask for MongoDB URI
Write-Host ""
Write-Host "📝 MongoDB Configuration" -ForegroundColor Yellow
Write-Host "Enter your MongoDB Atlas connection string:"
Write-Host "(Leave empty to skip, format: mongodb+srv://username:password@cluster.mongodb.net/shotonme)" -ForegroundColor Gray
$mongoUri = Read-Host "MongoDB URI"

if ($mongoUri -and $mongoUri -ne "") {
    # Update MongoDB URI in .env
    $content = Get-Content $envPath -Raw
    $content = $content -replace "MONGODB_URI=.*", "MONGODB_URI=$mongoUri"
    Set-Content -Path $envPath -Value $content -NoNewline
    Write-Host "✅ MongoDB URI updated" -ForegroundColor Green
}

# Ask for Twilio credentials
Write-Host ""
Write-Host "📱 Twilio Configuration" -ForegroundColor Yellow

$twilioSid = Read-Host "Twilio Account SID (or press Enter to skip)"
if ($twilioSid -and $twilioSid -ne "") {
    $content = Get-Content $envPath -Raw
    $content = $content -replace "TWILIO_ACCOUNT_SID=.*", "TWILIO_ACCOUNT_SID=$twilioSid"
    Set-Content -Path $envPath -Value $content -NoNewline
    Write-Host "✅ Twilio Account SID updated" -ForegroundColor Green
}

$twilioToken = Read-Host "Twilio Auth Token (or press Enter to skip)"
if ($twilioToken -and $twilioToken -ne "") {
    $content = Get-Content $envPath -Raw
    $content = $content -replace "TWILIO_AUTH_TOKEN=.*", "TWILIO_AUTH_TOKEN=$twilioToken"
    Set-Content -Path $envPath -Value $content -NoNewline
    Write-Host "✅ Twilio Auth Token updated" -ForegroundColor Green
}

$twilioPhone = Read-Host "Twilio Phone Number (format: +1234567890, or press Enter to skip)"
if ($twilioPhone -and $twilioPhone -ne "") {
    $content = Get-Content $envPath -Raw
    $content = $content -replace "TWILIO_PHONE_NUMBER=.*", "TWILIO_PHONE_NUMBER=$twilioPhone"
    Set-Content -Path $envPath -Value $content -NoNewline
    Write-Host "✅ Twilio Phone Number updated" -ForegroundColor Green
}

Write-Host ""
Write-Host "✨ Configuration updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Your backend/.env file has been updated with the provided credentials." -ForegroundColor Cyan
Write-Host "You can edit it manually if needed." -ForegroundColor Gray
Write-Host ""

