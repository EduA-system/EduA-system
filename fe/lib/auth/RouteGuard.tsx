"use client";

import Link from "next/link";
import { useAuth } from "./AuthContext";
import { canAccessRoute, routePermissions } from "./permissions";

interface RouteGuardProps {
  pathname: string;
  /** Optional fallback for role-based denial (e.g. a redirect link) */
  denyHref?: string;
  denyLabel?: string;
  children: React.ReactNode;
}

export function RouteGuard({
  pathname,
  denyHref = "/",
  denyLabel = "Về trang chủ",
  children,
}: RouteGuardProps) {
  const { user, status } = useAuth();

  const requiresAuth = routePermissions[pathname]?.requireAuth ?? true;

  if (requiresAuth && status === "loading") {
    return (
      <div className="mx-auto max-w-md p-8 text-sm text-gray-600">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (!canAccessRoute(pathname, user)) {
    if (!user) {
      return (
        <div className="mx-auto max-w-md p-8">
          <h1 className="mb-4 text-xl font-semibold">Yêu cầu đăng nhập</h1>
          <p className="mb-4 text-sm text-gray-600">
            Vui lòng đăng nhập bằng Google để tiếp tục.
          </p>
          <Link
            className="rounded bg-black px-4 py-2 text-sm text-white"
            href="/login"
          >
            Đăng nhập
          </Link>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="mb-2 text-xl font-semibold">Từ chối truy cập</h1>
        <p className="text-sm text-gray-600">
          Tài khoản {user.email} ({user.role}) không có quyền truy cập trang này.
        </p>
        <Link className="mt-4 inline-block rounded bg-black px-4 py-2 text-sm text-white" href={denyHref}>
          {denyLabel}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
