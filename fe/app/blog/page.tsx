"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { createEditorExtensions } from "@/components/LessonEditor/editorConfig";

// Client ID public (giống app/auth). BE gọi qua proxy /api/* (next.config rewrites) → same-origin.
const GOOGLE_CLIENT_ID =
  "98078357098-pknisf1ub7kg5nop658jpeo31clhid2f.apps.googleusercontent.com";
const TOKEN_KEY = "edua_access_token";
const SUBJECTS = ["MATH", "CHEMISTRY", "PHYSICS"] as const;

type User = { id: string; email: string; fullName: string | null; role: string; subject: string | null };
type Summary = { id: string; title: string; subject: string; authorId: string; authorName: string; createdAt: string; commentCount: number };
type Comment = { id: string; content: string; authorId: string; authorName: string; createdAt: string };
type Detail = { id: string; title: string; content: string; subject: string; authorId: string; authorName: string; createdAt: string; comments: Comment[] };

// ---- gọi BE: thêm Bearer + JSON, ném lỗi kèm message từ BE ----
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

async function uploadFile(token: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data as { message?: string })?.message ?? "Upload thất bại");
  }
  const data = await res.json();
  return data.url as string;
}

interface GIS {
  accounts: { id: {
    initialize: (c: { client_id: string; callback: (r: { credential: string }) => void }) => void;
    renderButton: (el: HTMLElement, o: { theme: string; size: string }) => void;
  } };
}
declare global { interface Window { google?: GIS } }

// ---- editor dùng đúng cấu hình lesson (TipTap) ----
function RichEditor({ onChange, token }: { onChange: (html: string) => void; token: string }) {
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(token, file);
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      alert(String(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="mb-1 flex gap-1">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
          type="button"
          disabled={uploading}
        >
          {uploading ? "Đang tải…" : "Chèn ảnh"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
      <EditorContent editor={editor} className="tiptap min-h-32 rounded border p-3" />
    </div>
  );
}

function RichView({ html }: { html: string }) {
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: html,
    editable: false,
    immediatelyRender: false,
  });
  return <EditorContent editor={editor} className="tiptap" />;
}

export default function BlogPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Summary[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  // form tạo bài
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<string>("CHEMISTRY");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const btnRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(async (tk: string) => {
    try { setPosts((await api<{ items: Summary[] }>(`/blog-posts`, tk)).items); }
    catch (e) { setMsg(String(e)); }
  }, []);

  const applyLogin = useCallback((tk: string, u: User) => {
    setToken(tk); setUser(u); localStorage.setItem(TOKEN_KEY, tk); loadPosts(tk);
  }, [loadPosts]);

  // Đăng nhập Google → BE phát access token.
  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const d = await api<{ accessToken: string; user: User }>(`/auth/google`, null, {
        method: "POST", body: JSON.stringify({ idToken }),
      });
      applyLogin(d.accessToken, d.user);
    } catch (e) { setMsg(String(e)); }
  }, [applyLogin]);

  // Khôi phục phiên từ token đã lưu (verify bằng /me).
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

  async function createPost() {
    try {
      await api<Detail>(`/blog-posts`, token, { method: "POST", body: JSON.stringify({ title, content, subject }) });
      setTitle(""); setContent(""); setMsg("Đã đăng bài.");
      if (token) loadPosts(token);
    } catch (e) { setMsg(String(e)); }
  }

  async function deletePost(id: string) {
    try { await api(`/blog-posts/${id}`, token, { method: "DELETE" }); setDetail(null); if (token) loadPosts(token); }
    catch (e) { setMsg(String(e)); }
  }

  async function addComment() {
    if (!detail) return;
    try {
      await api<Comment>(`/blog-posts/${detail.id}/comments`, token, { method: "POST", body: JSON.stringify({ content: comment }) });
      setComment(""); openDetail(detail.id); if (token) loadPosts(token);
    } catch (e) { setMsg(String(e)); }
  }

  async function deleteComment(cid: string) {
    if (!detail) return;
    try { await api(`/blog-comments/${cid}`, token, { method: "DELETE" }); openDetail(detail.id); }
    catch (e) { setMsg(String(e)); }
  }

  function logout() {
    api(`/auth/logout`, token, { method: "POST" }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); setPosts([]); setDetail(null);
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="mb-4 text-xl font-semibold">Blog giáo viên</h1>
        <p className="mb-3 text-sm text-gray-600">Đăng nhập bằng Google để tiếp tục.</p>
        <div ref={btnRef} />
        {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Blog giáo viên</h1>
        <span className="text-sm text-gray-600">
          {user.fullName ?? user.email} · {user.role}
          {user.subject ? ` · ${user.subject}` : ""}{" "}
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
            {detail.authorId === user.id && (
              <button onClick={() => deletePost(detail.id)} className="ml-2 text-red-600 underline">Xóa bài</button>
            )}
          </p>
          <div className="mb-6 rounded border p-3"><RichView html={detail.content} /></div>

          <h3 className="mb-2 font-medium">Bình luận ({detail.comments.length})</h3>
          <ul className="mb-4 space-y-2">
            {detail.comments.map((c) => (
              <li key={c.id} className="rounded border p-2 text-sm">
                <span className="font-medium">{c.authorName}</span>{" "}
                <span className="text-gray-500">{new Date(c.createdAt).toLocaleString("vi")}</span>
                {c.authorId === user.id && (
                  <button onClick={() => deleteComment(c.id)} className="ml-2 text-red-600 underline">Xóa</button>
                )}
                <div dangerouslySetInnerHTML={{ __html: c.content }} />
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Viết bình luận…"
              className="flex-1 rounded border px-3 py-2 text-sm" />
            <button onClick={addComment} className="rounded bg-black px-4 py-2 text-sm text-white">Gửi</button>
          </div>
        </article>
      ) : (
        <>
          <section className="mb-8 rounded border p-4">
            <h2 className="mb-3 font-medium">Đăng bài mới</h2>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề"
              className="mb-2 w-full rounded border px-3 py-2" />
            <select value={subject} onChange={(e) => setSubject(e.target.value)}
              className="mb-2 rounded border px-3 py-2">
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <RichEditor onChange={setContent} token={token!} />
            <button onClick={createPost} className="mt-3 rounded bg-black px-4 py-2 text-sm text-white">Đăng bài</button>
          </section>

          <section>
            <h2 className="mb-3 font-medium">Bài viết cộng đồng ({posts.length})</h2>
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
        </>
      )}
    </div>
  );
}
