#requires -version 5.1
<#
  extract-media.ps1 - Extract embedded media (images/diagrams) from a .docx.

  A .docx is a ZIP. Embedded images live under word/media/ (e.g. image1.png,
  image2.jpeg, ...). This script extracts them to an output folder and prints
  the absolute path of each extracted file, so an agent can then view/analyze
  them with an image tool.

  Usage:
    pwsh extract-media.ps1 -Path "C:\path\to\file.docx"
    pwsh extract-media.ps1 "C:\path\to\file.docx" -OutDir ".\media"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Path,

    [string]$OutDir
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Path)) {
    throw "File not found: $Path"
}
$Path = (Resolve-Path -LiteralPath $Path).Path

if (-not $OutDir) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($Path)
    $OutDir = Join-Path ([System.IO.Path]::GetDirectoryName($Path)) "${base}_media"
}
if (-not (Test-Path -LiteralPath $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}
$OutDir = (Resolve-Path -LiteralPath $OutDir).Path

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
try {
    $media = $zip.Entries | Where-Object { $_.FullName -match '^word/media/' }
    if (-not $media) {
        Write-Output "No embedded media found in $Path"
        return
    }

    $count = 0
    foreach ($entry in $media) {
        $name = [System.IO.Path]::GetFileName($entry.FullName)
        $dest = Join-Path $OutDir $name
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
        $count++
        Write-Output $dest
    }
    Write-Output ""
    Write-Output "Extracted $count file(s) to: $OutDir"
}
finally {
    $zip.Dispose()
}
