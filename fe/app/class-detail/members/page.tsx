import { Suspense } from "react";
import { AddStudentPage } from "@/components/classroom/AddStudentPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassMembersRoutePage() {
  return <RouteGuard pathname="/class-detail/members"><Suspense fallback={<main>Đang tải...</main>}><AddStudentPage /></Suspense></RouteGuard>;
}
