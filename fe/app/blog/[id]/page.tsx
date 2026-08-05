import { BlogCommunityPage } from "@/components/blog/BlogCommunityPage";

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BlogCommunityPage postId={id} />;
}
