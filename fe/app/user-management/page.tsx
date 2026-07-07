"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

const SUBJECTS = ["MATH", "CHEMISTRY", "PHYSICS"] as const;

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type UserItem = {
  id: string;
  email: string;
  fullName: string | null;
  subject: string;
  status: string;
  grantedAt: string;
  grantedByEmail: string | null;
};

type PageResponse = {
  content: UserItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
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

export default function UserManagementPage() {
  const { user, status, signOut, authFetch } = useAuth();
  const [items, setItems] = useState<UserItem[]>([]);
  const [msg, setMsg] = useState("");

  // Add form
  const [addEmail, setAddEmail] = useState("");
  const [addSubject, setAddSubject] = useState("CHEMISTRY");
  const [addFullName, setAddFullName] = useState("");

  const isAdmin = user?.role === "ADMINISTRATOR";
  const isModerator = user?.role === "MODERATOR";

  const loadItems = useCallback(async () => {
    if (status !== "authenticated" || !user) return;
    try {
      if (isAdmin) {
        const data = await api<PageResponse>(authFetch, "/admin/moderators");
        setItems(data.content);
      } else if (isModerator) {
        const data = await api<PageResponse>(authFetch, "/moderator/teachers");
        setItems(data.content);
      }
    } catch (e) {
      setMsg(String(e));
    }
  }, [authFetch, status, user, isAdmin, isModerator]);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let cancelled = false;
    const fetchData = async () => {
      try {
        if (isAdmin) {
          const data = await api<PageResponse>(authFetch, "/admin/moderators");
          if (!cancelled) setItems(data.content);
        } else if (isModerator) {
          const data = await api<PageResponse>(authFetch, "/moderator/teachers");
          if (!cancelled) setItems(data.content);
        }
      } catch (e) {
        if (!cancelled) setMsg(String(e));
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [authFetch, status, user, isAdmin, isModerator]);

  async function addUser() {
    if (!addEmail.trim()) return;
    try {
      if (isAdmin) {
        await api<UserItem>(authFetch, "/admin/moderators", {
          method: "POST",
          body: JSON.stringify({ email: addEmail, subject: addSubject, fullName: addFullName || null }),
        });
      } else if (isModerator) {
        await api<UserItem>(authFetch, "/moderator/teachers", {
          method: "POST",
          body: JSON.stringify({ email: addEmail, subject: addSubject, fullName: addFullName || null }),
        });
      }
      setAddEmail("");
      setAddFullName("");
      setMsg("Đã thêm.");
      await loadItems();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function deleteUser(id: string) {
    if (!window.confirm("Xác nhận thu hồi quyền truy cập của tài khoản này?")) return;
    try {
      if (isAdmin) {
        await api(authFetch, `/admin/moderators/${id}`, { method: "DELETE" });
      } else if (isModerator) {
        await api(authFetch, `/moderator/teachers/${id}`, { method: "DELETE" });
      }
      setMsg("Đã thu hồi.");
      await loadItems();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function handleLogout() {
    await signOut();
    setItems([]);
  }

  if (status === "loading") {
    return <div className="mx-auto max-w-md p-8 text-sm text-gray-600">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="mb-4 text-xl font-semibold">Quản lý tài khoản</h1>
        <p className="mb-4 text-sm text-gray-600">Đăng nhập bằng Google để tiếp tục.</p>
        <Link className="rounded bg-black px-4 py-2 text-sm text-white" href="/login">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (!isAdmin && !isModerator) {
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="mb-2 text-xl font-semibold">Quản lý tài khoản</h1>
        <p className="text-sm text-gray-600">
          Tài khoản {user.email} ({user.role}) không có quyền quản lý tài khoản.
        </p>
      </div>
    );
  }

  const title = isAdmin ? "Quản lý Moderator" : "Quản lý Teacher";
  const addLabel = isAdmin ? "Thêm Moderator" : "Thêm Teacher";
  const emptyMsg = isAdmin ? "Chưa có Moderator." : "Chưa có Teacher.";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <span className="text-sm text-gray-600">
          {user.fullName ?? user.email} · {user.role}
          {user.subject ? ` · ${user.subject}` : ""}{" "}
          <button onClick={handleLogout} className="ml-2 underline">
            Đăng xuất
          </button>
        </span>
      </header>

      {msg && <p className="mb-4 rounded bg-gray-100 px-3 py-2 text-sm">{msg}</p>}

      <section className="mb-8 rounded border p-4">
        <h2 className="mb-3 font-medium">{addLabel}</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="Email"
            className="flex-1 rounded border px-3 py-2 text-sm min-w-48"
          />
          <input
            value={addFullName}
            onChange={(e) => setAddFullName(e.target.value)}
            placeholder="Họ tên (không bắt buộc)"
            className="flex-1 rounded border px-3 py-2 text-sm min-w-40"
          />
          <select
            value={addSubject}
            onChange={(e) => setAddSubject(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={addUser} className="rounded bg-black px-4 py-2 text-sm text-white">
            Thêm
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Danh sách ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyMsg}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-medium">{item.fullName ?? item.email}</div>
                  <div className="text-xs text-gray-500">
                    {item.email} · {item.subject} · {item.status}
                    {item.grantedByEmail ? ` · cấp bởi ${item.grantedByEmail}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => deleteUser(item.id)}
                  className="text-sm text-red-600 underline"
                >
                  Thu hồi
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
