import { Suspense } from "react";
import { StudentClassMembersPage } from "@/components/classroom/StudentClassMembersPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassMembersPage() {
  return <RouteGuard pathname="/class-members"><Suspense fallback={<main>Đang tải...</main>}><StudentClassMembersPage /></Suspense></RouteGuard>;
}
