import { describe, expect, it } from "vitest";
import { normalizeVietnamese, resolvePhysicsPreset, type PhysicsPresetCandidate } from "./resolve-physics-preset";

/** Trích từ preset thật để cách khớp bám đúng dữ liệu đang có trên nhánh. */
const CATALOGUE: PhysicsPresetCandidate[] = [
  { id: "con-lac-don", presetId: "con-lac-don", title: "Con lắc đơn", domain: "Cơ học", desc: "Dao động của con lắc đơn quanh vị trí cân bằng", grade: 11 },
  { id: "con-lac-lo-xo", presetId: "con-lac-lo-xo", title: "Con lắc lò xo", domain: "Cơ học", desc: "Dao động điều hoà của vật gắn lò xo", grade: 11 },
  { id: "giao-thoa-song-nuoc", presetId: "giao-thoa-song-nuoc", title: "Giao thoa sóng nước", domain: "Sóng", desc: "Hai nguồn kết hợp tạo vân giao thoa", grade: 11 },
  { id: "dinh-luat-hooke", presetId: "dinh-luat-hooke", title: "Định luật Hooke", domain: "Cơ học", desc: "Độ giãn lò xo tỉ lệ với lực tác dụng", grade: 10 },
  { id: "brownian", presetId: "brownian-pollen", title: "Chuyển động Brown", domain: "Nhiệt học", desc: "Hạt phấn hoa chuyển động hỗn loạn trong nước", grade: 12 },
  { id: "tu-pho", presetId: "tu-pho", title: "Từ phổ nam châm", domain: "Điện & Từ", desc: "Mạt sắt sắp xếp theo đường sức từ", grade: 12 },
];

describe("normalizeVietnamese", () => {
  it("bỏ dấu và hạ chữ thường", () => {
    expect(normalizeVietnamese("Con lắc đơn")).toBe("con lac don");
    expect(normalizeVietnamese("Định luật Hooke")).toBe("dinh luat hooke");
  });

  it("gộp mọi ký tự không phải chữ/số thành một khoảng trắng", () => {
    expect(normalizeVietnamese("giao-thoa_sóng   nước!")).toBe("giao thoa song nuoc");
  });
});

describe("resolvePhysicsPreset", () => {
  it("khớp theo tên có dấu", () => {
    expect(resolvePhysicsPreset("con lắc đơn", CATALOGUE)?.id).toBe("con-lac-don");
  });

  it("khớp khi AI viết không dấu", () => {
    expect(resolvePhysicsPreset("con lac don", CATALOGUE)?.id).toBe("con-lac-don");
  });

  it("phân biệt được hai preset gần nghĩa", () => {
    expect(resolvePhysicsPreset("con lắc lò xo", CATALOGUE)?.id).toBe("con-lac-lo-xo");
    expect(resolvePhysicsPreset("giao thoa sóng nước", CATALOGUE)?.id).toBe("giao-thoa-song-nuoc");
  });

  it("bỏ qua từ đệm như 'thí nghiệm', 'định luật'", () => {
    expect(resolvePhysicsPreset("thí nghiệm con lắc đơn", CATALOGUE)?.id).toBe("con-lac-don");
    expect(resolvePhysicsPreset("mô phỏng hiện tượng giao thoa sóng nước", CATALOGUE)?.id).toBe("giao-thoa-song-nuoc");
  });

  it("khớp được cả khi preset.id khác tên file", () => {
    const resolved = resolvePhysicsPreset("chuyển động Brown", CATALOGUE);
    expect(resolved?.id).toBe("brownian");
    // presetId mới là thứ <Thumb> dùng — hai giá trị này khác nhau ở đây.
    expect(resolved?.presetId).toBe("brownian-pollen");
  });

  it("trả null thay vì đoán bừa khi không có thí nghiệm phù hợp", () => {
    expect(resolvePhysicsPreset("phản ứng oxi hoá khử", CATALOGUE)).toBeNull();
    expect(resolvePhysicsPreset("mạch dao động LC", CATALOGUE)).toBeNull();
  });

  it("trả null với yêu cầu rỗng hoặc toàn từ đệm", () => {
    expect(resolvePhysicsPreset("", CATALOGUE)).toBeNull();
    expect(resolvePhysicsPreset("thí nghiệm mô phỏng", CATALOGUE)).toBeNull();
  });

  it("trả null khi danh mục rỗng", () => {
    expect(resolvePhysicsPreset("con lắc đơn", [])).toBeNull();
  });
});
