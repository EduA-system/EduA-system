import { PracticeExamEditDashboard } from "@/components/dashboard/PracticeExamEditDashboard";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function PracticeExamEditPage() {
  return (
    <RouteGuard pathname="/exam-edit-new">
      <PracticeExamEditDashboard />
    </RouteGuard>
  );
}
