import { Suspense } from "react";
import { SlideMakerClient } from "@/components/slide-maker/SlideMakerClient";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function SlideMakerPage() {
  return (
    <RouteGuard pathname="/slide-maker"><Suspense
      fallback={
        <main className="flex h-screen items-center justify-center bg-white font-sans text-sm text-[#4f4943]">Dang tai trinh soan slide...</main>
      }
    >
      <SlideMakerClient />
    </Suspense></RouteGuard>
  );
}
