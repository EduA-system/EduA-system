import MoPhongHubPage from "@/app/mo-phong-vat-ly/page";
import { RouteGuard } from "@/lib/auth/RouteGuard";

/** Mở snapshot mô phỏng Vật lý trong phạm vi lớp, không dùng màn phân tử Hóa học. */
export default function ClassResourcePhysicsSimulationPage() {
  return (
    <RouteGuard pathname="/class-resource-physics-simulation">
      <MoPhongHubPage />
    </RouteGuard>
  );
}
