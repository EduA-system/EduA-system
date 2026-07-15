import { ExamMatrixDashboard } from "@/components/dashboard/ExamMatrixDashboard";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function ExamMatrixPage() {
  return (
    <RouteGuard pathname="/exam-matrix">
      <ExamMatrixDashboard />
    </RouteGuard>
  );
}
