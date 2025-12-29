# Script to set up www.shotonme.com to point to localhost
# This allows testing with the production domain locally

Write-Host "Setting up www.shotonme.com to point to localhost..." -ForegroundColor Cyan
Write-Host ""

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"

# Get local IP address for mobile access
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*"
} | Select-Object -First 1).IPAddress

if (-not $localIP) {
    Write-Host "Could not determine local IP. Using 127.0.0.1 for localhost only." -ForegroundColor Yellow
    $localIP = "127.0.0.1"
}

# Entry for desktop (localhost) - use 127.0.0.1
$entryDesktop = "127.0.0.1`twww.shotonme.com`tshotonme.com"
# Entry for mobile (local IP) - comment explaining mobile setup
$entryMobile = "# For mobile: Use DNS override app to point www.shotonme.com to $localIP"

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script needs administrator privileges to modify the hosts file." -ForegroundColor Yellow
    Write-Host "Please run PowerShell as Administrator and run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternatively, you can manually add this line to C:\Windows\System32\drivers\etc\hosts:" -ForegroundColor Cyan
    Write-Host "  127.0.0.1`twww.shotonme.com`tshotonme.com" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening hosts file in Notepad (as Administrator)..." -ForegroundColor Cyan
    Start-Process notepad -ArgumentList $hostsPath -Verb RunAs
    exit
}

# Read current hosts file
$hostsContent = Get-Content $hostsPath -ErrorAction SilentlyContinue

# Check if entry already exists
$exists = $hostsContent | Select-String -Pattern "shotonme\.com" -Quiet

if ($exists) {
    Write-Host "✅ Entry for shotonme.com already exists in hosts file" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current hosts file entries for shotonme.com:" -ForegroundColor Cyan
    $hostsContent | Select-String -Pattern "shotonme\.com"
} else {
    # Add the entry
    try {
        Add-Content -Path $hostsPath -Value "`n# Shot On Me local development`n$entry" -ErrorAction Stop
        Write-Host "✅ Successfully added www.shotonme.com to hosts file!" -ForegroundColor Green
        Write-Host "   Entry: $entry" -ForegroundColor White
    } catch {
        Write-Host "❌ Failed to modify hosts file: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Make sure your backend is running on localhost:5000" -ForegroundColor White
Write-Host "   2. Make sure your frontend is running on localhost:3001" -ForegroundColor White
Write-Host "   3. Desktop: Open http://www.shotonme.com:3001 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "📱 For Mobile Device Access:" -ForegroundColor Cyan
Write-Host "   Your local IP: $localIP" -ForegroundColor Yellow
Write-Host "   Option 1: Use DNS Override app on your phone" -ForegroundColor White
Write-Host "            - Point www.shotonme.com to $localIP" -ForegroundColor White
Write-Host "            - Then access: http://www.shotonme.com:3001" -ForegroundColor Green
Write-Host "   Option 2: Use IP directly: http://${localIP}:3001" -ForegroundColor White
Write-Host ""
Write-Host "✅ Your domain www.shotonme.com is now configured for local development!" -ForegroundColor Green
Write-Host "   The app will automatically detect local dev mode and use your local backend" -ForegroundColor Yellow
Write-Host ""

