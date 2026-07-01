import { Suspense } from "react";
import { SlideMakerClient } from "@/components/slide-maker/SlideMakerClient";

export default function SlideMakerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex h-screen items-center justify-center bg-[#f5f1ec] font-sans text-sm text-[#4f4943]">Dang tai trinh soan slide...</main>
      }
    >
      <SlideMakerClient />
    </Suspense>
  );
}
