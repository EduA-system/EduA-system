<#
  Xoa toan bo muc 2 (Detailed Design) trong Report 4 va dung lai khung theo feature:
     2.x       <Feature>            Heading3
     2.x.1     Class Diagram        Heading4
     2.x.2     Sequence Diagram     Heading4
     2.x.2.y   UC-NN - <Ten UC>     Heading5  + doan mo ta lay lai tu ban cu
  KHONG chen anh.
#>
param(
  [Parameter(Mandatory=$true)][string]$InDocx,
  [Parameter(Mandatory=$true)][string]$OutDocx,
  [Parameter(Mandatory=$true)][string]$Features
)
$ErrorActionPreference='Stop'
$W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'

Copy-Item -LiteralPath $InDocx -Destination $OutDocx -Force
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$feat = (Get-Content -LiteralPath $Features -Raw -Encoding UTF8 | ConvertFrom-Json).features

$zip=[System.IO.Compression.ZipFile]::Open($OutDocx,'Update')
try{
  $entry=$zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' } | Select-Object -First 1
  $doc=New-Object System.Xml.XmlDocument; $doc.PreserveWhitespace=$true
  $s=$entry.Open(); try{ $doc.Load($s) } finally { $s.Dispose() }
  $ns=New-Object System.Xml.XmlNamespaceManager($doc.NameTable); $ns.AddNamespace('w',$W)
  $body=$doc.SelectSingleNode('/w:document/w:body',$ns)

  function Get-Text($p){ (($p.SelectNodes('.//w:t',$ns) | ForEach-Object {$_.InnerText}) -join '') }
  function Get-Style($p){ $st=$p.SelectSingleNode('w:pPr/w:pStyle',$ns); if($st){$st.GetAttribute('val',$W)}else{''} }

  # ---- xac dinh bien cua muc 2 ----
  $kids=@($body.ChildNodes); $start=-1; $end=-1
  for($i=0;$i -lt $kids.Count;$i++){
    if($kids[$i].LocalName -ne 'p'){ continue }
    $t=(Get-Text $kids[$i]).Trim()
    if($start -lt 0 -and $t -eq '2. Detailed Design'){ $start=$i }
    elseif($start -ge 0 -and $t -eq '3. Class Specifications'){ $end=$i; break }
  }
  if($start -lt 0 -or $end -lt 0){ throw "Khong xac dinh duoc bien muc 2 (start=$start end=$end)" }
  $range=@($kids[($start+1)..($end-1)])
  if($range.Count -lt 100 -or $range.Count -gt 900){ throw "Pham vi bat thuong: $($range.Count) node" }
  $nTbl=@($range | Where-Object { $_.LocalName -eq 'tbl' }).Count
  if($nTbl -gt 0){ throw "Pham vi chua $nTbl bang - dung lai, khong xoa" }
  Write-Output "Muc 2: node $($start+1)..$($end-1) = $($range.Count) doan, 0 bang"

  # ---- thu hoach ten UC + mo ta cua ban cu ----
  $ucName=@{}; $ucDesc=@{}
  for($i=0;$i -lt $range.Count;$i++){
    $p=$range[$i]; if($p.LocalName -ne 'p'){ continue }
    if((Get-Style $p) -ne 'Heading3'){ continue }
    $t=(Get-Text $p).Trim()
    $m=[regex]::Match($t,'^2\.\d+\s+UC-(\d+)\s*[-–—]\s*(.+)$')
    if(-not $m.Success){ continue }
    $n=[int]$m.Groups[1].Value; $ucName[$n]=$m.Groups[2].Value.Trim()
    $desc=@()
    for($j=$i+1;$j -lt $range.Count;$j++){
      $q=$range[$j]; if($q.LocalName -ne 'p'){ break }
      $sty=Get-Style $q; if($sty -like 'Heading*'){ break }
      $txt=(Get-Text $q).Trim(); if($txt){ $desc+=$txt }
    }
    $ucDesc[$n]=($desc -join ' ')
  }
  $nDesc=@($ucDesc.Values | Where-Object { $_ }).Count
  Write-Output "Thu hoach: $($ucName.Count) ten UC, $nDesc doan mo ta"

  # ---- mau de nhan ban ----
  $tplH3=$null;$tplH4=$null;$tplTxt=$null
  foreach($p in $range){
    if($p.LocalName -ne 'p'){ continue }
    $sty=Get-Style $p
    if(-not $tplH3 -and $sty -eq 'Heading3'){ $tplH3=$p; continue }
    if(-not $tplH4 -and $sty -eq 'Heading4'){ $tplH4=$p; continue }
    if(-not $tplTxt -and $sty -eq '' -and (Get-Text $p).Trim() -and -not $p.SelectSingleNode('.//*[local-name()="drawing"]')){ $tplTxt=$p }
  }
  if(-not($tplH3 -and $tplH4 -and $tplTxt)){ throw 'Khong tim du mau paragraph' }

  # id bookmark moi bat dau tu max hien co + 1
  $maxId=0
  foreach($b in $doc.SelectNodes('//w:bookmarkStart',$ns)){ $v=[int]$b.GetAttribute('id',$W); if($v -gt $maxId){$maxId=$v} }
  $script:bmId=$maxId+1

  function New-Para($tpl,[string]$text,[string]$style,[string]$bookmark){
    $p=$tpl.CloneNode($true)
    if($style){
      $st=$p.SelectSingleNode('w:pPr/w:pStyle',$ns)
      if($st){ [void]$st.SetAttribute('val',$W,$style) }
    }
    foreach($b in @($p.SelectNodes('.//w:bookmarkStart',$ns))){ [void]$b.ParentNode.RemoveChild($b) }
    foreach($b in @($p.SelectNodes('.//w:bookmarkEnd',$ns))){ [void]$b.ParentNode.RemoveChild($b) }
    $runs=@($p.SelectNodes('w:r',$ns))
    for($k=1;$k -lt $runs.Count;$k++){ [void]$p.RemoveChild($runs[$k]) }
    foreach($h in @($p.SelectNodes('w:hyperlink',$ns))){ [void]$p.RemoveChild($h) }
    $t=$p.SelectSingleNode('.//w:t',$ns)
    if(-not $t){ throw 'Mau khong co w:t' }
    $t.InnerText=$text
    if($bookmark){
      $bs=$doc.CreateElement('w','bookmarkStart',$W); [void]$bs.SetAttribute('name',$W,$bookmark); [void]$bs.SetAttribute('id',$W,[string]$script:bmId)
      $be=$doc.CreateElement('w','bookmarkEnd',$W);   [void]$be.SetAttribute('id',$W,[string]$script:bmId)
      $script:bmId++
      $pPr=$p.SelectSingleNode('w:pPr',$ns)
      if($pPr){ [void]$p.InsertAfter($bs,$pPr); [void]$p.InsertAfter($be,$bs) }
      else{ [void]$p.PrependChild($be); [void]$p.PrependChild($bs) }
    }
    return $p
  }

  # ---- dung khung moi ----
  $new=New-Object System.Collections.ArrayList
  $fi=0
  foreach($f in $feat){
    $fi++
    [void]$new.Add((New-Para $tplH3 "2.$fi $($f.title)" 'Heading3' "_heading=h.$($f.id)"))
    [void]$new.Add((New-Para $tplH4 "2.$fi.1 Class Diagram" 'Heading4' "_heading=h.$($f.id)c"))
    [void]$new.Add((New-Para $tplH4 "2.$fi.2 Sequence Diagram" 'Heading4' "_heading=h.$($f.id)s"))
    $y=0
    foreach($uc in $f.ucs){
      $y++
      $ucn=[int]$uc
      $nm=$ucName[$ucn]; if(-not $nm){ throw "Thieu ten cho UC-$ucn" }
      $dash=[char]0x2014
      $lbl='UC-{0:d2} {2} {1}' -f $ucn,$nm,$dash
      [void]$new.Add((New-Para $tplH4 "2.$fi.2.$y $lbl" 'Heading5' ('_heading=h.uc{0:d2}' -f $ucn)))
      $d=$ucDesc[$ucn]
      if($d){ [void]$new.Add((New-Para $tplTxt $d '' $null)) }
    }
  }
  Write-Output "Khung moi: $($new.Count) doan cho $($feat.Count) feature"

  # ---- thay the ----
  foreach($n in $range){ [void]$body.RemoveChild($n) }
  $anchor=$kids[$start]
  $aPr=$anchor.SelectSingleNode('w:pPr',$ns)
  if(-not $aPr){ $aPr=$doc.CreateElement('w','pPr',$W); [void]$anchor.PrependChild($aPr) }
  $aSt=$aPr.SelectSingleNode('w:pStyle',$ns)
  if(-not $aSt){ $aSt=$doc.CreateElement('w','pStyle',$W); [void]$aPr.PrependChild($aSt) }
  [void]$aSt.SetAttribute('val',$W,'Heading2')
  foreach($n in $new){ $anchor=$body.InsertAfter($n,$anchor) }

  # ---- ghi lai ----
  $entry.Delete()
  $newEntry=$zip.CreateEntry('word/document.xml')
  $os=$newEntry.Open()
  try{
    $sw=New-Object System.IO.StreamWriter($os,(New-Object System.Text.UTF8Encoding($false)))
    $sw.Write($doc.OuterXml); $sw.Flush(); $sw.Dispose()
  } finally { $os.Dispose() }
  Write-Output "Da ghi word/document.xml ($($doc.OuterXml.Length) ky tu)"
}
finally{ $zip.Dispose() }
