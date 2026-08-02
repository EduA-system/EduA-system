import { Suspense } from "react";
import { ClassResourcesPage } from "@/components/classroom/ClassResourcesPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassResourcesRoutePage() {
  return <RouteGuard pathname="/class-detail/resources"><Suspense fallback={<main>Đang tải...</main>}><ClassResourcesPage /></Suspense></RouteGuard>;
}
