import { Suspense } from "react";
import { AddStudentPage } from "@/components/classroom/AddStudentPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function AddStudentRoutePage() {
  return (
    <RouteGuard pathname="/add-student">
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-[#f5f1ec] text-sm text-[#6b6b6b]">
            Đang tải...
          </main>
        }
      >
        <AddStudentPage />
      </Suspense>
    </RouteGuard>
  );
}
