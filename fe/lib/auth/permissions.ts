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
  "/lesson-create":   { requireAuth: true },
  "/lesson-edit":     { requireAuth: true },
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
  "/slide-create":    { requireAuth: true },
  "/slide-maker":     { requireAuth: true },
  "/exam-create-new": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/exam-edit-new":   { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/molecules":       { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/library":         { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/user-profile":    { requireAuth: true },
  "/blog":            { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/blog/create":     { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/notifications":   { requireAuth: true },
  "/blog-moderator":  { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/community-hub":   { requireAuth: false },
  "/hub-moderation":  { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/weekly-schedule": { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/lesson-plan-approval": { requireAuth: true, allowedRoles: ["MODERATOR"] },
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
  if (!permission.requireAuth) return true;
  if (!user) return false;
  if (!permission.allowedRoles) return true;
  return hasAnyRole(user, permission.allowedRoles);
}
