# Convert Markdown Business Documents to Word (.docx)
# This script converts the business launch documents to Word format

Write-Host "📄 Converting Business Documents to Word Format..." -ForegroundColor Cyan
Write-Host ""

# Check if pandoc is installed
$pandocInstalled = $false
try {
    $pandocVersion = pandoc --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pandocInstalled = $true
        Write-Host "✅ Pandoc found: $($pandocVersion[0])" -ForegroundColor Green
    }
} catch {
    $pandocInstalled = $false
}

# Documents to convert
$documents = @(
    @{
        Name = "Business Launch Step-by-Step Guide"
        File = "BUSINESS_LAUNCH_STEP_BY_STEP.md"
        Output = "BUSINESS_LAUNCH_STEP_BY_STEP.docx"
    },
    @{
        Name = "Business Launch Quick Reference"
        File = "BUSINESS_LAUNCH_QUICK_REFERENCE.md"
        Output = "BUSINESS_LAUNCH_QUICK_REFERENCE.docx"
    },
    @{
        Name = "Complete Business Plan"
        File = "SHOT_ON_ME_COMPLETE_BUSINESS_PLAN.md"
        Output = "SHOT_ON_ME_COMPLETE_BUSINESS_PLAN.docx"
    }
)

if ($pandocInstalled) {
    Write-Host "Using Pandoc to convert documents..." -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($doc in $documents) {
        if (Test-Path $doc.File) {
            Write-Host "Converting: $($doc.Name)..." -ForegroundColor Cyan
            try {
                pandoc "$($doc.File)" -o "$($doc.Output)" --reference-doc=reference.docx 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✅ Created: $($doc.Output)" -ForegroundColor Green
                } else {
                    # Try without reference doc
                    pandoc "$($doc.File)" -o "$($doc.Output)" 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "  ✅ Created: $($doc.Output)" -ForegroundColor Green
                    } else {
                        Write-Host "  ❌ Failed to convert: $($doc.File)" -ForegroundColor Red
                    }
                }
            } catch {
                Write-Host "  ❌ Error: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "  ⚠️  File not found: $($doc.File)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠️  Pandoc not found. Here are your options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPTION 1: Install Pandoc (Recommended)" -ForegroundColor Cyan
    Write-Host "  Install via Chocolatey: choco install pandoc" -ForegroundColor White
    Write-Host "  Or download from: https://pandoc.org/installing.html" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTION 2: Use Word's Built-in Import" -ForegroundColor Cyan
    Write-Host "  1. Open Microsoft Word" -ForegroundColor White
    Write-Host "  2. File > Open" -ForegroundColor White
    Write-Host "  3. Select the .md file" -ForegroundColor White
    Write-Host "  4. Word will convert it automatically" -ForegroundColor White
    Write-Host "  5. Save as .docx" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTION 3: Use Online Converter" -ForegroundColor Cyan
    Write-Host "  Visit: https://cloudconvert.com/md-to-docx" -ForegroundColor White
    Write-Host "  Upload your .md files and convert" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTION 4: I'll create a Node.js script (requires npm)" -ForegroundColor Cyan
    Write-Host ""
    
    $useNode = Read-Host "Would you like me to create a Node.js conversion script? (y/n)"
    if ($useNode -eq "y" -or $useNode -eq "Y") {
        Write-Host ""
        Write-Host "Creating Node.js conversion script..." -ForegroundColor Yellow
        
        # Create package.json for conversion tool
        $nodeScript = @"
const fs = require('fs');
const path = require('path');

// Simple markdown to HTML converter (basic)
function markdownToHTML(markdown) {
    let html = markdown
        // Headers
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Inline code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Lists
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/^\[ \] (.*$)/gim, '<li style="list-style: none;">☐ $1</li>')
        .replace(/^\[x\] (.*$)/gim, '<li style="list-style: none;">☑ $1</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        h3 { color: #777; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <p>${html}</p>
</body>
</html>`;
}

const documents = [
    { input: 'BUSINESS_LAUNCH_STEP_BY_STEP.md', output: 'BUSINESS_LAUNCH_STEP_BY_STEP.html' },
    { input: 'BUSINESS_LAUNCH_QUICK_REFERENCE.md', output: 'BUSINESS_LAUNCH_QUICK_REFERENCE.html' },
    { input: 'SHOT_ON_ME_COMPLETE_BUSINESS_PLAN.md', output: 'SHOT_ON_ME_COMPLETE_BUSINESS_PLAN.html' }
];

documents.forEach(doc => {
    if (fs.existsSync(doc.input)) {
        console.log(`Converting ${doc.input}...`);
        const markdown = fs.readFileSync(doc.input, 'utf8');
        const html = markdownToHTML(markdown);
        fs.writeFileSync(doc.output, html);
        console.log(`✅ Created: ${doc.output}`);
        console.log(`   You can open this in Word and save as .docx`);
    } else {
        console.log(`⚠️  File not found: ${doc.input}`);
    }
});

console.log('\n✅ Conversion complete!');
console.log('Open the HTML files in Microsoft Word and save as .docx');
"@
        
        $nodeScript | Out-File -FilePath "convert-to-word.js" -Encoding UTF8
        Write-Host "✅ Created: convert-to-word.js" -ForegroundColor Green
        Write-Host ""
        Write-Host "To use it, run:" -ForegroundColor Yellow
        Write-Host "  node convert-to-word.js" -ForegroundColor White
        Write-Host ""
        Write-Host "This will create HTML files that you can open in Word and save as .docx" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "📝 Documents to convert:" -ForegroundColor Cyan
foreach ($doc in $documents) {
    if (Test-Path $doc.File) {
        Write-Host "  ✅ $($doc.File)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($doc.File) (not found)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

