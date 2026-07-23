"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

type User = { id: string; email: string; fullName: string | null; status: string };

export default function ItStaffUsersPage() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<User[]>([]); const [email, setEmail] = useState(""); const [fullName, setFullName] = useState(""); const [message, setMessage] = useState("");
  const load = useCallback(async () => { const response = await authFetch("/api/principal/it-staff"); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.message ?? "Không thể tải danh sách."); setItems(payload.content ?? []); }, [authFetch]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((error) => setMessage(String(error))); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function add() { try { const response = await authFetch("/api/principal/it-staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, fullName: fullName || null }) }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.message ?? "Không thể thêm tài khoản."); setEmail(""); setFullName(""); setMessage("Đã cấp quyền IT Staff."); await load(); } catch (error) { setMessage(String(error)); } }
  async function toggle(item: User) { try { const response = await authFetch(item.status === "DISABLED" ? `/api/principal/it-staff/${item.id}/reactivate` : `/api/principal/it-staff/${item.id}`, { method: item.status === "DISABLED" ? "PATCH" : "DELETE" }); if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.message ?? "Không thể cập nhật tài khoản."); } await load(); } catch (error) { setMessage(String(error)); } }
  return <main className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-semibold">Quản lý IT Staff</h1>{message && <p className="mt-4 rounded bg-gray-100 p-3 text-sm">{message}</p>}<section className="mt-6 rounded border p-4"><h2 className="font-medium">Cấp quyền IT Staff</h2><div className="mt-3 flex flex-wrap gap-2"><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" className="min-w-52 flex-1 rounded border px-3 py-2 text-sm"/><input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Họ tên (không bắt buộc)" className="min-w-52 flex-1 rounded border px-3 py-2 text-sm"/><button type="button" onClick={() => void add()} disabled={!email.trim()} className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50">Cấp quyền</button></div></section><section className="mt-6"><h2 className="mb-3 font-medium">Danh sách ({items.length})</h2><div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between rounded border p-3"><div><p className="font-medium">{item.fullName ?? item.email}</p><p className="text-sm text-gray-500">{item.email} · {item.status}</p></div><button type="button" onClick={() => void toggle(item)} className="text-sm underline">{item.status === "DISABLED" ? "Kích hoạt lại" : "Thu hồi"}</button></div>)}</div></section></main>;
}
