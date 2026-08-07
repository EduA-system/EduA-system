import { Suspense } from "react";
import { WeeklyTaskDocumentViewer } from "@/components/weeklytask/WeeklyTaskDocumentViewer";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function WeeklyTaskDocumentPage() {
  return (
    <RouteGuard pathname="/weekly-task-document">
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#6b6b6b]">
            Đang mở giáo án...
          </main>
        }
      >
        <WeeklyTaskDocumentViewer />
      </Suspense>
    </RouteGuard>
  );
}
