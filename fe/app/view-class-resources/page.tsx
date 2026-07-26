import { Suspense } from "react";
import { ViewClassResourcesPage } from "@/components/classroom/ViewClassResourcesPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ViewClassResourcesRoutePage() {
  return (
    <RouteGuard pathname="/view-class-resources">
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-[#f5f1ec] text-sm text-[#6b6b6b]">
            Đang tải...
          </main>
        }
      >
        <ViewClassResourcesPage />
      </Suspense>
    </RouteGuard>
  );
}
