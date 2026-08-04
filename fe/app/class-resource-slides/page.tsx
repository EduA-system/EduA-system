import { Suspense } from "react";
import { SlidePresentationClient } from "@/components/slide-presentation/SlidePresentationClient";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ClassResourceSlidesPage() {
  return <RouteGuard pathname="/class-resource-slides"><Suspense fallback={<main>Đang mở slide...</main>}><SlidePresentationClient /></Suspense></RouteGuard>;
}
