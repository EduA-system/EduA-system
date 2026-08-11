import { canAccessSubjectScope, isSubjectUnassigned, type SubjectCode } from "./subject-access";

export type Role = "TEACHER" | "MODERATOR" | "PRINCIPAL" | "IT_STAFF" | "STUDENT";

export interface RoutePermission {
  requireAuth: boolean;
  allowedRoles?: Role[];
  allowedSubjects?: SubjectCode[];
  /**
   * Màn tạo/sửa nội dung gắn môn. Educator chưa được gán môn bị chặn ngay tại route kèm lý do,
   * thay vì vào được rồi mọi nút submit tự disable mà không giải thích.
   */
  requiresAssignedSubject?: boolean;
}

export const routePermissions: Record<string, RoutePermission> = {
  "/":                { requireAuth: false },
  "/home":            { requireAuth: false },
  "/homepage":        { requireAuth: false },
  "/login":           { requireAuth: false },
  "/dashboard":       { requireAuth: true },
  "/help":            { requireAuth: false },
  "/lesson-create":   { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], requiresAssignedSubject: true },
  "/lesson-edit":     { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], requiresAssignedSubject: true },
  "/create-class":    { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/add-student":     { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/class-detail":    { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/class-detail/members": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/class-detail/resources": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/class-detail/resources/detail": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/class-detail/assignments": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/class-detail/assignments/submissions": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/class-detail/assignments/submission": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/class-detail/settings": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/list-class":      { requireAuth: true },
  "/detail-resource": { requireAuth: true },
  "/slide-create":    { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], requiresAssignedSubject: true },
  "/slide-maker":     { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], requiresAssignedSubject: true },
  // Trình chiếu deck đã lưu: Student mở qua resource của lớp nên không giới hạn role;
  // phạm vi thực tế do backend chặn theo membership của lớp.
  "/slide-present":   { requireAuth: true },
  // Trang fixture QA layout, render thuần từ dữ liệu mẫu trong repo, không gọi API nào.
  "/slide-layout-gallery": { requireAuth: false },
  "/exam-create-new": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], requiresAssignedSubject: true },
  "/exam-edit-new":   { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], requiresAssignedSubject: true },
  "/molecules":       { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], allowedSubjects: ["CHEMISTRY"] },
  "/mo-phong-vat-ly": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], allowedSubjects: ["PHYSICS"] },
  "/periodic-table":  { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], allowedSubjects: ["CHEMISTRY"] },
  "/library":         { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/user-profile":    { requireAuth: true },
  "/blog":            { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/blog/create":     { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"], requiresAssignedSubject: true },
  "/notifications":   { requireAuth: true },
  "/blog-moderator":  { requireAuth: true, allowedRoles: ["MODERATOR"] },
  // Cùng một page component phục vụ hai URL (`app/blog/moderation/`, re-export ở `app/blog-moderator/`).
  // Khai báo cả hai để URL thật không rơi vào prefix `/blog` vốn rộng hơn (Teacher cũng vào được).
  "/blog/moderation": { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/community-hub":   { requireAuth: false, allowedRoles: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"] },
  "/hub-moderation":  { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/weekly-schedule": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/weekly-task-document": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/lesson-plan-approval": { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/statistics": { requireAuth: true, allowedRoles: ["MODERATOR", "PRINCIPAL"] },
  "/user-management": { requireAuth: true, allowedRoles: ["MODERATOR", "PRINCIPAL"] },
  "/it-staff": { requireAuth: true, allowedRoles: ["IT_STAFF"] },
  "/it-staff/activity-log": { requireAuth: true, allowedRoles: ["IT_STAFF"] },
  // Bàn chạy thử mô phỏng: bundle và chạy hoàn toàn phía client, không gọi
  // API nào của EDUA nên không cần phiên đăng nhập.
  "/sandbox":         { requireAuth: false },
};

export function getRoutePermission(pathname: string): RoutePermission | undefined {
  const exact = routePermissions[pathname];
  if (exact) return exact;
  const prefix = Object.keys(routePermissions)
    .filter((route) => route !== "/" && pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? routePermissions[prefix] : undefined;
}

export function hasAnyRole(
  user: { role?: string | null; roles?: string[] | null } | null | undefined,
  allowedRoles: Role[],
): boolean {
  if (!user) return false;
  const roles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
  return allowedRoles.some((role) => roles.includes(role));
}

export function canAccessRoute(
  pathname: string,
  user?: { role?: string | null; roles?: string[] | null; subject?: string | null } | null,
): boolean {
  const permission = getRoutePermission(pathname);
  if (!permission) return Boolean(user);
  // Educator thiếu môn: chặn trước mọi kiểm tra khác. Khách vãng lai không dính vì
  // isSubjectUnassigned chỉ đúng với TEACHER/MODERATOR đã đăng nhập.
  if (permission.requiresAssignedSubject && isSubjectUnassigned(user)) return false;
  // A role allowlist still applies to signed-in users even on a route that
  // doesn't require auth (e.g. Community Hub is public, but IT_STAFF is
  // excluded once logged in). Anonymous visitors fall back to requireAuth.
  if (permission.allowedRoles) {
    if (!user) return !permission.requireAuth;
    return hasAnyRole(user, permission.allowedRoles) && canAccessSubjectScope(user, permission.allowedSubjects);
  }
  if (!canAccessSubjectScope(user, permission.allowedSubjects)) return false;
  if (!permission.requireAuth) return true;
  return Boolean(user);
}
