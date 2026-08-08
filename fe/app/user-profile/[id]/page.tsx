import { UserProfileViewPage } from "@/components/user-profile/UserProfileViewPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserProfileViewPage userId={id} />;
}
