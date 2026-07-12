"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardIcon } from "@/components/ui/DashboardIcon";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { useAuth } from "@/lib/auth/AuthContext";
import type { AuthUser } from "@/lib/auth/client";

const MAX_AVATAR_SIZE = 10 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/png", "image/jpeg"]);

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function roleLabel(role: string | null): string {
  if (role === "ADMINISTRATOR") return "Quản trị viên";
  if (role === "MODERATOR") return "Người kiểm duyệt";
  return "Giáo viên";
}

function subjectLabel(subject: string | null): string {
  const labels: Record<string, string> = {
    MATH: "Toán học",
    CHEMISTRY: "Hóa học",
    PHYSICS: "Vật lý",
  };
  return subject ? (labels[subject] ?? subject) : "Chưa cập nhật";
}

async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? response.statusText ?? "Không thể hoàn tất yêu cầu.";
}

async function uploadAvatar(authFetch: AuthFetch, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await authFetch("/api/uploads", { method: "POST", body: formData });
  if (!response.ok) throw new Error(await errorMessage(response));
  const data = await response.json() as { url?: string };
  if (!data.url) throw new Error("Máy chủ không trả về URL ảnh đại diện.");
  return data.url;
}

async function saveProfile(
  authFetch: AuthFetch,
  payload: Pick<AuthUser, "fullName" | "avatarUrl" | "contactInfo">,
): Promise<AuthUser> {
  const response = await authFetch("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<AuthUser>;
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function UserProfileContent() {
  const { user, authFetch, signOut, updateUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setContactInfo(user?.contactInfo ?? "");
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [user]);

  useEffect(() => {
    if (!avatarFile) return;
    const preview = URL.createObjectURL(avatarFile);
    setAvatarPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [avatarFile]);

  function resetForm() {
    setFullName(user?.fullName ?? "");
    setContactInfo(user?.contactInfo ?? "");
    setAvatarFile(null);
    setAvatarPreview(null);
    setError("");
    setSuccess("");
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const supported = AVATAR_TYPES.has(file.type) || /\.(png|jpe?g)$/i.test(file.name);
    if (!supported) {
      setError("Chỉ hỗ trợ ảnh PNG, JPG hoặc JPEG.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Ảnh đại diện phải có dung lượng tối đa 10 MB.");
      return;
    }
    setError("");
    setSuccess("");
    setAvatarFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const avatarUrl = avatarFile ? await uploadAvatar(authFetch, avatarFile) : user.avatarUrl;
      const nextUser = await saveProfile(authFetch, {
        fullName: fullName.trim() || null,
        contactInfo: contactInfo.trim() || null,
        avatarUrl,
      });
      updateUser(nextUser);
      setSuccess("Đã lưu thay đổi hồ sơ.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu hồ sơ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    window.location.assign("/login");
  }

  if (!user) return null;
  const avatarSource = avatarPreview ?? user.avatarUrl;

  return (
    <main className="h-screen w-full overflow-hidden bg-[#f5f1ec] text-[#1f1f1f]">
      <div className="flex h-full w-full">
        <Sidebar activeHref="/user-profile" />
        <section className="min-w-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[980px]">
            <div className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#eadfd7] bg-[#fff7f1] px-3 text-[11px] font-medium text-[#d97757]">
              <DashboardIcon name="settings" className="size-3" /> Tài khoản
            </div>
            <h1 className="font-libertine mt-4 text-[48px] font-normal leading-none sm:text-[64px]">Hồ sơ cá nhân</h1>
            <p className="mt-4 max-w-[500px] text-[13px] leading-[23px] text-[#6b6b6b]">Cập nhật thông tin hiển thị để EDUA nhận diện bạn tốt hơn trong không gian làm việc.</p>

            <form onSubmit={handleSubmit} className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-[14px] border border-[#d8d1c9] bg-white px-5 py-6 sm:px-7">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                  <DashboardIcon name="formTitle" /> Thông tin hiển thị
                </div>
                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-[#1f1f1f] text-xl font-semibold text-white">
                    {avatarSource ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarSource} alt="Ảnh đại diện" className="size-full object-cover" />
                    ) : initialsOf(user.fullName ?? user.email)}
                  </div>
                  <div>
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-[#faf9f7] px-3.5 text-[13px] font-medium text-[#1f1f1f] transition hover:bg-[#f3efe9]">
                      <DashboardIcon name="upload" className="size-3.5" /> {avatarFile ? "Đổi ảnh đã chọn" : "Tải ảnh lên"}
                      <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={handleAvatarChange} />
                    </label>
                    <p className="mt-2 text-[11px] leading-4 text-[#6b6b6b]">PNG, JPG hoặc JPEG · tối đa 10 MB</p>
                  </div>
                </div>

                <div className="my-7 h-px bg-[#d8d1c9]" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-[12px] font-medium text-[#6b6b6b]">Họ và tên
                    <input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={255} placeholder="Nhập tên hiển thị" className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]" />
                  </label>
                  <label className="text-[12px] font-medium text-[#6b6b6b]">Thông tin liên hệ
                    <input value={contactInfo} onChange={(event) => setContactInfo(event.target.value)} maxLength={500} placeholder="Số điện thoại hoặc liên hệ khác" className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]" />
                  </label>
                </div>

                {(error || success) && <p className={`mt-5 rounded-lg border px-3 py-2 text-[12px] ${error ? "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]" : "border-[#bfdcc8] bg-[#f1faf3] text-[#287447]"}`}>{error || success}</p>}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="submit" disabled={saving} className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-[#e8724a] px-5 text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(232,114,74,0.28)] transition hover:bg-[#d96a42] disabled:cursor-not-allowed disabled:bg-[#e8b9a7]">
                    <DashboardIcon name="save" className="size-3.5" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  <button type="button" disabled={saving} onClick={resetForm} className="h-11 rounded-[11px] px-4 text-[13px] font-medium text-[#6b6b6b] transition hover:bg-[#edeae5] disabled:cursor-not-allowed">Hủy thay đổi</button>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-[14px] border border-[#d8d1c9] bg-white px-5 py-6">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">Thông tin tài khoản</p>
                  <dl className="mt-5 space-y-4 text-[13px]">
                    <div><dt className="text-[11px] text-[#8a837b]">Email</dt><dd className="mt-1 break-all font-medium text-[#1f1f1f]">{user.email}</dd></div>
                    <div><dt className="text-[11px] text-[#8a837b]">Vai trò</dt><dd className="mt-1 font-medium text-[#1f1f1f]">{roleLabel(user.role)}</dd></div>
                    <div><dt className="text-[11px] text-[#8a837b]">Môn học</dt><dd className="mt-1 font-medium text-[#1f1f1f]">{subjectLabel(user.subject)}</dd></div>
                  </dl>
                </div>
                <div className="rounded-[14px] border border-[#d8d1c9] bg-[#faf9f7] p-5">
                  <p className="text-[13px] font-medium text-[#1f1f1f]">Phiên đăng nhập</p>
                  <p className="mt-1.5 text-[12px] leading-5 text-[#6b6b6b]">Bạn đang đăng nhập bằng tài khoản Google.</p>
                  <button type="button" onClick={() => void handleSignOut()} className="mt-4 text-[13px] font-medium text-[#c0492b] underline decoration-[#e8b4a4] underline-offset-4 transition hover:text-[#9f351d]">Đăng xuất</button>
                </div>
              </aside>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function UserProfilePage() {
  return <RouteGuard pathname="/user-profile"><UserProfileContent /></RouteGuard>;
}
