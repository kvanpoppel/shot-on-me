# Prepare for Deployment to www.shotonme.com
# This script helps you prepare your code for deployment

Write-Host "🚀 Preparing Shot On Me for Deployment to www.shotonme.com" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  Git not initialized. Initializing..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
}

# Check if code is committed
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "📝 Uncommitted changes detected:" -ForegroundColor Yellow
    Write-Host $gitStatus
    Write-Host ""
    $commit = Read-Host "Would you like to commit these changes? (y/n)"
    if ($commit -eq "y" -or $commit -eq "Y") {
        $message = Read-Host "Enter commit message (or press Enter for default)"
        if ([string]::IsNullOrWhiteSpace($message)) {
            $message = "Prepare for production deployment to www.shotonme.com"
        }
        git add .
        git commit -m $message
        Write-Host "✅ Changes committed" -ForegroundColor Green
    }
} else {
    Write-Host "✅ All changes committed" -ForegroundColor Green
}

# Check for GitHub remote
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host ""
    Write-Host "⚠️  No GitHub remote configured" -ForegroundColor Yellow
    Write-Host "To deploy, you need to:" -ForegroundColor Yellow
    Write-Host "1. Create a repository on GitHub" -ForegroundColor Yellow
    Write-Host "2. Run: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor Yellow
    Write-Host "3. Run: git push -u origin main" -ForegroundColor Yellow
} else {
    Write-Host "✅ GitHub remote configured: $remote" -ForegroundColor Green
}

# Check environment files
Write-Host ""
Write-Host "📋 Checking environment files..." -ForegroundColor Cyan

if (Test-Path "backend/.env") {
    Write-Host "✅ backend/.env exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  backend/.env not found - you'll need to add environment variables in Render" -ForegroundColor Yellow
}

if (Test-Path "shot-on-me/.env.local") {
    Write-Host "✅ shot-on-me/.env.local exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  shot-on-me/.env.local not found - you'll need to add environment variables in Vercel" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📚 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Review deployment guides:" -ForegroundColor White
Write-Host "   - DEPLOYMENT_QUICK_START.md (15-minute guide)" -ForegroundColor Gray
Write-Host "   - DEPLOY_TO_SHOTONME_DOMAIN.md (detailed guide)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy Backend to Render:" -ForegroundColor White
Write-Host "   - Go to https://render.com" -ForegroundColor Gray
Write-Host "   - Create Web Service" -ForegroundColor Gray
Write-Host "   - Root Directory: backend" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Deploy Frontend to Vercel:" -ForegroundColor White
Write-Host "   - Go to https://vercel.com" -ForegroundColor Gray
Write-Host "   - Import repository" -ForegroundColor Gray
Write-Host "   - Root Directory: shot-on-me" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Configure DNS in GoDaddy:" -ForegroundColor White
Write-Host "   - Add CNAME for www → Vercel" -ForegroundColor Gray
Write-Host "   - Add CNAME for api → Render" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Ready for deployment!" -ForegroundColor Green

