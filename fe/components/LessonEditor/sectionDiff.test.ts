import { describe, expect, it } from "vitest";
import { buildSectionDiffHtml, diffSectionLines } from "./sectionDiff";

describe("diffSectionLines", () => {
  it("gộp dòng giống nhau vào 1 chunk unchanged", () => {
    const chunks = diffSectionLines("Dòng một\nDòng hai\nDòng ba", "Dòng một\nDòng hai\nDòng ba");
    expect(chunks).toEqual([{ state: "unchanged", text: "Dòng một\nDòng hai\nDòng ba" }]);
  });

  it("phát hiện dòng bị xoá và dòng được thêm", () => {
    const chunks = diffSectionLines("Dòng một\nDòng hai", "Dòng một\nDòng mới");
    expect(chunks).toEqual([
      { state: "unchanged", text: "Dòng một" },
      { state: "removed", text: "Dòng hai" },
      { state: "added", text: "Dòng mới" },
    ]);
  });

  it("bỏ qua chunk rỗng (chỉ có newline thừa)", () => {
    const chunks = diffSectionLines("Dòng một\n", "Dòng một\n\n");
    expect(chunks.every((chunk) => chunk.text.length > 0)).toBe(true);
  });
});

describe("buildSectionDiffHtml", () => {
  it("không gắn data-diff-state cho chunk unchanged", () => {
    const html = buildSectionDiffHtml([{ state: "unchanged", text: "Đoạn văn bình thường" }]);
    expect(html).toBe("<p>Đoạn văn bình thường</p>");
  });

  it("gắn data-diff-state=removed lên <p> của chunk removed", () => {
    const html = buildSectionDiffHtml([{ state: "removed", text: "Đoạn bị xoá" }]);
    expect(html).toBe('<p data-diff-state="removed">Đoạn bị xoá</p>');
  });

  it("gắn data-diff-state=added lên từng <li> trong danh sách bullet", () => {
    const html = buildSectionDiffHtml([{ state: "added", text: "- Mục một\n- Mục hai" }]);
    expect(html).toBe(
      '<ul><li data-diff-state="added">Mục một</li><li data-diff-state="added">Mục hai</li></ul>',
    );
  });

  it("gắn data-diff-state lên block công thức toán mà không phá data-latex", () => {
    const html = buildSectionDiffHtml([{ state: "added", text: "\\[F = ma\\]" }]);
    expect(html).toBe('<div data-diff-state="added" data-type="block-math" data-latex="F = ma"></div>');
  });

  it("nối nhiều chunk theo đúng thứ tự gốc", () => {
    const html = buildSectionDiffHtml([
      { state: "unchanged", text: "Giữ nguyên" },
      { state: "removed", text: "Bị xoá" },
      { state: "added", text: "Được thêm" },
    ]);
    expect(html).toBe(
      "<p>Giữ nguyên</p>" +
        '<p data-diff-state="removed">Bị xoá</p>' +
        '<p data-diff-state="added">Được thêm</p>',
    );
  });

  it("bảng không đổi (1 chunk unchanged) render thành đúng 1 <table>, không gắn diffState", () => {
    const html = buildSectionDiffHtml([
      { state: "unchanged", text: "‖ Tên thiết bị ‖ Số lượng ‖\n| Máy chiếu | 1 cái |" },
    ]);
    expect(html).toBe(
      "<table><tbody>" +
        "<tr><th><p>Tên thiết bị</p></th><th><p>Số lượng</p></th></tr>" +
        "<tr><td><p>Máy chiếu</p></td><td><p>1 cái</p></td></tr>" +
        "</tbody></table>",
    );
  });

  it("bảng bị diffLines cắt header/data ra nhiều chunk vẫn gộp lại thành MỘT <table>", () => {
    const chunks = diffSectionLines(
      "‖ Tên thiết bị ‖ Số lượng ‖\n| Máy chiếu | 1 cái |",
      "‖ Tên thiết bị ‖ Số lượng ‖\n| Máy chiếu | 2 cái |",
    );
    const html = buildSectionDiffHtml(chunks);
    expect(html).toBe(
      "<table><tbody>" +
        "<tr><th><p>Tên thiết bị</p></th><th><p>Số lượng</p></th></tr>" +
        '<tr data-diff-state="removed"><td><p>Máy chiếu</p></td><td><p>1 cái</p></td></tr>' +
        '<tr data-diff-state="added"><td><p>Máy chiếu</p></td><td><p>2 cái</p></td></tr>' +
        "</tbody></table>",
    );
  });

  it("bảng tiểu hoạt động: ô 4 bước nối bằng <br> vẫn tách lại đúng thành nhiều đoạn trong <td>", () => {
    const html = buildSectionDiffHtml([
      {
        state: "added",
        text: '‖ Hoạt động của GV và HS ‖ Sản phẩm dự kiến ‖\n| **Giao nhiệm vụ học tập:** Đọc SGK<br>**Báo cáo, thảo luận:** Trình bày | Đáp án đúng |',
      },
    ]);
    expect(html).toBe(
      "<table><tbody>" +
        "<tr><th><p>Hoạt động của GV và HS</p></th><th><p>Sản phẩm dự kiến</p></th></tr>" +
        '<tr data-diff-state="added"><td><p><b>Giao nhiệm vụ học tập:</b> Đọc SGK</p><p><b>Báo cáo, thảo luận:</b> Trình bày</p></td><td><p>Đáp án đúng</p></td></tr>' +
        "</tbody></table>",
    );
  });
});
