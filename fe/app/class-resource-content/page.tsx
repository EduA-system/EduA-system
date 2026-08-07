import { Suspense } from "react";
import { ClassResourceLibraryRedirect } from "@/components/classroom/ClassResourceLibraryRedirect";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassResourceContentPage() {
  return <RouteGuard pathname="/class-resource-content"><Suspense fallback={<main>Đang mở tài nguyên...</main>}><ClassResourceLibraryRedirect /></Suspense></RouteGuard>;
}
