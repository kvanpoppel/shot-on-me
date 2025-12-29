# Start Owner Portal
Write-Host "🚀 Starting Owner Portal..." -ForegroundColor Cyan
Write-Host ""

# Check if owner-portal directory exists
if (-not (Test-Path "owner-portal")) {
    Write-Host "❌ owner-portal directory not found!" -ForegroundColor Red
    Write-Host "Please make sure you're in the project root directory." -ForegroundColor Yellow
    exit 1
}

# Navigate to owner-portal
Set-Location owner-portal

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Creating .env.local..." -ForegroundColor Yellow
    @"
NEXT_PUBLIC_API_URL=http://localhost:5000/api
"@ | Out-File -FilePath ".env.local" -Encoding utf8
}

Write-Host ""
Write-Host "✅ Starting Owner Portal on port 3002..." -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Owner Portal will open at: http://localhost:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Make sure:" -ForegroundColor Yellow
Write-Host "   1. Backend is running on port 5000" -ForegroundColor White
Write-Host "   2. Your user has owner access (set OWNER_EMAIL in backend .env)" -ForegroundColor White
Write-Host ""

# Start the development server
npm run dev

