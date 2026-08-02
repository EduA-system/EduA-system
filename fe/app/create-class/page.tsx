"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RouteGuard } from "@/lib/auth/RouteGuard";

function CreateClassRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/list-class?create=1");
  }, [router]);

  return <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#6b6b6b]">Đang mở form tạo lớp...</main>;
}

export default function CreateClassPage() {
  return (
    <RouteGuard pathname="/create-class">
      <CreateClassRedirect />
    </RouteGuard>
  );
}
