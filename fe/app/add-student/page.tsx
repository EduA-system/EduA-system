import { Suspense } from "react";
import { LegacyAddStudentRedirect } from "@/components/classroom/LegacyAddStudentRedirect";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function AddStudentRoutePage() {
  return (
    <RouteGuard pathname="/add-student">
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#6b6b6b]">
            Đang tải...
          </main>
        }
      >
        <LegacyAddStudentRedirect />
      </Suspense>
    </RouteGuard>
  );
}
