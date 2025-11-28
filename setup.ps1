# Shot On Me & Venue Portal - Automated Setup Script
# Run this script to install all dependencies

Write-Host "🚀 Setting up Shot On Me & Venue Portal..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Setup Backend
Write-Host ""
Write-Host "📦 Setting up Backend..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path package.json) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Gray
    npm install
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend package.json not found" -ForegroundColor Yellow
}
Set-Location ..

# Setup Venue Portal
Write-Host ""
Write-Host "📦 Setting up Venue Portal..." -ForegroundColor Yellow
Set-Location venue-portal
if (Test-Path package.json) {
    Write-Host "Installing venue-portal dependencies..." -ForegroundColor Gray
    npm install
    Write-Host "✅ Venue Portal dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Venue Portal package.json not found" -ForegroundColor Yellow
}
Set-Location ..

# Setup Shot On Me App
Write-Host ""
Write-Host "📦 Setting up Shot On Me App..." -ForegroundColor Yellow
Set-Location shot-on-me
if (Test-Path package.json) {
    Write-Host "Installing shot-on-me dependencies..." -ForegroundColor Gray
    npm install
    Write-Host "✅ Shot On Me dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Shot On Me package.json not found" -ForegroundColor Yellow
}
Set-Location ..

Write-Host ""
Write-Host "✨ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set up MongoDB (local or MongoDB Atlas)" -ForegroundColor White
Write-Host "2. Update backend/.env with Twilio and Cloudinary credentials" -ForegroundColor White
Write-Host "3. Start backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "4. Start venue-portal: cd venue-portal && npm run dev" -ForegroundColor White
Write-Host "5. Start shot-on-me: cd shot-on-me && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "See QUICK_START.md for detailed instructions" -ForegroundColor Gray

