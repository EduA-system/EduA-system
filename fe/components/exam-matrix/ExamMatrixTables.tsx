const levels = ["Biết", "Hiểu", "Vận<br>dụng"];
const questionTypes = ["<i>Nhiều lựa chọn</i>", "<i>“Đúng – Sai”</i>", "<i>Trả lời ngắn</i>", "Tự luận"];

function cells(count: number, tag: "td" | "th" = "td") {
  return Array.from({ length: count }, () => `<${tag}><p></p></${tag}>`).join("");
}

function levelCells(groupCount: number) {
  return Array.from({ length: groupCount }, () => levels.map((level) => `<th><p>${level}</p></th>`).join(""))
    .join("");
}

function summaryRow(label: string, leading: number, groups: number[]) {
  return `<tr><th colspan="${leading}"><p><b>${label}</b></p></th>${groups
    .map((span) => `<td${span > 1 ? ` colspan="${span}"` : ""}><p></p></td>`)
    .join("")}</tr>`;
}

function matrixTable() {
  const blankRows = Array.from({ length: 7 }, () => `<tr>${cells(19)}</tr>`).join("");
  return `
    <h2>1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ</h2>
    <table>
      <tbody>
        <tr>
          <th rowspan="4"><p><b>TT</b></p></th>
          <th rowspan="4"><p><b>Chủ đề/Chương</b></p></th>
          <th rowspan="4"><p><b>Nội dung/đơn vị kiến thức</b></p></th>
          <th colspan="12"><p><b>Mức độ đánh giá</b></p></th>
          <th colspan="3" rowspan="3"><p><b>Tổng</b></p></th>
          <th rowspan="4"><p><b>Tỉ lệ<br>%<br>điểm</b></p></th>
        </tr>
        <tr><th colspan="9"><p><b>TNKQ</b></p></th><th colspan="3"><p><b>Tự luận</b></p></th></tr>
        <tr>${questionTypes.map((type) => `<th colspan="3"><p>${type}</p></th>`).join("")}</tr>
        <tr>${levelCells(4)}${levelCells(1)}</tr>
        ${blankRows}
        ${summaryRow("Tổng số câu", 3, Array(16).fill(1))}
        ${summaryRow("Tổng số điểm", 3, [3, 3, 3, 3, 1, 1, 1, 1])}
        ${summaryRow("Tỉ lệ %", 3, [3, 3, 3, 3, 1, 1, 1, 1])}
      </tbody>
    </table>
  `;
}

function specificationTable() {
  const blankRows = Array.from({ length: 9 }, () => `<tr>${cells(16)}</tr>`).join("");
  return `
    <h2>2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ</h2>
    <table>
      <tbody>
        <tr>
          <th rowspan="4"><p><b>TT</b></p></th>
          <th rowspan="4"><p><b>Chủ đề/Chương</b></p></th>
          <th rowspan="4"><p><b>Nội dung/đơn vị kiến thức</b></p></th>
          <th rowspan="4"><p><b>Yêu cầu cần đạt</b></p></th>
          <th colspan="12"><p><b>Số câu hỏi ở các mức độ đánh giá</b></p></th>
        </tr>
        <tr><th colspan="9"><p><b>TNKQ</b></p></th><th colspan="3"><p><b>Tự luận</b></p></th></tr>
        <tr>${questionTypes.map((type) => `<th colspan="3"><p>${type}</p></th>`).join("")}</tr>
        <tr>${levelCells(4)}</tr>
        ${blankRows}
        ${summaryRow("Tổng số câu", 4, Array(12).fill(1))}
        ${summaryRow("Tổng số điểm", 4, [3, 3, 3, 3])}
        ${summaryRow("Tỉ lệ %", 4, [3, 3, 3, 3])}
      </tbody>
    </table>
  `;
}

export function examMatrixTemplateHtml() {
  return `${matrixTable()}<p></p>${specificationTable()}<p></p>`;
}
