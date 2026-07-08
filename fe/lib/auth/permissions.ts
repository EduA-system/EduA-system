export type Role = "TEACHER" | "MODERATOR" | "ADMINISTRATOR";

export interface RoutePermission {
  requireAuth: boolean;
  allowedRoles?: Role[];
}

export const routePermissions: Record<string, RoutePermission> = {
  "/":                { requireAuth: false },
  "/home":            { requireAuth: false },
  "/homepage":        { requireAuth: false },
  "/login":           { requireAuth: false },
  "/help":            { requireAuth: false },
  "/lesson-create":   { requireAuth: false },
  "/lesson-edit":     { requireAuth: false },
  "/slide-create":    { requireAuth: false },
  "/slide-maker":     { requireAuth: false },
  "/blog":            { requireAuth: true },
  "/blog/moderation": { requireAuth: true, allowedRoles: ["MODERATOR", "ADMINISTRATOR"] },
  "/user-management": { requireAuth: true, allowedRoles: ["MODERATOR", "ADMINISTRATOR"] },
};

export function canAccessRoute(
  pathname: string,
  user?: { role: string } | null,
): boolean {
  const permission = routePermissions[pathname];
  if (!permission) return true;
  if (!permission.requireAuth) return true;
  if (!user) return false;
  if (!permission.allowedRoles) return true;
  return permission.allowedRoles.includes(user.role as Role);
}
