"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LegacyAddStudentRedirect() {
  const router = useRouter();
  const classId = useSearchParams().get("classId") ?? "";
  useEffect(() => { router.replace(classId ? `/class-detail/members?classId=${encodeURIComponent(classId)}` : "/list-class"); }, [classId, router]);
  return <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#6b6b6b]">Đang chuyển đến trang Thành viên...</main>;
}
