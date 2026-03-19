# Setup verification script
# Checks if local development prerequisites are configured.

Write-Host "Checking project setup..." -ForegroundColor Cyan
Write-Host ""

$allGood = $true
$requiredDirs = @("backend", "shot-on-me", "owner-portal", "venue-portal")

function Show-Ok {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Show-Warn {
    param([string]$Message)
    Write-Host "  [!]  $Message" -ForegroundColor Yellow
}

function Show-Error {
    param([string]$Message)
    Write-Host "  [X]  $Message" -ForegroundColor Red
}

Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Show-Ok "Node.js: $nodeVersion"
} catch {
    Show-Error "Node.js not found. Install from https://nodejs.org/"
    $allGood = $false
}

Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Show-Ok "npm: $npmVersion"
} catch {
    Show-Error "npm not found"
    $allGood = $false
}

Write-Host ""
Write-Host "Checking project structure..." -ForegroundColor Yellow
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Show-Ok "$dir/ exists"
    } else {
        Show-Error "$dir/ missing"
        $allGood = $false
    }
}

Write-Host ""
Write-Host "Checking package.json files..." -ForegroundColor Yellow
foreach ($dir in $requiredDirs) {
    if (Test-Path "$dir\package.json") {
        Show-Ok "$dir/package.json exists"
    } else {
        Show-Error "$dir/package.json missing"
        $allGood = $false
    }
}

Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow
foreach ($dir in $requiredDirs) {
    if (Test-Path "$dir\node_modules") {
        Show-Ok "$dir/ dependencies installed"
    } else {
        Show-Warn "$dir/ dependencies not installed (run: Set-Location $dir; npm install)"
    }
}

Write-Host ""
Write-Host "Checking configuration files..." -ForegroundColor Yellow

if (Test-Path "backend\.env") {
    Show-Ok "backend/.env exists"
} else {
    Show-Warn "backend/.env missing (copy from CONFIG_TEMPLATE.md)"
}

if (Test-Path "shot-on-me\.env.local") {
    Show-Ok "shot-on-me/.env.local exists"
} else {
    Show-Warn "shot-on-me/.env.local missing (copy from CONFIG_TEMPLATE.md)"
}

if (Test-Path "owner-portal\.env.local") {
    Show-Ok "owner-portal/.env.local exists"
} else {
    Show-Warn "owner-portal/.env.local missing (copy from CONFIG_TEMPLATE.md)"
}

if (Test-Path "venue-portal\.env.local") {
    Show-Ok "venue-portal/.env.local exists"
} else {
    Show-Warn "venue-portal/.env.local missing (copy from CONFIG_TEMPLATE.md)"
}

Write-Host ""
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoCheck = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($mongoCheck) {
        Show-Ok "MongoDB running on localhost:27017"
    } else {
        Show-Warn "MongoDB not running locally (use MongoDB Atlas or start MongoDB)"
    }
} catch {
    Show-Warn "Could not check MongoDB"
}

Write-Host ""
if ($allGood) {
    Write-Host "Setup looks good. Run .\start-all.ps1 to start all services." -ForegroundColor Green
} else {
    Write-Host "Some required items are missing. Fix them before starting." -ForegroundColor Yellow
}
Write-Host ""


