import { Suspense } from "react";
import { SlidePresentationClient } from "@/components/slide-presentation/SlidePresentationClient";

export default function SlidePresentationPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#171513] text-sm text-white/70">Đang mở trình chiếu...</main>}>
      <SlidePresentationClient />
    </Suspense>
  );
}
