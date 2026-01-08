# PowerShell script to convert Markdown to PDF
# This script provides multiple options for PDF conversion

Write-Host "📄 Shot On Me Business Plan - PDF Conversion" -ForegroundColor Cyan
Write-Host ""

# Check if file exists
$mdFile = "SHOT_ON_ME_COMPLETE_BUSINESS_PLAN.md"
if (-not (Test-Path $mdFile)) {
    Write-Host "❌ Error: $mdFile not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found: $mdFile" -ForegroundColor Green
Write-Host ""

# Option 1: Use online converter (recommended for quick conversion)
Write-Host "🌐 OPTION 1: Online Converter (Easiest)" -ForegroundColor Yellow
Write-Host "   1. Go to: https://www.markdowntopdf.com/"
Write-Host "   2. Upload: $mdFile"
Write-Host "   3. Click 'Convert' and download PDF"
Write-Host ""

# Option 2: Use VS Code extension
Write-Host "📝 OPTION 2: VS Code Extension" -ForegroundColor Yellow
Write-Host "   1. Install 'Markdown PDF' extension in VS Code"
Write-Host "   2. Open $mdFile in VS Code"
Write-Host "   3. Right-click → 'Markdown PDF: Export (pdf)'"
Write-Host ""

# Option 3: Use Pandoc (if installed)
Write-Host "🔧 OPTION 3: Pandoc (if installed)" -ForegroundColor Yellow
$pandocPath = Get-Command pandoc -ErrorAction SilentlyContinue
if ($pandocPath) {
    Write-Host "   ✅ Pandoc found!" -ForegroundColor Green
    Write-Host "   Running: pandoc $mdFile -o SHOT_ON_ME_BUSINESS_PLAN.pdf --pdf-engine=wkhtmltopdf"
    try {
        pandoc $mdFile -o "SHOT_ON_ME_BUSINESS_PLAN.pdf" --pdf-engine=wkhtmltopdf 2>&1
        if (Test-Path "SHOT_ON_ME_BUSINESS_PLAN.pdf") {
            Write-Host "   ✅ PDF created: SHOT_ON_ME_BUSINESS_PLAN.pdf" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  Pandoc conversion failed. Try Option 1 or 2." -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Pandoc not found. Install from: https://pandoc.org/installing.html"
}
Write-Host ""

# Option 4: Browser Print-to-PDF
Write-Host "🌐 OPTION 4: Browser Print-to-PDF" -ForegroundColor Yellow
Write-Host "   1. Open $mdFile in a markdown viewer (GitHub, VS Code preview, etc.)"
Write-Host "   2. Press Ctrl+P (Print)"
Write-Host "   3. Select 'Save as PDF' as destination"
Write-Host "   4. Click 'Save'"
Write-Host ""

# Option 5: Open file location
Write-Host "📂 File Location:" -ForegroundColor Cyan
$fullPath = (Resolve-Path $mdFile).Path
Write-Host "   $fullPath" -ForegroundColor White
Write-Host ""

# Try to open file location
Write-Host "Opening file location..." -ForegroundColor Cyan
Start-Process explorer.exe -ArgumentList "/select,`"$fullPath`""

Write-Host ""
Write-Host "💡 RECOMMENDED: Use Option 1 (Online Converter) for best results" -ForegroundColor Green
Write-Host ""

