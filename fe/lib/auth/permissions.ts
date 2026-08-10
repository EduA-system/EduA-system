export type Role = "TEACHER" | "MODERATOR" | "PRINCIPAL" | "IT_STAFF" | "STUDENT";

export interface RoutePermission {
  requireAuth: boolean;
  allowedRoles?: Role[];
}

export const routePermissions: Record<string, RoutePermission> = {
  "/":                { requireAuth: false },
  "/home":            { requireAuth: false },
  "/homepage":        { requireAuth: false },
  "/login":           { requireAuth: false },
  "/dashboard":       { requireAuth: true },
  "/help":            { requireAuth: false },
  "/lesson-create":   { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"] },
  "/lesson-edit":     { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"] },
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
  "/slide-create":    { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"] },
  "/slide-maker":     { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"] },
  "/exam-create-new": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/exam-edit-new":   { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/molecules":       { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/mo-phong-vat-ly": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"] },
  "/periodic-table":  { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"] },
  "/library":         { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/user-profile":    { requireAuth: true },
  "/blog":            { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/blog/create":     { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/notifications":   { requireAuth: true },
  "/blog-moderator":  { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/community-hub":   { requireAuth: false, allowedRoles: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"] },
  "/hub-moderation":  { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/weekly-schedule": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/weekly-task-document": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/lesson-plan-approval": { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/statistics": { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/user-management": { requireAuth: true, allowedRoles: ["MODERATOR", "PRINCIPAL"] },
  "/it-staff": { requireAuth: true, allowedRoles: ["IT_STAFF"] },
  "/it-staff/activity-log": { requireAuth: true, allowedRoles: ["IT_STAFF"] },
};

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
  user?: { role?: string | null; roles?: string[] | null } | null,
): boolean {
  const permission = routePermissions[pathname];
  if (!permission) return Boolean(user);
  // A role allowlist still applies to signed-in users even on a route that
  // doesn't require auth (e.g. Community Hub is public, but IT_STAFF is
  // excluded once logged in). Anonymous visitors fall back to requireAuth.
  if (permission.allowedRoles) {
    if (!user) return !permission.requireAuth;
    return hasAnyRole(user, permission.allowedRoles);
  }
  if (!permission.requireAuth) return true;
  return Boolean(user);
}
