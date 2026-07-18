"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MoleculeExplorer } from "@/components/molecules/MoleculeExplorer";

export default function MoleculesPage() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/molecules" />
      <section className="min-w-0 flex-1">
        <Suspense fallback={<div className="grid h-full place-items-center text-[#6b6b6b]">Đang tải mô phỏng...</div>}>
          <MoleculeExplorer />
        </Suspense>
      </section>
    </main>
  );
}
