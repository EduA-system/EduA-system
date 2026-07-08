"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { hasAnyRole } from "@/lib/auth/permissions";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type Summary = {
  id: string;
  title: string;
  subject: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  commentCount: number;
};
type Comment = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};
type Detail = {
  id: string;
  title: string;
  content: string;
  subject: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  comments: Comment[];
};

async function api<T>(
  authFetch: AuthFetch,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await authFetch(`/api${path}`, { ...init, headers });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { message?: string } | null)?.message ?? res.statusText);
  }
  return data as T;
}

export default function BlogModerationPage() {
  const { user, status, signOut, authFetch } = useAuth();
  const [posts, setPosts] = useState<Summary[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const isModerator = hasAnyRole(user, ["MODERATOR"]);

  const loadPosts = useCallback(async () => {
    if (status !== "authenticated" || !user || !isModerator) return;
    const scope = user.subject ? `?subject=${user.subject}` : "";
    try {
      setPosts((await api<{ items: Summary[] }>(authFetch, `/blog-posts${scope}`)).items);
    } catch (e) {
      setMsg(String(e));
    }
  }, [authFetch, status, user, isModerator]);

  useEffect(() => {
    if (status !== "authenticated" || !user || !isModerator) return;
    let cancelled = false;
    const scope = user.subject ? `?subject=${user.subject}` : "";
    api<{ items: Summary[] }>(authFetch, `/blog-posts${scope}`)
      .then((data) => {
        if (!cancelled) setPosts(data.items);
      })
      .catch((e) => {
        if (!cancelled) setMsg(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, status, user, isModerator]);

  async function openDetail(id: string) {
    try {
      setDetail(await api<Detail>(authFetch, `/blog-posts/${id}`));
      setMsg("");
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function removePost(id: string) {
    const reason = window.prompt("Lý do gỡ bài:");
    if (!reason?.trim()) return;
    try {
      await api(authFetch, `/blog-posts/${id}/removal`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setDetail(null);
      setMsg("Đã gỡ bài.");
      await loadPosts();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function handleLogout() {
    await signOut();
    setPosts([]);
    setDetail(null);
  }

  return (
    <RouteGuard pathname="/blog/moderation" denyHref="/blog" denyLabel="V\u1ec1 trang Blog">
    {user && (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kiểm duyệt Blog - môn {user.subject}</h1>
        <span className="text-sm text-gray-600">
          {user.fullName ?? user.email}{" "}
          <button onClick={handleLogout} className="ml-2 underline">
            Đăng xuất
          </button>
        </span>
      </header>

      {msg && <p className="mb-4 rounded bg-gray-100 px-3 py-2 text-sm">{msg}</p>}

      {detail ? (
        <article>
          <button onClick={() => setDetail(null)} className="mb-3 text-sm underline">
            ← Danh sách
          </button>
          <h2 className="text-lg font-semibold">{detail.title}</h2>
          <p className="mb-3 text-xs text-gray-500">
            {detail.authorName} · {detail.subject} · {new Date(detail.createdAt).toLocaleString("vi")}
            <button onClick={() => removePost(detail.id)} className="ml-2 text-red-600 underline">
              Gỡ bài
            </button>
          </p>
          <div className="mb-6 rounded border p-3" dangerouslySetInnerHTML={{ __html: detail.content }} />

          <h3 className="mb-2 font-medium">Bình luận ({detail.comments.length})</h3>
          <ul className="space-y-2">
            {detail.comments.map((c) => (
              <li key={c.id} className="rounded border p-2 text-sm">
                <span className="font-medium">{c.authorName}</span>{" "}
                <span className="text-gray-500">{new Date(c.createdAt).toLocaleString("vi")}</span>
                <div dangerouslySetInnerHTML={{ __html: c.content }} />
              </li>
            ))}
            {detail.comments.length === 0 && <li className="text-sm text-gray-500">Chưa có bình luận.</li>}
          </ul>
        </article>
      ) : (
        <section>
          <h2 className="mb-3 font-medium">Bài trong môn {user.subject} ({posts.length})</h2>
          <ul className="space-y-2">
            {posts.map((p) => (
              <li
                key={p.id}
                className="cursor-pointer rounded border p-3 hover:bg-gray-50"
                onClick={() => openDetail(p.id)}
              >
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-gray-500">
                  {p.authorName} · {p.subject} · {new Date(p.createdAt).toLocaleString("vi")} ·{" "}
                  {p.commentCount} bình luận
                </div>
              </li>
            ))}
            {posts.length === 0 && <li className="text-sm text-gray-500">Chưa có bài viết.</li>}
          </ul>
        </section>
      )}
    </div>
    )}
    </RouteGuard>
  );
}
