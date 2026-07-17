function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function openLessonPlanPrintDialog(title: string, documentHtml: string): boolean {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return false;

  printWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#111;font-family:'Times New Roman',serif;font-size:12pt;line-height:1.45}h1{font-size:16pt;text-align:center;margin:0 0 6pt}h2{font-size:14pt;margin:18pt 0 8pt}h3{font-size:12pt;margin:14pt 0 6pt}p{margin:0 0 6pt}ul{margin:0 0 8pt;padding-left:20pt}li{margin-bottom:3pt}table{width:100%;border-collapse:collapse;margin:8pt 0;break-inside:avoid}th,td{border:1px solid #333;padding:6pt;vertical-align:top}th{text-align:center;font-weight:700}.document-meta{text-align:center;color:#444;margin-bottom:16pt}.mc-option{margin:2pt 0}.mc-answer-row{font-weight:700;word-spacing:8pt}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${documentHtml}<script>window.onload=()=>{window.focus();window.print();}</script></body></html>`);
  printWindow.document.close();
  return true;
}
