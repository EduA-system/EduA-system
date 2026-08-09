import { CommunityHubDetailPage } from "@/components/hub/CommunityHubDetailPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RouteGuard pathname="/community-hub">
      <CommunityHubDetailPage contentId={id} />
    </RouteGuard>
  );
}
