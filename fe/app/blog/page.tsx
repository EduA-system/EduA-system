"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { createEditorExtensions } from "@/components/LessonEditor/editorConfig";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";

const SUBJECTS = ["MATH", "CHEMISTRY", "PHYSICS"] as const;

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

async function uploadFile(authFetch: AuthFetch, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authFetch("/api/uploads", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data as { message?: string } | null)?.message ?? "Upload thất bại");
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

function RichEditor({
  onChange,
  authFetch,
}: {
  onChange: (html: string) => void;
  authFetch: AuthFetch;
}) {
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
      const url = await uploadFile(authFetch, file);
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
          {uploading ? "Đang tải..." : "Chèn ảnh"}
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
  const { user, status, signOut, authFetch } = useAuth();
  const [posts, setPosts] = useState<Summary[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<string>("CHEMISTRY");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");

  const loadPosts = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      setPosts((await api<{ items: Summary[] }>(authFetch, "/blog-posts")).items);
    } catch (e) {
      setMsg(String(e));
    }
  }, [authFetch, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    api<{ items: Summary[] }>(authFetch, "/blog-posts")
      .then((data) => {
        if (!cancelled) setPosts(data.items);
      })
      .catch((e) => {
        if (!cancelled) setMsg(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, status]);

  async function openDetail(id: string) {
    try {
      setDetail(await api<Detail>(authFetch, `/blog-posts/${id}`));
      setMsg("");
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function createPost() {
    try {
      await api<Detail>(authFetch, "/blog-posts", {
        method: "POST",
        body: JSON.stringify({ title, content, subject }),
      });
      setTitle("");
      setContent("");
      setMsg("Đã đăng bài.");
      await loadPosts();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function deletePost(id: string) {
    try {
      await api(authFetch, `/blog-posts/${id}`, { method: "DELETE" });
      setDetail(null);
      await loadPosts();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function addComment() {
    if (!detail) return;
    try {
      await api<Comment>(authFetch, `/blog-posts/${detail.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment }),
      });
      setComment("");
      await openDetail(detail.id);
      await loadPosts();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function deleteComment(cid: string) {
    if (!detail) return;
    try {
      await api(authFetch, `/blog-comments/${cid}`, { method: "DELETE" });
      await openDetail(detail.id);
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
    <RouteGuard pathname="/blog">
    {user && (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Blog giáo viên</h1>
        <span className="text-sm text-gray-600">
          {user.fullName ?? user.email} · {user.role}
          {user.subject ? ` · ${user.subject}` : ""}{" "}
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
            {detail.authorId === user.id && (
              <button onClick={() => deletePost(detail.id)} className="ml-2 text-red-600 underline">
                Xóa bài
              </button>
            )}
          </p>
          <div className="mb-6 rounded border p-3">
            <RichView html={detail.content} />
          </div>

          <h3 className="mb-2 font-medium">Bình luận ({detail.comments.length})</h3>
          <ul className="mb-4 space-y-2">
            {detail.comments.map((c) => (
              <li key={c.id} className="rounded border p-2 text-sm">
                <span className="font-medium">{c.authorName}</span>{" "}
                <span className="text-gray-500">{new Date(c.createdAt).toLocaleString("vi")}</span>
                {c.authorId === user.id && (
                  <button onClick={() => deleteComment(c.id)} className="ml-2 text-red-600 underline">
                    Xóa
                  </button>
                )}
                <div dangerouslySetInnerHTML={{ __html: c.content }} />
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Viết bình luận..."
              className="flex-1 rounded border px-3 py-2 text-sm"
            />
            <button onClick={addComment} className="rounded bg-black px-4 py-2 text-sm text-white">
              Gửi
            </button>
          </div>
        </article>
      ) : (
        <>
          <section className="mb-8 rounded border p-4">
            <h2 className="mb-3 font-medium">Đăng bài mới</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề"
              className="mb-2 w-full rounded border px-3 py-2"
            />
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mb-2 rounded border px-3 py-2"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <RichEditor onChange={setContent} authFetch={authFetch} />
            <button onClick={createPost} className="mt-3 rounded bg-black px-4 py-2 text-sm text-white">
              Đăng bài
            </button>
          </section>

          <section>
            <h2 className="mb-3 font-medium">Bài viết cộng đồng ({posts.length})</h2>
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
        </>
      )}
    </div>
    )}
    </RouteGuard>
  );
}
