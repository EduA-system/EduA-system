import { PracticeExamCreateDashboard } from "@/components/dashboard/PracticeExamCreateDashboard";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function PracticeExamCreatePage() {
  return (
    <RouteGuard pathname="/exam-create-new">
      <PracticeExamCreateDashboard />
    </RouteGuard>
  );
}
