import { LessonEditDashboard } from "@/components/dashboard/LessonEditDashboard";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function LessonEditPage() {
  return (
    <RouteGuard pathname="/lesson-edit">
      <LessonEditDashboard />
    </RouteGuard>
  );
}
