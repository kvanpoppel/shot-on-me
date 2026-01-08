# Improved Markdown to Word Converter
# Better formatting with reduced white space

param(
    [string]$mdFile = "",
    [string]$docxFile = ""
)

if (-not $mdFile -or -not $docxFile) {
    Write-Host "Usage: .\convert-markdown-to-word-improved.ps1 -mdFile 'file.md' -docxFile 'file.docx'" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $mdFile)) {
    Write-Host "File not found: $mdFile" -ForegroundColor Red
    exit 1
}

Write-Host "Converting $mdFile to $docxFile..." -ForegroundColor Cyan

try {
    $content = Get-Content $mdFile -Raw -Encoding UTF8
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    # Create new document
    $doc = $word.Documents.Add()
    
    # Set page margins (smaller margins = more content per page)
    $doc.Sections(1).PageSetup.TopMargin = 36    # 0.5 inch
    $doc.Sections(1).PageSetup.BottomMargin = 36 # 0.5 inch
    $doc.Sections(1).PageSetup.LeftMargin = 36    # 0.5 inch
    $doc.Sections(1).PageSetup.RightMargin = 36  # 0.5 inch
    
    # Set line spacing (tighter spacing)
    $selection = $word.Selection
    $selection.ParagraphFormat.SpaceAfter = 6     # 6 points after paragraphs
    $selection.ParagraphFormat.SpaceBefore = 0     # No space before
    
    # Set default font
    $selection.Font.Name = "Calibri"
    $selection.Font.Size = 11
    
    $lines = $content -split "`r?`n"
    $inList = $false
    $listLevel = 0
    
    foreach ($line in $lines) {
        $line = $line.TrimEnd()
        
        # Skip empty lines (reduce white space)
        if ($line -eq '') {
            if (-not $inList) {
                $selection.TypeParagraph()
            }
            continue
        }
        
        # Headers
        if ($line -match '^#+\s+(.+)$') {
            $inList = $false
            $listLevel = 0
            $level = ($line -split '#').Count - 1
            $text = $matches[1]
            $text = $text -replace '\*\*(.+?)\*\*', '$1'
            
            # Set heading style with minimal spacing
            if ($level -eq 1) {
                $selection.Style = "Heading 1"
                $selection.ParagraphFormat.SpaceAfter = 12
                $selection.ParagraphFormat.SpaceBefore = 12
            } elseif ($level -eq 2) {
                $selection.Style = "Heading 2"
                $selection.ParagraphFormat.SpaceAfter = 10
                $selection.ParagraphFormat.SpaceBefore = 10
            } elseif ($level -eq 3) {
                $selection.Style = "Heading 3"
                $selection.ParagraphFormat.SpaceAfter = 8
                $selection.ParagraphFormat.SpaceBefore = 8
            } else {
                $selection.Style = "Heading 4"
                $selection.ParagraphFormat.SpaceAfter = 6
                $selection.ParagraphFormat.SpaceBefore = 6
            }
            
            $selection.TypeText($text)
            $selection.TypeParagraph()
            $selection.ParagraphFormat.SpaceAfter = 6
            $selection.ParagraphFormat.SpaceBefore = 0
            $selection.Style = "Normal"
            continue
        }
        
        # Horizontal rules
        if ($line -match '^---+$') {
            $inList = $false
            $selection.TypeParagraph()
            $dashLine = "-" * 80
            $selection.TypeText($dashLine)
            $selection.TypeParagraph()
            continue
        }
        
        # Lists (numbered or bulleted)
        if ($line -match '^[\s]*[-*+]\s+(.+)$' -or $line -match '^[\s]*\d+\.\s+(.+)$') {
            $inList = $true
            $listText = $matches[1]
            
            # Process bold text in list items
            $listText = $listText -replace '\*\*(.+?)\*\*', '$1'
            
            $selection.Style = "List Bullet"
            $selection.ParagraphFormat.SpaceAfter = 3
            $selection.ParagraphFormat.SpaceBefore = 0
            
            # Process bold text
            $remainingText = $listText
            while ($remainingText -match '\*\*(.+?)\*\*') {
                $before = $remainingText.Substring(0, $remainingText.IndexOf('**'))
                $boldText = $matches[1]
                $after = $remainingText.Substring($remainingText.IndexOf('**') + $matches[0].Length)
                
                if ($before) {
                    $selection.TypeText($before)
                }
                $selection.Font.Bold = $true
                $selection.TypeText($boldText)
                $selection.Font.Bold = $false
                $remainingText = $after
            }
            if ($remainingText) {
                $selection.TypeText($remainingText)
            }
            
            $selection.TypeParagraph()
            continue
        }
        
        # Regular paragraphs
        $inList = $false
        $selection.Style = "Normal"
        $selection.ParagraphFormat.SpaceAfter = 6
        $selection.ParagraphFormat.SpaceBefore = 0
        $selection.Font.Size = 11
        
        # Process bold text
        $remainingText = $line
        while ($remainingText -match '\*\*(.+?)\*\*') {
            $before = $remainingText.Substring(0, $remainingText.IndexOf('**'))
            $boldText = $matches[1]
            $after = $remainingText.Substring($remainingText.IndexOf('**') + $matches[0].Length)
            
            if ($before) {
                $selection.TypeText($before)
            }
            $selection.Font.Bold = $true
            $selection.TypeText($boldText)
            $selection.Font.Bold = $false
            $remainingText = $after
        }
        if ($remainingText) {
            $selection.TypeText($remainingText)
        }
        
        $selection.TypeParagraph()
    }
    
    # Final formatting adjustments
    $doc.Content.ParagraphFormat.SpaceAfter = 6
    $doc.Content.ParagraphFormat.SpaceBefore = 0
    
    # Save document
    $fullPath = (Join-Path $PWD $docxFile).ToString()
    $saveFormat = 16  # wdFormatDocumentDefault
    $null = $doc.SaveAs($fullPath, $saveFormat)
    
    Write-Host "✅ Created: $docxFile" -ForegroundColor Green
    Write-Host "   Pages: $($doc.BuiltInDocumentProperties('PAGES').Value)" -ForegroundColor Gray
    
    # Close document
    $doc.Close()
    $word.Quit()
    
    # Clean up COM objects
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    
    # Open the document
    Start-Process $docxFile
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($doc) { $doc.Close($false) }
    if ($word) { $word.Quit() }
    exit 1
}

