import CommunityHubPage from "@/components/hub/CommunityHubPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function Page() {
  return (
    <RouteGuard pathname="/community-hub">
      <CommunityHubPage />
    </RouteGuard>
  );
}
