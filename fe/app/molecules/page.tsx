"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MoleculeExplorer } from "@/components/molecules/MoleculeExplorer";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function MoleculesPage() {
  return (
    <RouteGuard pathname="/molecules">
      <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f5f1ec] text-sm text-[#6b6b6b]">Đang tải mô phỏng...</main>}>
        <div className="flex min-h-screen bg-[#f5f1ec]">
          <Sidebar activeHref="/molecules" />
          <div className="min-w-0 flex-1">
            <MoleculeExplorer />
          </div>
        </div>
      </Suspense>
    </RouteGuard>
  );
}
