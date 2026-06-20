#requires -version 5.1
<#
  extract-text.ps1 - Read a .docx as Office Open XML (no Word / no python-docx).

  Treats the .docx as a ZIP, opens word/document.xml and renders body blocks
  (paragraphs + tables) IN DOCUMENT ORDER to stdout.

  Usage:
    pwsh extract-text.ps1 -Path "C:\path\to\file.docx"
    pwsh extract-text.ps1 "C:\path\to\file.docx"            # positional -Path

  Output:
    - Plain paragraphs render as their text.
    - Styled paragraphs (Heading*, Title, TOC*) get a "[Style] " prefix.
    - Tables render as "|"-joined cells, wrapped in <TABLE> ... </TABLE>.

  Keeps UTF-8 so Vietnamese (and CJK) text is preserved.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Path,

    # Optional: also dump header/footer/footnotes/endnotes when present.
    [switch]$IncludeExtras
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Path)) {
    throw "File not found: $Path"
}
$Path = (Resolve-Path -LiteralPath $Path).Path

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
try {
    $docEntry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' } | Select-Object -First 1
    if (-not $docEntry) { throw "Not a valid .docx: word/document.xml not found." }

    $xml = New-Object System.Xml.XmlDocument
    $xml.PreserveWhitespace = $true
    $s = $docEntry.Open()
    try {
        $xml.Load($s)
    }
    finally {
        $s.Dispose()
    }

    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

    function Get-ParaText([System.Xml.XmlElement]$p) {
        $sb = New-Object System.Text.StringBuilder
        foreach ($t in $p.SelectNodes('.//w:t', $ns)) { [void]$sb.Append($t.InnerText) }
        # tabs -> single space; line breaks inside runs -> nothing (kept as-is by w:t text)
        return $sb.ToString()
    }

    function Get-ParaStyle([System.Xml.XmlElement]$p) {
        $pPr = $p.SelectSingleNode('w:pPr', $ns)
        if (-not $pPr) { return $null }
        $pStyle = $pPr.SelectSingleNode('w:pStyle', $ns)
        if (-not $pStyle) { return $null }
        return $pStyle.GetAttribute('val', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
    }

    function Get-CellText([System.Xml.XmlElement]$tc) {
        $sb = New-Object System.Text.StringBuilder
        foreach ($p in $tc.SelectNodes('w:p', $ns)) {
            if ($sb.Length -gt 0) { [void]$sb.Append("`n") }
            $line = (Get-ParaText $p) -replace "`r?`n", " "
            [void]$sb.Append($line)
        }
        return $sb.ToString()
    }

    function Render-Body([System.Xml.XmlElement]$body, [switch]$QuietHeadings) {
        foreach ($child in $body.ChildNodes) {
            if ($child -isnot [System.Xml.XmlElement]) { continue }
            switch ($child.LocalName) {
                'p' {
                    $text = Get-ParaText $child
                    if ([string]::IsNullOrWhiteSpace($text)) { continue }
                    $style = Get-ParaStyle $child
                    if (-not $QuietHeadings -and $style -and ($style -match 'Heading' -or $style -match 'Title' -or $style -match 'TOC')) {
                        Write-Output "[$style] $text"
                    } else {
                        Write-Output $text
                    }
                }
                'tbl' {
                    Write-Output '<TABLE>'
                    foreach ($row in $child.SelectNodes('w:tr', $ns)) {
                        $cells = foreach ($tc in $row.SelectNodes('w:tc', $ns)) {
                            ((Get-CellText $tc) -replace "`r?`n", " ").Trim()
                        }
                        Write-Output (($cells -join ' | '))
                    }
                    Write-Output '</TABLE>'
                }
            }
        }
    }

    $body = $xml.SelectSingleNode('/w:document/w:body', $ns)
    if (-not $body) { throw "No <w:body> in document.xml." }
    Render-Body $body

    if ($IncludeExtras) {
        foreach ($part in @('header', 'footer', 'footnotes', 'endnotes')) {
            foreach ($entry in ($zip.Entries | Where-Object { $_.FullName -match "^word/${part}\d?\.xml$" })) {
                Write-Output ""
                Write-Output "===== [$($entry.FullName)] ====="
                $subXml = New-Object System.Xml.XmlDocument
                $s2 = $entry.Open()
                try { $subXml.Load($s2) } finally { $s2.Dispose() }
                $subBody = $subXml.DocumentElement
                Render-Body $subBody -QuietHeadings
            }
        }
    }
}
finally {
    $zip.Dispose()
}
