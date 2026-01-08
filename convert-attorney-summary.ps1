# Convert ATTORNEY_BUSINESS_SUMMARY.md to Word Document
Write-Host "📄 Converting ATTORNEY_BUSINESS_SUMMARY.md to Word..." -ForegroundColor Cyan

$mdFile = "ATTORNEY_BUSINESS_SUMMARY.md"
$docxFile = "ATTORNEY_BUSINESS_SUMMARY.docx"

if (-not (Test-Path $mdFile)) {
    Write-Host "❌ File not found: $mdFile" -ForegroundColor Red
    exit 1
}

try {
    # Read markdown content
    $content = Get-Content $mdFile -Raw -Encoding UTF8
    
    # Create Word application
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    # Create new document
    $doc = $word.Documents.Add()
    $selection = $word.Selection
    
    # Parse and convert markdown to Word
    $lines = $content -split "`r?`n"
    
    foreach ($line in $lines) {
        $line = $line.TrimEnd()
        
        # Headers
        if ($line -match '^#+\s+(.+)$') {
            $level = ($line -split '#').Count - 1
            $text = $matches[1]
            
            # Remove bold markers from headers
            $text = $text -replace '\*\*(.+?)\*\*', '$1'
            
            if ($level -eq 1) {
                $selection.Style = "Heading 1"
            } elseif ($level -eq 2) {
                $selection.Style = "Heading 2"
            } elseif ($level -eq 3) {
                $selection.Style = "Heading 3"
            } else {
                $selection.Style = "Heading 4"
            }
            $selection.TypeText($text)
            $selection.TypeParagraph()
        }
        # Horizontal rule
        elseif ($line -match '^---+$') {
            $selection.TypeParagraph()
            $dashLine = "-" * 50
            $selection.TypeText($dashLine)
            $selection.TypeParagraph()
        }
        # Bold text
        elseif ($line -match '\*\*(.+?)\*\*') {
            $text = $line
            while ($text -match '\*\*(.+?)\*\*') {
                $before = $text.Substring(0, $text.IndexOf('**'))
                $boldText = $matches[1]
                $after = $text.Substring($text.IndexOf('**') + $matches[0].Length)
                
                if ($before) {
                    $selection.TypeText($before)
                }
                $selection.Font.Bold = $true
                $selection.TypeText($boldText)
                $selection.Font.Bold = $false
                
                $text = $after
            }
            if ($text) {
                $selection.TypeText($text)
            }
            $selection.TypeParagraph()
        }
        # Empty line
        elseif ($line -eq '') {
            $selection.TypeParagraph()
        }
        # Regular text
        else {
            # Handle inline bold
            $text = $line
            while ($text -match '\*\*(.+?)\*\*') {
                $before = $text.Substring(0, $text.IndexOf('**'))
                $boldText = $matches[1]
                $after = $text.Substring($text.IndexOf('**') + $matches[0].Length)
                
                if ($before) {
                    $selection.TypeText($before)
                }
                $selection.Font.Bold = $true
                $selection.TypeText($boldText)
                $selection.Font.Bold = $false
                
                $text = $after
            }
            if ($text) {
                $selection.TypeText($text)
            }
            $selection.TypeParagraph()
        }
    }
    
    # Save document
    $fullPath = (Join-Path $PWD $docxFile).ToString()
    $saveFormat = 16  # wdFormatDocumentDefault (docx)
    $null = $doc.SaveAs($fullPath, $saveFormat)
    
    # Close and cleanup
    $doc.Close()
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    
    Write-Host "✅ Successfully created: $docxFile" -ForegroundColor Green
    Write-Host "   Location: $fullPath" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    if ($word) {
        try { $word.Quit() } catch {}
    }
    exit 1
}

