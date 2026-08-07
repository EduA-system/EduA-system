import { Suspense } from "react";
import { ClassSettingsPage } from "@/components/classroom/ClassSettingsPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassSettingsRoutePage() {
  return <RouteGuard pathname="/class-detail/settings"><Suspense fallback={<main>Đang tải...</main>}><ClassSettingsPage /></Suspense></RouteGuard>;
}
