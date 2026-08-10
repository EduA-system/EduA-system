import { BlogCommunityPage } from "@/components/blog/BlogCommunityPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function BlogPage() {
  return (
    <RouteGuard pathname="/blog">
      <BlogCommunityPage />
    </RouteGuard>
  );
}
