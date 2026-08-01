import { Suspense } from "react";
import { TeacherResourceDetailPage } from "@/components/classroom/TeacherResourceDetailPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function TeacherResourceDetailRoutePage() {
  return <RouteGuard pathname="/class-detail/resources/detail"><Suspense fallback={<main>Đang tải...</main>}><TeacherResourceDetailPage /></Suspense></RouteGuard>;
}
