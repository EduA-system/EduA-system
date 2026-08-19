<#
  Xoa cac anh trong word/media/ khong con doan van nao tham chieu toi.
  Xay ra khi dung script dung lai muc 2: doan van bi xoa nhung part anh van nam trong goi .docx.

  An toan: chi xoa anh ma KHONG mot part XML nao (document/header/footer/footnotes...) dung r:embed / r:link toi.

  Dung: powershell -File word-prune-unused-media.ps1 -Docx <file.docx> [-WhatIfOnly]
#>
param(
  [Parameter(Mandatory = $true)][string]$Docx,
  [switch]$WhatIfOnly
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($Docx, 'Update')
try {
  # 1. Doc moi part XML, gom cac rId dang duoc dung
  $usedRelIds = @{}
  foreach ($e in @($zip.Entries | Where-Object { $_.FullName -like 'word/*.xml' })) {
    $s = $e.Open()
    try {
      $sr = New-Object System.IO.StreamReader($s)
      $txt = $sr.ReadToEnd(); $sr.Dispose()
    } finally { $s.Dispose() }
    foreach ($m in [regex]::Matches($txt, 'r:(?:embed|link|id)="([^"]+)"')) {
      $usedRelIds[$e.FullName + '|' + $m.Groups[1].Value] = $true
    }
  }

  # 2. Voi moi file .rels, doi rId -> target anh; giu anh nao co rId duoc dung
  $keep = @{}
  foreach ($e in @($zip.Entries | Where-Object { $_.FullName -like 'word/_rels/*.rels' })) {
    $owner = 'word/' + ($e.FullName -replace '^word/_rels/', '' -replace '\.rels$', '')
    $s = $e.Open()
    try { $sr = New-Object System.IO.StreamReader($s); $txt = $sr.ReadToEnd(); $sr.Dispose() } finally { $s.Dispose() }
    foreach ($m in [regex]::Matches($txt, '<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*/?>')) {
      $id = $m.Groups[1].Value; $target = $m.Groups[2].Value
      if ($target -notlike 'media/*') { continue }
      if ($usedRelIds.ContainsKey($owner + '|' + $id)) { $keep['word/' + $target] = $true }
    }
  }

  $media = @($zip.Entries | Where-Object { $_.FullName -like 'word/media/*' })
  $dead = @($media | Where-Object { -not $keep.ContainsKey($_.FullName) })
  $deadBytes = ($dead | Measure-Object -Property Length -Sum).Sum
  Write-Output ("Tong anh trong goi : {0}" -f $media.Count)
  Write-Output ("Dang duoc dung     : {0}" -f ($media.Count - $dead.Count))
  Write-Output ("Mo coi             : {0}  ({1:N1} MB)" -f $dead.Count, ($deadBytes / 1MB))

  if ($WhatIfOnly) { Write-Output 'WhatIfOnly: khong xoa gi'; return }
  foreach ($d in $dead) { $d.Delete() }
  Write-Output ("Da xoa {0} anh mo coi" -f $dead.Count)
}
finally { $zip.Dispose() }
