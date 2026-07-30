"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MoleculeExplorer } from "@/components/molecules/MoleculeExplorer";

export default function MoleculesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white p-5 text-slate-600">Đang tải mô phỏng...</main>}>
      <div className="flex min-h-screen">
        <Sidebar activeHref="/molecules" />
        <div className="min-w-0 flex-1"><MoleculeExplorer /></div>
      </div>
    </Suspense>
  );
}
