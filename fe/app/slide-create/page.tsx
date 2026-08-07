import { SlideCreateDashboard } from "@/components/dashboard/SlideCreateDashboard";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function SlideCreatePage() {
  return <RouteGuard pathname="/slide-create"><SlideCreateDashboard /></RouteGuard>;
}
