import { Suspense } from "react";
import { ClassResourceDocumentViewer } from "@/components/classroom/ClassResourceDocumentViewer";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassResourceLessonPage() {
  return <RouteGuard pathname="/class-resource-lesson"><Suspense fallback={<main>Đang mở giáo án...</main>}><ClassResourceDocumentViewer kind="lesson" /></Suspense></RouteGuard>;
}
