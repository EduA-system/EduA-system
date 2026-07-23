"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { hasAnyRole } from "@/lib/auth/permissions";

const SUBJECTS = ["MATH", "CHEMISTRY", "PHYSICS"] as const;

const SUBJECT_LABELS: Record<string, string> = {
  MATH: "Toán",
  CHEMISTRY: "Hoá",
  PHYSICS: "Lý",
};

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

function availableSubject(items: UserItem[], currentSubject: string): string {
  const activeSubjects = new Set(items.filter((item) => item.status !== "DISABLED").map((item) => item.subject));
  return activeSubjects.has(currentSubject)
    ? SUBJECTS.find((subject) => !activeSubjects.has(subject)) ?? currentSubject
    : currentSubject;
}

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
  const [replacementTarget, setReplacementTarget] = useState<UserItem | null>(null);
  const [replacementEmail, setReplacementEmail] = useState("");
  const [disablePrevious, setDisablePrevious] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  const isPrincipal = hasAnyRole(user, ["PRINCIPAL"]);
  const isModerator = hasAnyRole(user, ["MODERATOR"]);

  const loadItems = useCallback(async () => {
    if (status !== "authenticated" || !user) return;
    try {
      if (isPrincipal) {
        const data = await api<PageResponse>(authFetch, "/principal/moderators");
        setItems(data.content);
        setAddSubject((current) => availableSubject(data.content, current));
      } else if (isModerator) {
        const data = await api<PageResponse>(authFetch, "/moderator/teachers");
        setItems(data.content);
      }
    } catch (e) {
      setMsg(String(e));
    }
  }, [authFetch, status, user, isPrincipal, isModerator]);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let cancelled = false;
    const fetchData = async () => {
      try {
        if (isPrincipal) {
          const data = await api<PageResponse>(authFetch, "/principal/moderators");
          if (!cancelled) {
            setItems(data.content);
            setAddSubject((current) => availableSubject(data.content, current));
          }
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
  }, [authFetch, status, user, isPrincipal, isModerator]);

  async function addUser() {
    if (!addEmail.trim()) return;
    try {
      if (isPrincipal) {
        await api<UserItem>(authFetch, "/principal/moderators", {
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

  async function toggleUser(id: string, currentStatus: string) {
    const isDisabled = currentStatus === "DISABLED";
    if (!isDisabled && !window.confirm("Xác nhận thu hồi quyền truy cập của tài khoản này?")) return;
    try {
      if (isDisabled) {
        if (isPrincipal) {
          await api(authFetch, `/principal/moderators/${id}/reactivate`, { method: "PATCH" });
        } else if (isModerator) {
          await api(authFetch, `/moderator/teachers/${id}/reactivate`, { method: "PATCH" });
        }
        setMsg("Đã kích hoạt lại.");
      } else {
        if (isPrincipal) {
          await api(authFetch, `/principal/moderators/${id}`, { method: "DELETE" });
        } else if (isModerator) {
          await api(authFetch, `/moderator/teachers/${id}`, { method: "DELETE" });
        }
        setMsg("Đã thu hồi.");
      }
      await loadItems();
    } catch (e) {
      setMsg(String(e));
    }
  }

  function openReplacement(item: UserItem) {
    setReplacementTarget(item);
    setReplacementEmail("");
    setDisablePrevious(false);
  }

  function closeReplacement() {
    if (isReplacing) return;
    setReplacementTarget(null);
  }

  async function replaceModerator() {
    if (!replacementTarget || !replacementEmail.trim()) return;
    setIsReplacing(true);
    try {
      await api<UserItem>(authFetch, `/principal/moderators/${replacementTarget.id}/replacement`, {
        method: "POST",
        body: JSON.stringify({ replacementEmail, disablePrevious }),
      });
      setReplacementTarget(null);
      setMsg("Đã thay moderator.");
      await loadItems();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setIsReplacing(false);
    }
  }

  async function handleLogout() {
    await signOut();
    setItems([]);
  }

  const title = isPrincipal ? "Quản lý Moderator" : "Quản lý Teacher";
  const addLabel = isPrincipal ? "Thêm Moderator" : "Thêm Teacher";
  const emptyMsg = isPrincipal ? "Chưa có Moderator." : "Chưa có Teacher.";

  const takenSubjects = isPrincipal
    ? new Set(items.filter((i) => i.status !== "DISABLED").map((i) => i.subject))
    : new Set<string>();

  return (
    <RouteGuard pathname="/user-management">
    {user && (
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
            disabled={isPrincipal && takenSubjects.size >= SUBJECTS.length}
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s} disabled={isPrincipal && takenSubjects.has(s)}>
                {SUBJECT_LABELS[s] ?? s}{isPrincipal && takenSubjects.has(s) ? " (đã có)" : ""}
              </option>
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
                {isPrincipal && item.status !== "DISABLED" ? (
                  <button
                    type="button"
                    onClick={() => openReplacement(item)}
                    className="text-sm underline text-red-600"
                  >
                    Thay moderator
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleUser(item.id, item.status)}
                    className={`text-sm underline ${item.status === "DISABLED" ? "text-green-600" : "text-red-600"}`}
                  >
                    {item.status === "DISABLED" ? "Kích hoạt lại" : "Thu hồi"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {replacementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="replace-moderator-title">
            <h2 id="replace-moderator-title" className="text-lg font-semibold">Thay moderator</h2>
            <p className="mt-2 text-sm text-gray-600">
              {replacementTarget.fullName ?? replacementTarget.email} sẽ được chuyển thành Teacher.
            </p>
            <label className="mt-4 block text-sm font-medium" htmlFor="replacement-email">Email moderator thay thế</label>
            <input
              id="replacement-email"
              type="email"
              value={replacementEmail}
              onChange={(e) => setReplacementEmail(e.target.value)}
              placeholder="Email"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              autoFocus
            />
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={disablePrevious}
                onChange={(e) => setDisablePrevious(e.target.checked)}
              />
              Vô hiệu hoá tài khoản moderator cũ sau khi chuyển thành Teacher
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeReplacement} disabled={isReplacing} className="rounded border px-3 py-2 text-sm">
                Huỷ
              </button>
              <button
                type="button"
                onClick={replaceModerator}
                disabled={isReplacing || !replacementEmail.trim()}
                className="rounded bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReplacing ? "Đang thay..." : "Xác nhận thay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    )}
    </RouteGuard>
  );
}
