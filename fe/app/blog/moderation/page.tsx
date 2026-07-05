"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Trang kiểm duyệt Blog cho Moderator. Liên kết BE qua proxy /api/* (next.config rewrites).
// Moderator: xem bài trong môn phụ trách + gỡ bài vi phạm kèm lý do (BR-21).
const GOOGLE_CLIENT_ID =
  "98078357098-pknisf1ub7kg5nop658jpeo31clhid2f.apps.googleusercontent.com";
const TOKEN_KEY = "edua_access_token";

type User = { id: string; email: string; fullName: string | null; role: string; subject: string | null };
type Summary = { id: string; title: string; subject: string; authorId: string; authorName: string; createdAt: string; commentCount: number };
type Comment = { id: string; content: string; authorId: string; authorName: string; createdAt: string };
type Detail = { id: string; title: string; content: string; subject: string; authorId: string; authorName: string; createdAt: string; comments: Comment[] };

// gọi BE: thêm Bearer + JSON, ném lỗi kèm message từ BE.
async function api<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...init, headers, credentials: "include" });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { message?: string })?.message ?? res.statusText);
  return data as T;
}

interface GIS {
  accounts: { id: {
    initialize: (c: { client_id: string; callback: (r: { credential: string }) => void }) => void;
    renderButton: (el: HTMLElement, o: { theme: string; size: string }) => void;
  } };
}
declare global { interface Window { google?: GIS } }

export default function BlogModerationPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Summary[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const btnRef = useRef<HTMLDivElement>(null);

  // Chỉ nạp bài thuộc môn phụ trách của Moderator (BR-21).
  const loadPosts = useCallback(async (tk: string, u: User) => {
    const scope = u.subject ? `?subject=${u.subject}` : "";
    try { setPosts((await api<{ items: Summary[] }>(`/blog-posts${scope}`, tk)).items); }
    catch (e) { setMsg(String(e)); }
  }, []);

  const applyLogin = useCallback((tk: string, u: User) => {
    setToken(tk); setUser(u); localStorage.setItem(TOKEN_KEY, tk);
    if (u.role === "MODERATOR") loadPosts(tk, u);
  }, [loadPosts]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const d = await api<{ accessToken: string; user: User }>(`/auth/google`, null, {
        method: "POST", body: JSON.stringify({ idToken }),
      });
      applyLogin(d.accessToken, d.user);
    } catch (e) { setMsg(String(e)); }
  }, [applyLogin]);

  // Khôi phục phiên từ token đã lưu.
  useEffect(() => {
    const tk = localStorage.getItem(TOKEN_KEY);
    if (!tk) return;
    api<User>(`/auth/me`, tk).then((u) => applyLogin(tk, u)).catch(() => localStorage.removeItem(TOKEN_KEY));
  }, [applyLogin]);

  // Nút Google Sign-In khi chưa đăng nhập.
  useEffect(() => {
    if (user) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => loginWithGoogle(r.credential),
      });
      if (btnRef.current) window.google?.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large" });
    };
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, [user, loginWithGoogle]);

  async function openDetail(id: string) {
    try { setDetail(await api<Detail>(`/blog-posts/${id}`, token)); setMsg(""); }
    catch (e) { setMsg(String(e)); }
  }

  // Gỡ bài vi phạm — bắt buộc lý do (BR-21).
  async function removePost(id: string) {
    const reason = window.prompt("Lý do gỡ bài:");
    if (!reason || !reason.trim()) return;
    try {
      await api(`/blog-posts/${id}/removal`, token, { method: "POST", body: JSON.stringify({ reason }) });
      setDetail(null); setMsg("Đã gỡ bài.");
      if (user) loadPosts(token!, user);
    } catch (e) { setMsg(String(e)); }
  }

  function logout() {
    api(`/auth/logout`, token, { method: "POST" }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); setPosts([]); setDetail(null);
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="mb-4 text-xl font-semibold">Kiểm duyệt Blog</h1>
        <p className="mb-3 text-sm text-gray-600">Đăng nhập bằng Google (tài khoản Moderator).</p>
        <div ref={btnRef} />
        {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
      </div>
    );
  }

  if (user.role !== "MODERATOR") {
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="mb-2 text-xl font-semibold">Kiểm duyệt Blog</h1>
        <p className="text-sm text-gray-600">
          Tài khoản {user.email} ({user.role}) không có quyền kiểm duyệt.{" "}
          <a href="/blog" className="underline">Về trang Blog</a> ·{" "}
          <button onClick={logout} className="underline">Đăng xuất</button>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kiểm duyệt Blog — môn {user.subject}</h1>
        <span className="text-sm text-gray-600">
          {user.fullName ?? user.email}{" "}
          <button onClick={logout} className="ml-2 underline">Đăng xuất</button>
        </span>
      </header>

      {msg && <p className="mb-4 rounded bg-gray-100 px-3 py-2 text-sm">{msg}</p>}

      {detail ? (
        <article>
          <button onClick={() => setDetail(null)} className="mb-3 text-sm underline">← Danh sách</button>
          <h2 className="text-lg font-semibold">{detail.title}</h2>
          <p className="mb-3 text-xs text-gray-500">
            {detail.authorName} · {detail.subject} · {new Date(detail.createdAt).toLocaleString("vi")}
            <button onClick={() => removePost(detail.id)} className="ml-2 text-red-600 underline">Gỡ bài</button>
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
              <li key={p.id} className="cursor-pointer rounded border p-3 hover:bg-gray-50" onClick={() => openDetail(p.id)}>
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-gray-500">
                  {p.authorName} · {p.subject} · {new Date(p.createdAt).toLocaleString("vi")} · {p.commentCount} bình luận
                </div>
              </li>
            ))}
            {posts.length === 0 && <li className="text-sm text-gray-500">Chưa có bài viết.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
