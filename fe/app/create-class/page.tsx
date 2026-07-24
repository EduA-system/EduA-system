import { ClassManagementPage } from "@/components/classroom/ClassManagementPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function CreateClassPage() {
  return (
    <RouteGuard pathname="/create-class">
      <ClassManagementPage />
    </RouteGuard>
  );
}
