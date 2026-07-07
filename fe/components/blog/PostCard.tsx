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

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function PostCard({ post, onClick }: { post: Summary; onClick: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyLink(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/blog?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API không khả dụng — bỏ qua, không phải luồng chính.
    }
  }

  return (
    <div
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col rounded-2xl border-[0.8px] border-[#eaeae7] bg-white p-5 transition-colors hover:border-[#d8d8d5]"
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={post.authorName} seed={post.authorId} size={34} />
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
        {post.thumbnailUrl && (
          <div className="h-[72px] w-[100px] shrink-0 overflow-hidden rounded-[14px] bg-[#f0f0ee]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.thumbnailUrl} alt="" className="size-full object-cover" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t-[0.8px] border-[#f5f5f3] pt-3.5">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#b0b1c2]">
          <span className="size-3.5"><CommentIcon /></span>
          {post.commentCount}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={copyLink}
          title="Sao chép liên kết"
          className="flex size-7 items-center justify-center rounded-[10px] text-[#b0b1c2] hover:bg-[#f7f7f5] hover:text-[#4a4b5e]"
        >
          <span className="size-[13px]">{copied ? "✓" : <LinkIcon />}</span>
        </button>
      </div>
    </div>
  );
}
