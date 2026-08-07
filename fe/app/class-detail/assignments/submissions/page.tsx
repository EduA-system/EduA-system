import { Suspense } from "react";
import { ClassSubmissionsPage } from "@/components/classroom/ClassSubmissionPages";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassSubmissionsRoutePage() {
  return <RouteGuard pathname="/class-detail/assignments/submissions"><Suspense fallback={<main>Đang tải...</main>}><ClassSubmissionsPage /></Suspense></RouteGuard>;
}
