import { Suspense } from "react";
import { ClassSubmissionDetailPage } from "@/components/classroom/ClassSubmissionPages";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassSubmissionDetailRoutePage() {
  return <RouteGuard pathname="/class-detail/assignments/submission"><Suspense fallback={<main>Đang tải...</main>}><ClassSubmissionDetailPage /></Suspense></RouteGuard>;
}
