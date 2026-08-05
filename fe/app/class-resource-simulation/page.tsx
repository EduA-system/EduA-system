import { Suspense } from "react";
import { MoleculeExplorer } from "@/components/molecules/MoleculeExplorer";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassResourceSimulationPage() {
  return <RouteGuard pathname="/class-resource-simulation"><Suspense fallback={<main>Đang mở mô phỏng...</main>}><MoleculeExplorer /></Suspense></RouteGuard>;
}
