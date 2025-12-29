# Get your local IP address for mobile device access

Write-Host ""
Write-Host "Finding your local IP address for mobile access..." -ForegroundColor Cyan
Write-Host ""

# Get all network adapters with IPv4 addresses
$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*"
} | Select-Object IPAddress, InterfaceAlias | Sort-Object InterfaceAlias

if ($adapters.Count -eq 0) {
    Write-Host "Could not find a local IP address" -ForegroundColor Red
    Write-Host "Make sure you are connected to a network (WiFi or Ethernet)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found IP address(es):" -ForegroundColor Green
Write-Host ""

foreach ($adapter in $adapters) {
    $ip = $adapter.IPAddress
    Write-Host "   $($adapter.InterfaceAlias): $ip" -ForegroundColor White
    Write-Host "      Frontend: http://${ip}:3001" -ForegroundColor Cyan
    Write-Host "      Backend:  http://${ip}:5000" -ForegroundColor Cyan
    Write-Host ""
}

# Use the first non-loopback IP
$localIP = $adapters[0].IPAddress

Write-Host "To access from your mobile device:" -ForegroundColor Yellow
Write-Host "   1. Make sure your phone is on the SAME WiFi network" -ForegroundColor White
Write-Host "   2. Open your mobile browser and go to:" -ForegroundColor White
Write-Host "      http://${localIP}:3001" -ForegroundColor Green
Write-Host ""
Write-Host "Important:" -ForegroundColor Yellow
Write-Host "   - Both devices must be on the same WiFi network" -ForegroundColor White
Write-Host "   - Make sure Windows Firewall allows connections on ports 3001 and 5000" -ForegroundColor White
Write-Host "   - The app will automatically detect the IP and connect to the backend" -ForegroundColor White
Write-Host ""

