import { Suspense } from "react";
import { ResourceDetailPage } from "@/components/classroom/ResourceDetailPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function DetailResourceRoutePage() {
  return (
    <RouteGuard pathname="/detail-resource">
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#6b6b6b]">
            Đang tải...
          </main>
        }
      >
        <ResourceDetailPage />
      </Suspense>
    </RouteGuard>
  );
}
