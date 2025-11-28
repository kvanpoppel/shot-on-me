# Setup Verification Script
# Checks if everything is configured correctly

Write-Host "🔍 Checking Shot On Me & Venue Portal Setup..." -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    $allGood = $false
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  ✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ npm not found" -ForegroundColor Red
    $allGood = $false
}

# Check project structure
Write-Host ""
Write-Host "Checking project structure..." -ForegroundColor Yellow

$requiredDirs = @("backend", "venue-portal", "shot-on-me")
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "  ✅ $dir/ exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $dir/ missing" -ForegroundColor Red
        $allGood = $false
    }
}

# Check package.json files
Write-Host ""
Write-Host "Checking package.json files..." -ForegroundColor Yellow
foreach ($dir in $requiredDirs) {
    if (Test-Path "$dir\package.json") {
        Write-Host "  ✅ $dir/package.json exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $dir/package.json missing" -ForegroundColor Red
        $allGood = $false
    }
}

# Check node_modules
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow
foreach ($dir in $requiredDirs) {
    if (Test-Path "$dir\node_modules") {
        Write-Host "  ✅ $dir/ dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $dir/ dependencies not installed (run: cd $dir && npm install)" -ForegroundColor Yellow
    }
}

# Check .env files
Write-Host ""
Write-Host "Checking configuration files..." -ForegroundColor Yellow

if (Test-Path "backend\.env") {
    Write-Host "  ✅ backend/.env exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  backend/.env missing (copy from CONFIG_TEMPLATE.md)" -ForegroundColor Yellow
}

if (Test-Path "shot-on-me\.env.local") {
    Write-Host "  ✅ shot-on-me/.env.local exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  shot-on-me/.env.local missing (copy from CONFIG_TEMPLATE.md)" -ForegroundColor Yellow
}

if (Test-Path "venue-portal\.env.local") {
    Write-Host "  ✅ venue-portal/.env.local exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  venue-portal/.env.local missing (copy from CONFIG_TEMPLATE.md)" -ForegroundColor Yellow
}

# Check MongoDB
Write-Host ""
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoCheck = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($mongoCheck) {
        Write-Host "  ✅ MongoDB running on localhost:27017" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  MongoDB not running locally (use MongoDB Atlas or start MongoDB)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check MongoDB" -ForegroundColor Yellow
}

Write-Host ""
if ($allGood) {
    Write-Host "✨ Setup looks good! You can run .\start-all.ps1 to start all services" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some issues found. Please fix them before starting" -ForegroundColor Yellow
}
Write-Host ""


