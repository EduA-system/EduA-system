import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import {
  TABLE_BREAK_LINE,
  buildTableDiffHtml,
  isTableRowLine,
  pipeTextToTableHtml,
  tableHeaderCells,
  tableNodeToPipeText,
} from "./tableText";

const schema = getSchema([StarterKit, TableKit]);

function paragraph(text: string) {
  return { type: "paragraph", content: text ? [{ type: "text", text }] : [] };
}

function tableNode(json: Record<string, unknown>) {
  return schema.nodeFromJSON({ type: "table", ...json });
}

const noMath = () => "";

describe("tableNodeToPipeText", () => {
  it("mã hoá bảng 2 cột (hàng tiêu đề + hàng dữ liệu) thành dòng ‖/|", () => {
    const table = tableNode({
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [paragraph("Tên thiết bị")] },
            { type: "tableHeader", content: [paragraph("Số lượng")] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [paragraph("Máy chiếu")] },
            { type: "tableCell", content: [paragraph("1 cái")] },
          ],
        },
      ],
    });

    expect(tableNodeToPipeText(table, noMath)).toEqual([
      "‖ Tên thiết bị ‖ Số lượng ‖",
      "| Máy chiếu | 1 cái |",
    ]);
  });

  it("nối nhiều đoạn trong cùng một ô bằng token <br>", () => {
    const table = tableNode({
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [paragraph("Bước 1"), paragraph("Bước 2")] },
            { type: "tableCell", content: [paragraph("Sản phẩm")] },
          ],
        },
      ],
    });

    expect(tableNodeToPipeText(table, noMath)).toEqual(["| Bước 1<br>Bước 2 | Sản phẩm |"]);
  });

  it("bảng 1 cột (phiếu học tập) không có hàng tiêu đề", () => {
    const table = tableNode({
      content: [
        {
          type: "tableRow",
          content: [{ type: "tableCell", content: [paragraph("**Phiếu học tập số 1**")] }],
        },
      ],
    });

    expect(tableNodeToPipeText(table, noMath)).toEqual(["| **Phiếu học tập số 1** |"]);
  });
});

describe("tableHeaderCells", () => {
  it("trả về mảng tên cột của dòng tiêu đề", () => {
    expect(tableHeaderCells(["‖ A ‖ B ‖", "| 1 | 2 |"])).toEqual(["A", "B"]);
  });

  it("trả về null khi không có dòng tiêu đề", () => {
    expect(tableHeaderCells(["| 1 |", "| 2 |"])).toBeNull();
  });
});

describe("isTableRowLine", () => {
  it("nhận diện dòng tiêu đề và dòng dữ liệu", () => {
    expect(isTableRowLine("‖ A ‖ B ‖")).toBe(true);
    expect(isTableRowLine("| 1 | 2 |")).toBe(true);
    expect(isTableRowLine("Đoạn văn thường")).toBe(false);
    expect(isTableRowLine(TABLE_BREAK_LINE)).toBe(false);
  });
});

const identityCell = (text: string) => `<p>${text}</p>`;

describe("pipeTextToTableHtml", () => {
  it("dựng lại đúng <table><tbody> với hàng tiêu đề <th> và hàng dữ liệu <td>", () => {
    const html = pipeTextToTableHtml(["‖ A ‖ B ‖", "| 1 | 2 |"], identityCell);
    expect(html).toBe("<table><tbody><tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>");
  });

  it("bảng 1 cột không có <th>", () => {
    const html = pipeTextToTableHtml(["| Tên phiếu |", "| Nội dung |"], identityCell);
    expect(html).toBe("<table><tbody><tr><td><p>Tên phiếu</p></td></tr><tr><td><p>Nội dung</p></td></tr></tbody></table>");
  });

  it("tách <br> trong ô thành text nhiều dòng trước khi render", () => {
    const seen: string[] = [];
    pipeTextToTableHtml(["| Bước 1<br>Bước 2 |"], (text) => {
      seen.push(text);
      return `<p>${text}</p>`;
    });
    expect(seen).toEqual(["Bước 1\nBước 2"]);
  });

  it("TABLE_BREAK_LINE tách hai bảng liên tiếp thành 2 <table> riêng", () => {
    const html = pipeTextToTableHtml(["| A |", TABLE_BREAK_LINE, "| B |"], identityCell);
    expect(html).toBe(
      "<table><tbody><tr><td><p>A</p></td></tr></tbody></table>" +
        "<table><tbody><tr><td><p>B</p></td></tr></tbody></table>",
    );
  });

  it("escape ký tự | trong nội dung ô vẫn tách đúng cột", () => {
    const html = pipeTextToTableHtml(["| A \\| B | C |"], identityCell);
    expect(html).toBe("<table><tbody><tr><td><p>A | B</p></td><td><p>C</p></td></tr></tbody></table>");
  });
});

describe("buildTableDiffHtml", () => {
  it("gộp nhiều dòng từ các chunk khác nhau vào MỘT <table>, gắn data-diff-state theo từng hàng", () => {
    const html = buildTableDiffHtml(
      [
        { line: "‖ A ‖ B ‖", state: "unchanged" },
        { line: "| 1 | 2 |", state: "removed" },
        { line: "| 1 | 3 |", state: "added" },
      ],
      identityCell,
    );
    expect(html).toBe(
      "<table><tbody>" +
        "<tr><th><p>A</p></th><th><p>B</p></th></tr>" +
        '<tr data-diff-state="removed"><td><p>1</p></td><td><p>2</p></td></tr>' +
        '<tr data-diff-state="added"><td><p>1</p></td><td><p>3</p></td></tr>' +
        "</tbody></table>",
    );
  });

  it("không bao giờ gắn data-diff-state lên hàng tiêu đề dù chunk của nó added/removed", () => {
    const html = buildTableDiffHtml([{ line: "‖ A ‖ B ‖", state: "added" }], identityCell);
    expect(html).toBe("<table><tbody><tr><th><p>A</p></th><th><p>B</p></th></tr></tbody></table>");
  });
});
