import { Suspense } from "react";
import { PracticeExamEditDashboard } from "@/components/dashboard/PracticeExamEditDashboard";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassResourceExamPage() {
  return <RouteGuard pathname="/class-resource-exam"><Suspense fallback={<main>Đang mở bài kiểm tra...</main>}><PracticeExamEditDashboard /></Suspense></RouteGuard>;
}
