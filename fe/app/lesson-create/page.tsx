import { UserDashboard } from "@/components/dashboard/UserDashboard";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function LessonCreatePage() {
  return (
    <RouteGuard pathname="/lesson-create">
      <UserDashboard />
    </RouteGuard>
  );
}
