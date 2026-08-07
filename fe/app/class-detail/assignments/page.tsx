import { Suspense } from "react";
import { ClassAssignmentsPage } from "@/components/classroom/ClassAssignmentsPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassAssignmentsRoutePage() {
  return <RouteGuard pathname="/class-detail/assignments"><Suspense fallback={<main>Đang tải...</main>}><ClassAssignmentsPage /></Suspense></RouteGuard>;
}
