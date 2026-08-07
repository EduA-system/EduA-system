import { describe, expect, it } from "vitest";
import { isTopLevelActivityHeading } from "./lessonSections";

describe("isTopLevelActivityHeading", () => {
  it("khớp heading Hoạt động cấp 1 do luồng sinh gốc đặt tên", () => {
    expect(isTopLevelActivityHeading("Hoạt động 3: Luyện tập (15 phút)")).toBe(true);
    expect(isTopLevelActivityHeading("Hoạt động 1: Khởi động/Xác định vấn đề (5 phút)")).toBe(true);
    expect(isTopLevelActivityHeading("Hoạt động 4: Vận dụng (10 phút)")).toBe(true);
    // Chỉ khớp theo mẫu "Hoạt động <số>" — kể cả HĐ2 (trong thực tế section này luôn bị
    // extractEditableSections loại vì có tiểu hoạt động con, xem ghi chú ở lessonSections.ts).
    expect(isTopLevelActivityHeading("Hoạt động 2: Hình thành kiến thức mới (25 phút)")).toBe(true);
  });

  it("bỏ khoảng trắng đầu/cuối trước khi so khớp", () => {
    expect(isTopLevelActivityHeading("  Hoạt động 3: Luyện tập  ")).toBe(true);
  });

  it("không khớp các heading khác trong tài liệu", () => {
    expect(isTopLevelActivityHeading("I. MỤC TIÊU")).toBe(false);
    expect(isTopLevelActivityHeading("II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU")).toBe(false);
    expect(isTopLevelActivityHeading("III. TIẾN TRÌNH DẠY HỌC")).toBe(false);
    expect(isTopLevelActivityHeading("")).toBe(false);
    expect(isTopLevelActivityHeading("Hoạt động mở đầu tuỳ chỉnh")).toBe(false);
  });
});
