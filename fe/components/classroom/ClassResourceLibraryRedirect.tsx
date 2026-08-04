"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getClassResourceLibraryContent } from "@/lib/classroom";

const paths = {
  LESSON_PLAN: "/class-resource-lesson",
  SLIDE_DECK: "/class-resource-slides",
  TEST: "/class-resource-exam",
  SIMULATION: "/class-resource-simulation",
} as const;

/** Chọn đúng màn hình thư viện nhưng giữ ngữ cảnh lớp để màn đó chỉ đọc dữ liệu. */
export function ClassResourceLibraryRedirect() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const classId = params.get("classId") ?? "";
  const resourceId = params.get("resourceId") ?? "";
  const [error, setError] = useState("");

  useEffect(() => {
    if (!classId || !resourceId) {
      setError("Thiếu thông tin lớp hoặc tài nguyên.");
      return;
    }
    void getClassResourceLibraryContent(authFetch, classId, resourceId)
      .then((content) => router.replace(`${paths[content.type]}?classId=${encodeURIComponent(classId)}&resourceId=${encodeURIComponent(resourceId)}`))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể mở tài nguyên từ thư viện."));
  }, [authFetch, classId, resourceId, router]);

  return <main className="grid min-h-screen place-items-center bg-white p-5 text-sm text-[#6b6b6b]">{error || "Đang mở tài nguyên..."}</main>;
}
