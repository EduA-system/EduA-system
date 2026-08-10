import { CreateBlogPostPage } from "@/components/blog/CreateBlogPostPage";
import { RouteGuard } from "@/lib/auth/RouteGuard";

export default function CreateBlogPostRoute() {
  return (
    <RouteGuard pathname="/blog/create" denyHref="/blog" denyLabel="Về trang Blog">
      <CreateBlogPostPage />
    </RouteGuard>
  );
}
