# Configuration Update Script - Fixed Version
# Updates backend/.env with MongoDB and Twilio credentials

Write-Host "Updating backend/.env file..." -ForegroundColor Cyan
Write-Host ""

$envPath = "backend\.env"

# MongoDB URI and Twilio Account SID
$mongoUri = 'mongodb+srv://katevanpoppel_db_user:ws0HmJskZzm6yvtW@cluster0.uoylpxu.mongodb.net/shotonme?retryWrites=true&w=majority'
$twilioSid = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

# Build content line by line to avoid escaping issues
$envContent = @()
$envContent += "# Server Configuration"
$envContent += "PORT=5000"
$envContent += "NODE_ENV=development"
$envContent += ""
$envContent += "# Database - MongoDB Atlas"
$envContent += "MONGODB_URI=$mongoUri"
$envContent += ""
$envContent += "# JWT Authentication Secret"
$envContent += "JWT_SECRET=129831f2872adbeedbf19335b5a0d0d5cabd5bf93721c2b314441371adae85d8"
$envContent += ""
$envContent += "# Frontend URL"
$envContent += "FRONTEND_URL=http://localhost:3000"
$envContent += ""
$envContent += "# Twilio - SMS Notifications"
$envContent += "TWILIO_ACCOUNT_SID=$twilioSid"
$envContent += "TWILIO_AUTH_TOKEN=your_twilio_auth_token"
$envContent += "TWILIO_PHONE_NUMBER=+1234567890"
$envContent += ""
$envContent += "# Cloudinary - Media Uploads"
$envContent += "CLOUDINARY_CLOUD_NAME=your_cloud_name"
$envContent += "CLOUDINARY_API_KEY=your_api_key"
$envContent += "CLOUDINARY_API_SECRET=your_api_secret"
$envContent += ""
$envContent += "# Stripe - Payment Processing (Optional)"
$envContent += "STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key"
$envContent += "STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key"

# Write to file
Set-Content -Path $envPath -Value $envContent

Write-Host ""
Write-Host "Configuration updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Updated:" -ForegroundColor Cyan
Write-Host "  MongoDB URI" -ForegroundColor White
Write-Host "  Twilio Account SID: $twilioSid" -ForegroundColor White
Write-Host ""
Write-Host "Still needed (optional for now):" -ForegroundColor Yellow
Write-Host "  Twilio Auth Token" -ForegroundColor White
Write-Host "  Twilio Phone Number (format: +1234567890)" -ForegroundColor White
Write-Host ""
Write-Host "Your backend is ready to test!" -ForegroundColor Green
Write-Host "Run: cd backend && npm install && npm run dev" -ForegroundColor Cyan
Write-Host ""

