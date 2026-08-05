"use client";
import { useState } from "react";
import type { Summary } from "@/lib/blog";
import { formatRelativeTime } from "@/lib/blog";
import { Avatar } from "./Avatar";
import { SubjectBadge } from "./SubjectBadge";

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <circle cx="12" cy="5" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PostCard({ post, onClick, onEdit, onDelete }: { post: Summary; onClick: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col rounded-2xl border border-[#dededb] bg-white p-5 shadow-[0_3px_10px_rgba(28,30,46,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#cbc9d4] hover:shadow-[0_10px_22px_rgba(28,30,46,0.14)]"
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={post.authorName} seed={post.authorId} imageUrl={post.authorAvatarUrl} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-[#1c1e2e]">{post.authorName}</p>
            <SubjectBadge subject={post.subject} />
          </div>
          <p className="text-[12px] text-[#b0b1c2]">{formatRelativeTime(post.createdAt)}</p>
        </div>
      </div>

      <div className="flex items-start gap-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold text-[#1c1e2e]">{post.title}</h2>
          {post.excerpt && (
            <p className="line-clamp-2 pt-2 text-[14px] leading-[1.6] text-[#9b9caf]">{post.excerpt}</p>
          )}
        </div>
        <div className="h-[72px] w-[100px] shrink-0 overflow-hidden rounded-[14px] bg-[#f0f0ee]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.thumbnailUrl ?? "/blog-detail-cover.png"} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-[#ecece9] pt-3.5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#70758f]">
          <span className="size-4"><CommentIcon /></span>
          {post.commentCount}
        </div>
        <div className="flex-1" />
        {onEdit && onDelete && <div className="relative" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Tùy chọn bài viết" aria-expanded={menuOpen} className={`flex size-8 items-center justify-center rounded-full border transition ${menuOpen ? "border-[#bdb7d3] bg-[#eeebf7] text-[#302c4a]" : "border-[#e5e4e8] bg-white text-[#74748a] hover:border-[#c9c5d7] hover:bg-[#f5f3fa] hover:text-[#302c4a]"}`}><span className="size-[16px]"><MoreIcon /></span></button>
          {menuOpen && <div className="absolute bottom-10 right-0 z-20 w-36 overflow-hidden rounded-xl border border-[#e4e2e7] bg-white py-1 shadow-[0_10px_24px_rgba(28,30,46,0.16)]">
            <button type="button" onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full px-3 py-2 text-left text-sm font-medium text-[#35384d] hover:bg-[#f6f5f8]">Sửa bài viết</button>
            <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full px-3 py-2 text-left text-sm font-medium text-[#e04371] hover:bg-[#fff0f5]">Xóa bài viết</button>
          </div>}
        </div>}
      </div>
    </div>
  );
}
