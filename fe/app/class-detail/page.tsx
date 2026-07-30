import { Suspense } from "react";
import { ClassDetailPage } from "@/components/classroom/ClassDetailPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassDetailRoutePage() {
  return (
    <RouteGuard pathname="/class-detail">
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#6b6b6b]">
            Đang tải...
          </main>
        }
      >
        <ClassDetailPage />
      </Suspense>
    </RouteGuard>
  );
}
