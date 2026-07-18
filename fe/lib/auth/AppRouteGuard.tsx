"use client";

import { usePathname } from "next/navigation";
import { RouteGuard } from "./RouteGuard";

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <RouteGuard pathname={pathname}>{children}</RouteGuard>;
}
