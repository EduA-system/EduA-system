import { describe, expect, it } from "vitest";
import { canAccessRoute, getRoutePermission, hasAnyRole } from "./permissions";
import { canUseSubject, getSubjectRestriction, isSubjectUnassigned } from "./subject-access";

const teacher = (subject: string | null) => ({ role: "TEACHER", subject });
const moderator = (subject: string | null) => ({ role: "MODERATOR", subject });
const principal = { role: "PRINCIPAL", subject: null };
const itStaff = { role: "IT_STAFF", subject: null };
const student = { role: "STUDENT", subject: null };

describe("getRoutePermission", () => {
  it("khớp chính xác trước, rồi mới tới prefix dài nhất", () => {
    expect(getRoutePermission("/blog/create")?.allowedRoles).toEqual(["TEACHER", "MODERATOR"]);
    // /class-detail/resources/detail phải thắng /class-detail
    expect(getRoutePermission("/class-detail/resources/detail")).toBeDefined();
    expect(getRoutePermission("/slide-create/outline")?.allowedRoles).toEqual(["TEACHER", "MODERATOR"]);
  });

  it("không để '/' nuốt mọi đường dẫn", () => {
    expect(getRoutePermission("/duong-dan-khong-ton-tai")).toBeUndefined();
  });

  it("URL thật của trang kiểm duyệt blog không rơi vào luật rộng hơn của /blog", () => {
    expect(getRoutePermission("/blog/moderation")?.allowedRoles).toEqual(["MODERATOR"]);
    expect(getRoutePermission("/blog-moderator")?.allowedRoles).toEqual(["MODERATOR"]);
  });
});

describe("canAccessRoute — theo role", () => {
  it("chặn role ngoài danh sách cho phép", () => {
    expect(canAccessRoute("/lesson-create", student)).toBe(false);
    expect(canAccessRoute("/lesson-create", principal)).toBe(false);
    expect(canAccessRoute("/blog", student)).toBe(false);
    expect(canAccessRoute("/blog/create", itStaff)).toBe(false);
    expect(canAccessRoute("/it-staff", teacher("MATH"))).toBe(false);
    expect(canAccessRoute("/lesson-plan-approval", teacher("MATH"))).toBe(false);
  });

  it("cho qua đúng role", () => {
    expect(canAccessRoute("/lesson-create", teacher("MATH"))).toBe(true);
    expect(canAccessRoute("/blog", teacher("MATH"))).toBe(true);
    expect(canAccessRoute("/it-staff", itStaff)).toBe(true);
    expect(canAccessRoute("/lesson-plan-approval", moderator("MATH"))).toBe(true);
  });

  it("Community Hub yêu cầu đăng nhập và áp danh sách role", () => {
    expect(canAccessRoute("/community-hub", null)).toBe(false);
    expect(canAccessRoute("/community-hub", itStaff)).toBe(false);
    expect(canAccessRoute("/community-hub", teacher("PHYSICS"))).toBe(true);
  });
});

describe("canAccessRoute — theo môn", () => {
  it("giáo viên chỉ vào được màn học liệu đúng chuyên môn", () => {
    expect(canAccessRoute("/molecules", teacher("CHEMISTRY"))).toBe(true);
    expect(canAccessRoute("/molecules", teacher("PHYSICS"))).toBe(false);
    expect(canAccessRoute("/periodic-table", teacher("MATH"))).toBe(false);
    expect(canAccessRoute("/mo-phong-vat-ly", teacher("PHYSICS"))).toBe(true);
    expect(canAccessRoute("/mo-phong-vat-ly", teacher("CHEMISTRY"))).toBe(false);
  });

  it("moderator cũng bị ràng buộc môn như giáo viên", () => {
    expect(canAccessRoute("/molecules", moderator("CHEMISTRY"))).toBe(true);
    expect(canAccessRoute("/molecules", moderator("MATH"))).toBe(false);
  });

  it("chặn Hiệu trưởng và Học sinh khỏi mô phỏng theo môn", () => {
    expect(canAccessRoute("/mo-phong-vat-ly", principal)).toBe(false);
    expect(canAccessRoute("/periodic-table", student)).toBe(false);
  });
});

describe("educator chưa được gán môn", () => {
  it("isSubjectUnassigned chỉ đúng với educator, không đúng với vai trò vốn không có môn", () => {
    expect(isSubjectUnassigned(teacher(null))).toBe(true);
    expect(isSubjectUnassigned(moderator(null))).toBe(true);
    expect(isSubjectUnassigned(teacher("MATH"))).toBe(false);
    expect(isSubjectUnassigned(principal)).toBe(false);
    expect(isSubjectUnassigned(student)).toBe(false);
    expect(isSubjectUnassigned(null)).toBe(false);
  });

  it("bị chặn ở màn tạo nội dung thay vì vào được rồi disable nút", () => {
    expect(canAccessRoute("/lesson-create", teacher(null))).toBe(false);
    expect(canAccessRoute("/slide-create", teacher(null))).toBe(false);
    expect(canAccessRoute("/exam-create-new", teacher(null))).toBe(false);
    expect(canAccessRoute("/blog/create", teacher(null))).toBe(false);
    expect(canAccessRoute("/slide-maker", moderator(null))).toBe(false);
  });

  it("vẫn vào được màn chỉ đọc", () => {
    expect(canAccessRoute("/blog", teacher(null))).toBe(true);
    expect(canAccessRoute("/library", teacher(null))).toBe(true);
    expect(canAccessRoute("/user-profile", teacher(null))).toBe(true);
  });

  it("getSubjectRestriction và canUseSubject không còn mâu thuẫn nhau", () => {
    // Trước đây: getSubjectRestriction trả null (UI mở dropdown) trong khi canUseSubject
    // chặn mọi lựa chọn. Giờ isSubjectUnassigned tách bạch hai nghĩa của null đó.
    const unassigned = teacher(null);
    expect(getSubjectRestriction(unassigned)).toBeNull();
    expect(canUseSubject(unassigned, "MATH")).toBe(false);
    expect(isSubjectUnassigned(unassigned)).toBe(true);

    // Vai trò không ràng buộc môn: null nghĩa là tự do thật sự.
    expect(getSubjectRestriction(principal)).toBeNull();
    expect(canUseSubject(principal, "MATH")).toBe(true);
    expect(isSubjectUnassigned(principal)).toBe(false);
  });
});

describe("canUseSubject", () => {
  it("giáo viên chỉ dùng được đúng môn của mình", () => {
    expect(canUseSubject(teacher("PHYSICS"), "PHYSICS")).toBe(true);
    expect(canUseSubject(teacher("PHYSICS"), "CHEMISTRY")).toBe(false);
    expect(canUseSubject(teacher("PHYSICS"), null)).toBe(false);
  });
});

describe("hasAnyRole", () => {
  it("đọc được cả `role` đơn lẫn mảng `roles`", () => {
    expect(hasAnyRole({ roles: ["MODERATOR"] }, ["MODERATOR"])).toBe(true);
    expect(hasAnyRole({ role: "TEACHER" }, ["MODERATOR"])).toBe(false);
    expect(hasAnyRole(null, ["TEACHER"])).toBe(false);
  });
});
