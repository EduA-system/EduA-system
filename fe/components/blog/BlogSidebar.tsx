import { SUBJECTS, subjectLabel, type Summary } from "@/lib/blog";
import { Avatar } from "./Avatar";
import { SubjectBadge } from "./SubjectBadge";
import { formatRelativeTime } from "@/lib/blog";

function SCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-[0.8px] border-[#eaeae7] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-[#b0b1c2]">{title}</p>
      <div className="pt-3.5">{children}</div>
    </div>
  );
}

export function BlogSidebar({
  posts,
  activeSubjectFilter,
  onFilterChange,
  onSelectPost,
}: {
  posts: Summary[];
  activeSubjectFilter: string | null;
  onFilterChange: (subject: string | null) => void;
  onSelectPost: (id: string) => void;
}) {
  const latest = [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const topDiscussions = [...posts].sort((a, b) => b.commentCount - a.commentCount).slice(0, 3);

  const postCountByAuthor = new Map<string, { name: string; count: number }>();
  for (const p of posts) {
    const entry = postCountByAuthor.get(p.authorId);
    if (entry) entry.count += 1;
    else postCountByAuthor.set(p.authorId, { name: p.authorName, count: 1 });
  }
  const activeTeachers = [...postCountByAuthor.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4);

  return (
    <div className="flex w-full flex-col gap-3">
      {latest.length > 0 && (
        <SCard title="Bài viết mới nhất">
          <div className="flex flex-col gap-3.5">
            {latest.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPost(p.id)}
                className="text-left"
              >
                <p className="line-clamp-2 text-[13px] font-semibold text-[#1c1e2e]">{p.title}</p>
                <div className="flex items-center gap-2 pt-2">
                  <Avatar name={p.authorName} seed={p.authorId} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[#1c1e2e]">{p.authorName}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <SubjectBadge subject={p.subject} />
                      <span className="text-[11px] text-[#c0c1d0]">{formatRelativeTime(p.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SCard>
      )}

      <SCard title="Chủ đề phổ biến">
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onFilterChange(activeSubjectFilter === s ? null : s)}
              className={`rounded-full border-[0.8px] px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                activeSubjectFilter === s
                  ? "border-[#1c1e2e] bg-[#1c1e2e] text-white"
                  : "border-[#eaeae7] bg-[#f7f7f5] text-[#4a4b5e] hover:border-[#d8d8d5]"
              }`}
            >
              {subjectLabel(s)}
            </button>
          ))}
        </div>
      </SCard>

      {topDiscussions.length > 0 && (
        <SCard title="Thảo luận nổi bật">
          <div className="flex flex-col gap-3">
            {topDiscussions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPost(p.id)}
                className="flex items-start gap-2.5 text-left"
              >
                <Avatar name={p.authorName} seed={p.authorId} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[12px] font-semibold text-[#1c1e2e]">{p.title}</p>
                  <p className="pt-0.5 text-[11px] text-[#c0c1d0]">{p.commentCount} bình luận</p>
                </div>
              </button>
            ))}
          </div>
        </SCard>
      )}

      {activeTeachers.length > 0 && (
        <SCard title="Giáo viên tích cực">
          <div className="flex flex-col gap-3">
            {activeTeachers.map(([authorId, { name, count }]) => (
              <div key={authorId} className="flex items-center gap-2.5">
                <Avatar name={name} seed={authorId} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#1c1e2e]">{name}</p>
                </div>
                <span className="shrink-0 text-[11px] text-[#c0c1d0]">{count} bài</span>
              </div>
            ))}
          </div>
        </SCard>
      )}
    </div>
  );
}
