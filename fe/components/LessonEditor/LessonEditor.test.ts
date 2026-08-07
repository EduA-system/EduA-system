import { describe, expect, it } from "vitest";
import { aiSectionTextToHtml } from "./LessonEditor";

describe("aiSectionTextToHtml — công thức khối \\[...\\]", () => {
  it("dựng đúng block-math khi có đủ cả hai dấu \\[ và \\]", () => {
    const html = aiSectionTextToHtml("\\[\\frac{x - 2}{3} = \\frac{y - 3}{-2}\\]");
    expect(html).toContain('data-type="block-math"');
    expect(html).toContain("frac{x - 2}{3}");
    expect(html).not.toContain("<p>");
  });

  /**
   * Tái hiện lỗi thật gặp trên live: AI viết đúng dấu mở "\\[" nhưng rớt mất "\\" ở dấu đóng,
   * chỉ còn "]" trơn (vd "\\[\\frac{x - 2}{3} = ...}.]") — cùng một response mà công thức khác
   * ("Câu 2") lại viết đúng cả hai đầu, tức AI không ổn định dù prompt đã nhắc rõ. Trước khi sửa,
   * dòng này lọt qua cả `blockMath` lẫn `dollarBlockMath` regex, rơi xuống nhánh
   * `<p>${inlineRichText(line)}</p>` mặc định, hiện ra dưới dạng chữ thô "\[...]" thay vì công
   * thức. `richParagraph` giờ chấp nhận thiếu "\\" ở dấu đóng.
   */
  it("vẫn dựng được block-math khi AI rớt mất dấu \\ ở đóng (chỉ còn ']' trơn)", () => {
    const html = aiSectionTextToHtml("\\[\\frac{x - 2}{3} = \\frac{y - 3}{-2} = \\frac{z - 1}{3}.]");
    expect(html).toContain('data-type="block-math"');
    expect(html).not.toContain("\\[");
    expect(html).not.toContain("<p>");
  });

  it("không nhận nhầm câu văn thường có ngoặc vuông (không có dấu mở \\[) thành công thức", () => {
    const html = aiSectionTextToHtml("Xem chú thích [1] ở cuối bài.");
    expect(html).not.toContain('data-type="block-math"');
    expect(html).toContain("<p>");
  });

  /**
   * Tái hiện lỗi thật gặp trên live: AI viết ĐÚNG cú pháp "$$...$$" (kèm ký hiệu $$ theo quy
   * ước chấp nhận trong prompt) nhưng thêm chú thích điều kiện ngay SAU dấu đóng trên cùng một
   * dòng (vd "$$\\begin{cases}...\\end{cases}$$ (với t ∈ R)."). Trước khi sửa, regex buộc dòng
   * phải KẾT THÚC CHÍNH XÁC bằng "$$" — không cho phép bất kỳ chữ nào sau đó — nên cả dòng rơi
   * về hiển thị text thô dù công thức tự nó hoàn toàn hợp lệ. Giờ phần chữ sau dấu đóng được
   * tách ra thành một đoạn văn riêng, công thức vẫn được dựng thành block-math bình thường.
   */
  it("vẫn dựng được block-math $$...$$ khi có chữ chú thích theo sau dấu đóng trên cùng dòng", () => {
    const html = aiSectionTextToHtml(
      "$$\\begin{cases} x = t \\\\ y = 2t \\\\ z = 3t \\end{cases}$$ (với t ∈ R).",
    );
    expect(html).toContain('data-type="block-math"');
    expect(html).toContain("begin{cases} x = t");
    expect(html).not.toContain("$$");
    expect(html).toContain("<p>(với");
  });

  it("cũng dung sai chữ theo sau dấu đóng \\] (không chỉ $$)", () => {
    const html = aiSectionTextToHtml("\\[\\frac{a}{b}\\] (với b ≠ 0).");
    expect(html).toContain('data-type="block-math"');
    expect(html).not.toContain("\\[");
    expect(html).toContain("<p>(với");
  });

  /**
   * Tái hiện lỗi thật gặp trên live (bài "phương trình tham số của đường thẳng"): AI viết hẳn
   * một hệ phương trình "\begin{cases}...\end{cases}" nhưng KHÔNG bọc trong "\[...\]"/"$$...$$"
   * nào cả — không có delimiter thì không có gì để tách, cả khối rơi thẳng ra thành chữ thô
   * ("\begin{cases}x = 2 + 3t..." hiện nguyên văn). `wrapBareLatexEnvironments` tự bọc lại các
   * môi trường LaTeX trần trụi này trước khi tách delimiter, dựa trên việc "\begin{" là token
   * chỉ có trong LaTeX — không cần AI cải thiện gì, không lo nhận nhầm văn xuôi thường.
   */
  it("tự bọc block-math cho môi trường LaTeX trần trụi (không có \\[...\\]/$$...$$ bao quanh)", () => {
    const html = aiSectionTextToHtml(
      "Phương trình tham số của đường thẳng Δ là:\n\\begin{cases}x = 2 + 3t \\\\ y = 3 - 2t \\\\ z = 1 + 3t \\end{cases}",
    );
    expect(html).toContain('data-type="block-math"');
    expect(html).toContain("begin{cases}x = 2 + 3t");
    expect(html).not.toContain("<p>\\begin");
  });

  it("không bọc đôi khi môi trường LaTeX đã được bọc đúng sẵn trong \\[...\\]", () => {
    const html = aiSectionTextToHtml("\\[\\begin{cases}x = 1\\end{cases}\\]");
    const matches = html.match(/data-type="block-math"/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(html).not.toContain("\\[\\[");
  });
});
