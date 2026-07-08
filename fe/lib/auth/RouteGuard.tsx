"use client";

import Link from "next/link";
import { useAuth } from "./AuthContext";
import { canAccessRoute } from "./permissions";

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
  denyLabel = "V\u1ec1 trang ch\u1ee7",
  children,
}: RouteGuardProps) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md p-8 text-sm text-gray-600">
        \u0110ang ki\u1ec3m tra phi\u00ean \u0111\u0103ng nh\u1eadp...
      </div>
    );
  }

  if (!canAccessRoute(pathname, user)) {
    if (!user) {
      return (
        <div className="mx-auto max-w-md p-8">
          <h1 className="mb-4 text-xl font-semibold">Y\u00eau c\u1ea7u \u0111\u0103ng nh\u1eadp</h1>
          <p className="mb-4 text-sm text-gray-600">
            Vui l\u00f2ng \u0111\u0103ng nh\u1eadp b\u1eb1ng Google \u0111\u1ec3 ti\u1ebfp t\u1ee5c.
          </p>
          <Link
            className="rounded bg-black px-4 py-2 text-sm text-white"
            href="/login"
          >
            \u0110\u0103ng nh\u1eadp
          </Link>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="mb-2 text-xl font-semibold">T\u1eeb ch\u1ed1i truy c\u1eadp</h1>
        <p className="text-sm text-gray-600">
          T\u00e0i kho\u1ea3n {user.email} ({user.role}) kh\u00f4ng c\u00f3 quy\u1ec1n truy c\u1eadp trang n\u00e0y.
        </p>
        <Link className="mt-4 inline-block rounded bg-black px-4 py-2 text-sm text-white" href={denyHref}>
          {denyLabel}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
