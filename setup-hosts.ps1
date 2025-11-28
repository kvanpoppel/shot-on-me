# PowerShell script to add custom hostnames to Windows hosts file
# Run this script as Administrator

Write-Host "Setting up custom hostnames..." -ForegroundColor Cyan

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Entries to add
$entries = @(
    "127.0.0.1       venueportal",
    "127.0.0.1       shotonme"
)

# Read current hosts file
$hostsContent = Get-Content $hostsPath -ErrorAction SilentlyContinue

# Check which entries already exist
$entriesToAdd = @()
foreach ($entry in $entries) {
    $hostname = ($entry -split '\s+')[1]
    if ($hostsContent -notcontains $entry -and ($hostsContent | Select-String -Pattern "^\s*127\.0\.0\.1\s+$hostname\s*$" -Quiet) -eq $false) {
        $entriesToAdd += $entry
    } else {
        Write-Host "Entry already exists: $entry" -ForegroundColor Yellow
    }
}

# Add new entries
if ($entriesToAdd.Count -gt 0) {
    try {
        # Backup hosts file
        $backupPath = "$hostsPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
        Copy-Item $hostsPath $backupPath -Force
        Write-Host "Backed up hosts file to: $backupPath" -ForegroundColor Green

        # Add entries
        Add-Content -Path $hostsPath -Value ""
        Add-Content -Path $hostsPath -Value "# Shot On Me Custom Hostnames"
        foreach ($entry in $entriesToAdd) {
            Add-Content -Path $hostsPath -Value $entry
            Write-Host "Added: $entry" -ForegroundColor Green
        }

        Write-Host "`nSuccessfully updated hosts file!" -ForegroundColor Green
        Write-Host "`nYou can now access:" -ForegroundColor Cyan
        Write-Host "  • Venue Portal: http://venueportal:3000" -ForegroundColor White
        Write-Host "  • Shot On Me:   http://shotonme:3001" -ForegroundColor White
    } catch {
        Write-Host "ERROR: Failed to update hosts file: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "All entries already exist in hosts file!" -ForegroundColor Green
}

Write-Host "`nDone!" -ForegroundColor Cyan

