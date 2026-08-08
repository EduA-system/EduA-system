import { describe, expect, it } from "vitest";
import splitAtDelimiters from "./splitAtDelimiters";

const DELIMS = [
  { left: "\\[", right: "\\]", display: true },
  { left: "$$", right: "$$", display: true },
];

describe("splitAtDelimiters (vendor từ KaTeX contrib/auto-render)", () => {
  it("trả về một đoạn text khi không có delimiter nào", () => {
    expect(splitAtDelimiters("Xin chào.", DELIMS)).toEqual([{ type: "text", data: "Xin chào." }]);
  });

  it("tách đúng công thức khối \\[...\\] không có text quanh", () => {
    const result = splitAtDelimiters("\\[x = 1\\]", DELIMS);
    expect(result).toEqual([
      { type: "math", data: "x = 1", rawData: "\\[x = 1\\]", display: true },
    ]);
  });

  it("giữ nguyên chữ đứng SAU dấu đóng trên cùng dòng (không còn buộc dòng phải kết thúc bằng delimiter)", () => {
    const result = splitAtDelimiters("$$x = t$$ (với t ∈ R).", DELIMS);
    expect(result).toEqual([
      { type: "math", data: "x = t", rawData: "$$x = t$$", display: true },
      { type: "text", data: " (với t ∈ R)." },
    ]);
  });

  it("giữ nguyên chữ đứng TRƯỚC dấu mở trên cùng dòng", () => {
    const result = splitAtDelimiters("Công thức: \\[x = 1\\]", DELIMS);
    expect(result[0]).toEqual({ type: "text", data: "Công thức: " });
    expect(result[1]).toMatchObject({ type: "math", data: "x = 1" });
  });

  it("tách đúng NHIỀU công thức khối xen kẽ text trên cùng dòng", () => {
    const result = splitAtDelimiters("A: $$1$$ B: $$2$$", DELIMS);
    expect(result.map((s) => [s.type, s.data])).toEqual([
      ["text", "A: "],
      ["math", "1"],
      ["text", " B: "],
      ["math", "2"],
    ]);
  });

  it("không bị cắt sớm bởi ký tự } bên trong \\begin{cases}...\\end{cases} (theo dõi độ sâu ngoặc nhọn)", () => {
    const result = splitAtDelimiters("\\[\\begin{cases}x = 1 \\\\ y = 2\\end{cases}\\]", DELIMS);
    expect(result).toEqual([
      {
        type: "math",
        data: "\\begin{cases}x = 1 \\\\ y = 2\\end{cases}",
        rawData: "\\[\\begin{cases}x = 1 \\\\ y = 2\\end{cases}\\]",
        display: true,
      },
    ]);
  });

  it("delimiter mở nhưng không có delimiter đóng — coi phần còn lại là text (không throw)", () => {
    const result = splitAtDelimiters("\\[x = 1 chưa đóng", DELIMS);
    expect(result).toEqual([{ type: "text", data: "\\[x = 1 chưa đóng" }]);
  });
});
