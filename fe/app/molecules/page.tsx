"use client";

import { Suspense } from "react";
import { MoleculeExplorer } from "@/components/molecules/MoleculeExplorer";

export default function MoleculesPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-5 text-slate-600">Đang tải mô phỏng...</main>}><MoleculeExplorer /></Suspense>;
}
