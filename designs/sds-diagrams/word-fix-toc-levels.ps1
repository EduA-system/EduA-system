<#
  Cho Heading5 (muc 2.x.2.y = tung UC) vao muc luc o cap 4.
  Khong them Heading4: neu them thi muc 3 (Class Specifications) se do vao ~100 dong rac.
#>
param(
  [Parameter(Mandatory=$true)][string]$Docx
)
$ErrorActionPreference='Stop'
$W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip=[System.IO.Compression.ZipFile]::Open($Docx,'Update')
try{
  $entry=$zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' } | Select-Object -First 1
  $doc=New-Object System.Xml.XmlDocument; $doc.PreserveWhitespace=$true
  $s=$entry.Open(); try{ $doc.Load($s) } finally { $s.Dispose() }
  $ns=New-Object System.Xml.XmlNamespaceManager($doc.NameTable); $ns.AddNamespace('w',$W)

  $nodes=@($doc.SelectNodes('//w:instrText',$ns) | Where-Object { $_.InnerText -match 'TOC' })
  if($nodes.Count -ne 1){ throw "Tim thay $($nodes.Count) field TOC - dung lai" }
  $old=$nodes[0].InnerText
  Write-Output "TOC cu : $old"
  $q=[char]0x22
  $new=' TOC \h \u \z \t ' + $q + 'Heading 1,1,Heading 2,2,Heading 3,3,Heading 5,4,' + $q + ' '
  $nodes[0].InnerText=$new
  Write-Output "TOC moi: $new"

  $entry.Delete()
  $ne=$zip.CreateEntry('word/document.xml')
  $os=$ne.Open()
  try{
    $sw=New-Object System.IO.StreamWriter($os,(New-Object System.Text.UTF8Encoding($false)))
    $sw.Write($doc.OuterXml); $sw.Flush(); $sw.Dispose()
  } finally { $os.Dispose() }
  Write-Output 'Da ghi lai word/document.xml'
}
finally{ $zip.Dispose() }
