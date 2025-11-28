# Kill Process on Port Script
# Usage: .\kill-port.ps1 5000

param(
    [Parameter(Mandatory=$true)]
    [int]$Port
)

Write-Host "🔍 Finding process on port $Port..." -ForegroundColor Cyan

$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "📌 Found process ID: $process" -ForegroundColor Yellow
    
    $processInfo = Get-Process -Id $process -ErrorAction SilentlyContinue
    if ($processInfo) {
        Write-Host "   Process Name: $($processInfo.ProcessName)" -ForegroundColor Gray
        Write-Host "   Command Line: $($processInfo.Path)" -ForegroundColor Gray
    }
    
    Write-Host "🛑 Killing process..." -ForegroundColor Red
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 1
    
    # Verify it's killed
    $stillRunning = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $stillRunning) {
        Write-Host "✅ Port $Port is now free!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Process may still be running. Try again or restart your computer." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Port $Port is already free!" -ForegroundColor Green
}

Write-Host ""

