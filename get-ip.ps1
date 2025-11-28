# Quick script to get your local IP address for network access
Write-Host "`n=== Your Local IP Address ===" -ForegroundColor Cyan
Write-Host "Use this IP to access from other devices on the same Wi-Fi network`n" -ForegroundColor Yellow

$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if ($ipAddress) {
    Write-Host "Your IP: $ipAddress" -ForegroundColor Green
    Write-Host "`nAccess URLs:" -ForegroundColor Cyan
    Write-Host "  Venue Portal:  http://$ipAddress`:3000" -ForegroundColor White
    Write-Host "  Shot On Me:    http://$ipAddress`:3001" -ForegroundColor White
    Write-Host "  Backend API:   http://$ipAddress`:5000" -ForegroundColor White
    Write-Host "`nMake sure all devices are on the same Wi-Fi network!`n" -ForegroundColor Yellow
} else {
    Write-Host "Could not detect IP address. Make sure you're connected to Wi-Fi." -ForegroundColor Red
}

