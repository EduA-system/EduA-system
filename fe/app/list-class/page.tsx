"use client";

import { Suspense } from "react";
import { ClassManagementPage } from "@/components/classroom/ClassManagementPage";
import { StudentClassResourcesPage } from "@/components/classroom/StudentClassResourcesPage";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasAnyRole } from "@/lib/auth/permissions";
import { RouteGuard } from "@/lib/auth/RouteGuard";

function ClassListContent() {
  const { user, status } = useAuth();

  if (status !== "authenticated" || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#6b6b6b]">
        Đang tải...
      </main>
    );
  }

  if (hasAnyRole(user, ["TEACHER", "MODERATOR"])) {
    return <ClassManagementPage view="list" />;
  }

  return <StudentClassResourcesPage />;
}

export default function ListClassRoutePage() {
  return (
    <RouteGuard pathname="/list-class">
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#6b6b6b]">
            Đang tải...
          </main>
        }
      >
        <ClassListContent />
      </Suspense>
    </RouteGuard>
  );
}
