import { Suspense } from "react";
import { SlideMakerClient } from "@/components/slide-maker/SlideMakerClient";

export default function SlideMakerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex h-screen items-center justify-center bg-[#f5f1ec] text-sm text-[#5c5b6e]">
          Đang tải trình soạn slide…
        </main>
      }
    >
      <SlideMakerClient />
    </Suspense>
  );
}
