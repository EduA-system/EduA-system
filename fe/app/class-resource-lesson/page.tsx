import { Suspense } from "react";
import { LessonEditDashboard } from "@/components/dashboard/LessonEditDashboard";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassResourceLessonPage() {
  return <RouteGuard pathname="/class-resource-lesson"><Suspense fallback={<main>Đang mở giáo án...</main>}><LessonEditDashboard /></Suspense></RouteGuard>;
}
