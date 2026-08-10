"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { canAccessRoute, getRoutePermission } from "./permissions";
import { isSubjectUnassigned } from "./subject-access";

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
  const router = useRouter();

  const requiresAuth = getRoutePermission(pathname)?.requireAuth ?? true;
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    if (requiresAuth && status === "anonymous") {
      const next = `${pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [pathname, requiresAuth, router, status]);

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
            href={loginHref}
          >
            Đăng nhập
          </Link>
        </div>
      );
    }

    const blockedForMissingSubject =
      getRoutePermission(pathname)?.requiresAssignedSubject && isSubjectUnassigned(user);

    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="mb-2 text-xl font-semibold">
          {blockedForMissingSubject ? "Tài khoản chưa được gán môn" : "Từ chối truy cập"}
        </h1>
        <p className="text-sm text-gray-600">
          {blockedForMissingSubject
            ? `Tài khoản ${user.email} chưa được gán môn học nên chưa thể tạo hoặc chỉnh sửa nội dung. Liên hệ Moderator hoặc Ban giám hiệu để được phân môn.`
            : `Tài khoản ${user.email} (${user.role}) không có quyền truy cập trang này.`}
        </p>
        <Link className="mt-4 inline-block rounded bg-black px-4 py-2 text-sm text-white" href={denyHref}>
          {denyLabel}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
