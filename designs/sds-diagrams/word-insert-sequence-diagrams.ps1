<#
  Chen anh sequence diagram vao Report 4, ngay duoi heading cap 5 "2.<x>.2.<y> UC-<NN> - <ten UC>".
  Khop theo TEN HEADING nen chay lai nhieu lan deu duoc: anh cu bi thay, khong nhan doi.

  -Variant plain : dung uc<NN>-sequence-diagram.png       (lifeline la hop chu nhat)
  -Variant icon  : dung uc<NN>-sequence-diagram-icon.png  (ky hieu boundary/control/entity)

  Dung:
    powershell -File word-insert-sequence-diagrams.ps1 -Docx <file.docx> -DiagramRoot <designs/sds-diagrams> -Features <features.json> [-Variant icon]
#>
param(
  [Parameter(Mandatory = $true)][string]$Docx,
  [Parameter(Mandatory = $true)][string]$DiagramRoot,
  [Parameter(Mandatory = $true)][string]$Features,
  [ValidateSet('plain', 'icon')][string]$Variant = 'plain'
)
$ErrorActionPreference = 'Stop'
$W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
$R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
$PAGE_W_IN = 9.69
$PAGE_H_IN = 11.50      # chua chieu cao anh de con cho heading + mo ta tren cung trang
$EMU = 914400

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$feat = (Get-Content -LiteralPath $Features -Raw -Encoding UTF8 | ConvertFrom-Json).features
$suffix = if ($Variant -eq 'icon') { '-icon' } else { '' }

$zip = [System.IO.Compression.ZipFile]::Open($Docx, 'Update')
try {
  function Read-Xml([string]$n) {
    $e = $zip.Entries | Where-Object { $_.FullName -eq $n } | Select-Object -First 1
    if (-not $e) { throw "Khong co $n" }
    $d = New-Object System.Xml.XmlDocument; $d.PreserveWhitespace = $true
    $s = $e.Open(); try { $d.Load($s) } finally { $s.Dispose() }
    return $d
  }
  function Write-Xml([string]$n, $d) {
    ($zip.Entries | Where-Object { $_.FullName -eq $n }) | ForEach-Object { $_.Delete() }
    $ne = $zip.CreateEntry($n); $os = $ne.Open()
    try {
      $sw = New-Object System.IO.StreamWriter($os, (New-Object System.Text.UTF8Encoding($false)))
      $sw.Write($d.OuterXml); $sw.Flush(); $sw.Dispose()
    } finally { $os.Dispose() }
  }

  $rels = Read-Xml 'word/_rels/document.xml.rels'
  $relNs = 'http://schemas.openxmlformats.org/package/2006/relationships'
  function Get-RelId([string]$target) {
    foreach ($r in $rels.DocumentElement.ChildNodes) { if ($r.GetAttribute('Target') -eq $target) { return $r.GetAttribute('Id') } }
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

  $doc = Read-Xml 'word/document.xml'
  $ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable); $ns.AddNamespace('w', $W)
  $body = $doc.SelectSingleNode('/w:document/w:body', $ns)
  function Get-Text($p) { (($p.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '') }

  $inserted = 0; $missing = 0; $docPr = 20000
  for ($i = 0; $i -lt $feat.Count; $i++) {
    $f = $feat[$i]
    for ($y = 0; $y -lt $f.ucs.Count; $y++) {
      $uc = [int]$f.ucs[$y]
      $ucDir = 'uc{0:d2}' -f $uc
      $sect = '2.' + ($i + 1) + '.2.' + ($y + 1)
      $png = Join-Path $DiagramRoot "$ucDir/$ucDir-sequence-diagram$suffix.png"
      $meta = "$png.json"
      if (-not (Test-Path -LiteralPath $png)) { Write-Output "  thieu anh: $png"; $missing++; continue }

      $j = Get-Content -LiteralPath $meta -Raw | ConvertFrom-Json
      $wIn = [Math]::Min($PAGE_W_IN, $j.widthIn)
      $hIn = $wIn * $j.heightIn / $j.widthIn
      if ($hIn -gt $PAGE_H_IN) { $wIn = $wIn * $PAGE_H_IN / $hIn; $hIn = $PAGE_H_IN }   # anh cao qua thi thu nho theo chieu cao
      $cx = [int]($wIn * $EMU); $cy = [int]($hIn * $EMU)

      $mediaName = "word/media/$ucDir-sequence$suffix.png"
      ($zip.Entries | Where-Object { $_.FullName -eq $mediaName }) | ForEach-Object { $_.Delete() }
      $me = $zip.CreateEntry($mediaName); $ms = $me.Open()
      try { $bytes = [System.IO.File]::ReadAllBytes($png); $ms.Write($bytes, 0, $bytes.Length) } finally { $ms.Dispose() }
      $target = "media/$ucDir-sequence$suffix.png"
      $rid = Get-RelId $target
      if (-not $rid) { $rid = New-Rel $target }

      # tim heading cap 5 bat dau bang so muc
      $kids = @($body.ChildNodes); $idx = -1
      for ($k = 0; $k -lt $kids.Count; $k++) {
        if ($kids[$k].LocalName -ne 'p') { continue }
        if ((Get-Text $kids[$k]).Trim().StartsWith("$sect ")) { $idx = $k; break }
      }
      if ($idx -lt 0) { Write-Output "  khong thay heading '$sect ...'"; $missing++; continue }

      # bo qua doan mo ta (neu co) roi xoa anh cu
      $at = $idx
      $next = $kids[$at + 1]
      if ($next -and $next.LocalName -eq 'p' -and -not $next.SelectSingleNode('.//*[local-name()="drawing"]')) { $at++ ; $next = $kids[$at + 1] }
      if ($next -and $next.LocalName -eq 'p' -and $next.SelectSingleNode('.//*[local-name()="drawing"]')) { [void]$body.RemoveChild($next) }

      $docPr++
      $xml = @"
<w:p xmlns:w="$W"><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr/><w:drawing>
<wp:inline distB="0" distT="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<wp:extent cx="$cx" cy="$cy"/><wp:effectExtent b="0" l="0" r="0" t="0"/>
<wp:docPr id="$docPr" name="$ucDir-sequence$suffix.png"/>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="$ucDir-sequence$suffix.png"/><pic:cNvPicPr preferRelativeResize="0"/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="$rid" xmlns:r="$R"/><a:srcRect b="0" l="0" r="0" t="0"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm><a:prstGeom prst="rect"/><a:ln/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
"@
      $frag = New-Object System.Xml.XmlDocument; $frag.LoadXml($xml)
      [void]$body.InsertAfter($doc.ImportNode($frag.DocumentElement, $true), $kids[$at])
      $inserted++
    }
  }

  Write-Xml 'word/_rels/document.xml.rels' $rels
  Write-Xml 'word/document.xml' $doc
  Write-Output "Ban '$Variant': da chen $inserted anh sequence; bo qua $missing"
}
finally { $zip.Dispose() }
