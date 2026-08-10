import { BlogCommunityPage } from "@/components/blog/BlogCommunityPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RouteGuard pathname="/blog">
      <BlogCommunityPage postId={id} />
    </RouteGuard>
  );
}
