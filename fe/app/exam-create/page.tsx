import { ExamCreateDashboard } from "@/components/dashboard/ExamCreateDashboard";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ExamCreatePage() {
  return (
    <RouteGuard pathname="/exam-create">
      <ExamCreateDashboard />
    </RouteGuard>
  );
}
