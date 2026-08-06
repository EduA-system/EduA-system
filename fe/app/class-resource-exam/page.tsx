import { Suspense } from "react";
import { ClassResourceDocumentViewer } from "@/components/classroom/ClassResourceDocumentViewer";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassResourceExamPage() {
  return <RouteGuard pathname="/class-resource-exam"><Suspense fallback={<main>Đang mở bài kiểm tra...</main>}><ClassResourceDocumentViewer kind="exam" /></Suspense></RouteGuard>;
}
