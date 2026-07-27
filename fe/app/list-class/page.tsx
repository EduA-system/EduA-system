import { Suspense } from "react";
import { StudentClassResourcesPage } from "@/components/classroom/StudentClassResourcesPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ListClassRoutePage() {
  return (
    <RouteGuard pathname="/list-class">
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-[#f5f1ec] text-sm text-[#6b6b6b]">
            Đang tải...
          </main>
        }
      >
        <StudentClassResourcesPage />
      </Suspense>
    </RouteGuard>
  );
}
