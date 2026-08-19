<#
  Chen anh class diagram cua tung feature vao Report 4, ngay duoi heading "2.<n>.1 Class Diagram".
  Khop theo TEN HEADING nen chay lai nhieu lan deu duoc: anh cu bi thay, khong nhan doi.

  Dung:
    powershell -File word-insert-class-diagrams.ps1 -Docx <file.docx> -DiagramRoot <designs/sds-diagrams> -Features <features.json>
#>
param(
  [Parameter(Mandatory = $true)][string]$Docx,
  [Parameter(Mandatory = $true)][string]$DiagramRoot,
  [Parameter(Mandatory = $true)][string]$Features
)
$ErrorActionPreference = 'Stop'
$W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
$R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
$PAGE_W_IN = 9.69
$EMU = 914400

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$feat = (Get-Content -LiteralPath $Features -Raw -Encoding UTF8 | ConvertFrom-Json).features
$zip = [System.IO.Compression.ZipFile]::Open($Docx, 'Update')
try {
  function Read-Xml([string]$entryName) {
    $e = $zip.Entries | Where-Object { $_.FullName -eq $entryName } | Select-Object -First 1
    if (-not $e) { throw "Khong co $entryName" }
    $doc = New-Object System.Xml.XmlDocument; $doc.PreserveWhitespace = $true
    $s = $e.Open(); try { $doc.Load($s) } finally { $s.Dispose() }
    return $doc
  }
  function Write-Xml([string]$entryName, [System.Xml.XmlDocument]$doc) {
    ($zip.Entries | Where-Object { $_.FullName -eq $entryName }) | ForEach-Object { $_.Delete() }
    $ne = $zip.CreateEntry($entryName)
    $os = $ne.Open()
    try {
      $sw = New-Object System.IO.StreamWriter($os, (New-Object System.Text.UTF8Encoding($false)))
      $sw.Write($doc.OuterXml); $sw.Flush(); $sw.Dispose()
    } finally { $os.Dispose() }
  }

  # --- [Content_Types].xml: bao dam co Default cho png ---
  $ct = Read-Xml '[Content_Types].xml'
  $ctNs = 'http://schemas.openxmlformats.org/package/2006/content-types'
  $hasPng = $false
  foreach ($d in $ct.DocumentElement.ChildNodes) {
    if ($d.LocalName -eq 'Default' -and $d.GetAttribute('Extension') -eq 'png') { $hasPng = $true }
  }
  if (-not $hasPng) {
    $d = $ct.CreateElement('Default', $ctNs)
    $d.SetAttribute('Extension', 'png'); $d.SetAttribute('ContentType', 'image/png')
    [void]$ct.DocumentElement.AppendChild($d)
    Write-Xml '[Content_Types].xml' $ct
    Write-Output 'Da them Default png vao [Content_Types].xml'
  }

  # --- rels ---
  $relsName = 'word/_rels/document.xml.rels'
  $rels = Read-Xml $relsName
  $relNs = 'http://schemas.openxmlformats.org/package/2006/relationships'
  function Get-RelId([string]$target) {
    foreach ($r in $rels.DocumentElement.ChildNodes) {
      if ($r.GetAttribute('Target') -eq $target) { return $r.GetAttribute('Id') }
    }
    return $null
  }
  function New-Rel([string]$target) {
    $max = 0
    foreach ($r in $rels.DocumentElement.ChildNodes) {
      $m = [regex]::Match($r.GetAttribute('Id'), '^rId(\d+)$')
      if ($m.Success -and [int]$m.Groups[1].Value -gt $max) { $max = [int]$m.Groups[1].Value }
    }
    $id = 'rId' + ($max + 1)
    $e = $rels.CreateElement('Relationship', $relNs)
    $e.SetAttribute('Id', $id)
    $e.SetAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
    $e.SetAttribute('Target', $target)
    [void]$rels.DocumentElement.AppendChild($e)
    return $id
  }

  # --- document.xml ---
  $doc = Read-Xml 'word/document.xml'
  $ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
  $ns.AddNamespace('w', $W)
  $body = $doc.SelectSingleNode('/w:document/w:body', $ns)
  function Get-Text($p) { (($p.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '') }

  $inserted = 0; $missing = 0; $docPr = 9000
  for ($i = 0; $i -lt $feat.Count; $i++) {
    $f = $feat[$i]
    $sect = '2.' + ($i + 1) + '.1'
    $png = Join-Path $DiagramRoot ($f.id + '/' + $f.id + '-class-diagram.png')
    $meta = "$png.json"
    if (-not (Test-Path -LiteralPath $png)) { Write-Output "  thieu anh: $png"; $missing++; continue }

    # kich thuoc that: doc tu file .json ben canh (PlantUML khong ghi chunk pHYs)
    $j = Get-Content -LiteralPath $meta -Raw | ConvertFrom-Json
    $wIn = [Math]::Min($PAGE_W_IN, $j.widthIn)
    $hIn = $wIn * $j.heightIn / $j.widthIn
    $cx = [int]($wIn * $EMU); $cy = [int]($hIn * $EMU)

    # them anh vao goi
    $mediaName = 'word/media/' + $f.id + '-class-diagram.png'
    ($zip.Entries | Where-Object { $_.FullName -eq $mediaName }) | ForEach-Object { $_.Delete() }
    $me = $zip.CreateEntry($mediaName)
    $ms = $me.Open()
    try { $bytes = [System.IO.File]::ReadAllBytes($png); $ms.Write($bytes, 0, $bytes.Length) } finally { $ms.Dispose() }
    $rid = Get-RelId ('media/' + $f.id + '-class-diagram.png')
    if (-not $rid) { $rid = New-Rel ('media/' + $f.id + '-class-diagram.png') }

    # tim heading "2.<n>.1 Class Diagram"
    $kids = @($body.ChildNodes)
    $idx = -1
    for ($k = 0; $k -lt $kids.Count; $k++) {
      if ($kids[$k].LocalName -ne 'p') { continue }
      if ((Get-Text $kids[$k]).Trim() -eq "$sect Class Diagram") { $idx = $k; break }
    }
    if ($idx -lt 0) { Write-Output "  khong thay heading '$sect Class Diagram'"; $missing++; continue }

    # xoa doan anh cu ngay sau heading (neu chay lai)
    $next = $kids[$idx + 1]
    if ($next -and $next.LocalName -eq 'p' -and $next.SelectSingleNode('.//*[local-name()="drawing"]')) {
      [void]$body.RemoveChild($next)
    }

    $docPr++
    $xml = @"
<w:p xmlns:w="$W"><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr/><w:drawing>
<wp:inline distB="0" distT="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<wp:extent cx="$cx" cy="$cy"/><wp:effectExtent b="0" l="0" r="0" t="0"/>
<wp:docPr id="$docPr" name="$($f.id)-class-diagram.png"/>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="$($f.id)-class-diagram.png"/><pic:cNvPicPr preferRelativeResize="0"/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="$rid" xmlns:r="$R"/><a:srcRect b="0" l="0" r="0" t="0"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm><a:prstGeom prst="rect"/><a:ln/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
"@
    $frag = New-Object System.Xml.XmlDocument
    $frag.LoadXml($xml)
    $node = $doc.ImportNode($frag.DocumentElement, $true)
    [void]$body.InsertAfter($node, $kids[$idx])
    $inserted++
    Write-Output ("  {0,-6} {1,-40} {2:N2}in x {3:N2}in" -f $sect, $f.title, $wIn, $hIn)
  }

  Write-Xml 'word/_rels/document.xml.rels' $rels
  Write-Xml 'word/document.xml' $doc
  Write-Output "Da chen $inserted anh; bo qua $missing"
}
finally { $zip.Dispose() }
