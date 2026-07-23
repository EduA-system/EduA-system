export type Role = "TEACHER" | "MODERATOR" | "PRINCIPAL" | "IT_STAFF";

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
  "/slide-create":    { requireAuth: true },
  "/slide-maker":     { requireAuth: true },
  "/molecules":       { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/library":         { requireAuth: true, allowedRoles: ["TEACHER", "MODERATOR"] },
  "/user-profile":    { requireAuth: true },
  "/blog":            { requireAuth: true },
  "/blog/moderation": { requireAuth: true, allowedRoles: ["MODERATOR"] },
  "/user-management": { requireAuth: true, allowedRoles: ["MODERATOR", "PRINCIPAL"] },
  "/it-staff": { requireAuth: true, allowedRoles: ["IT_STAFF"] },
  "/it-staff-users": { requireAuth: true, allowedRoles: ["PRINCIPAL"] },
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
