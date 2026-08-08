"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserProfileView, type UserProfileView } from "@/lib/user-profile-view";

function roleLabel(role: string): string {
  if (role === "PRINCIPAL") return "Hiệu trưởng";
  if (role === "MODERATOR") return "Người kiểm duyệt";
  if (role === "IT_STAFF") return "Nhân viên IT";
  if (role === "STUDENT") return "Học sinh";
  if (role === "TEACHER") return "Giáo viên";
  return "Chưa xác định";
}

function subjectLabel(subject: string | null): string {
  const labels: Record<string, string> = { MATH: "Toán học", CHEMISTRY: "Hóa học", PHYSICS: "Vật lý" };
  return subject ? (labels[subject] ?? subject) : "Chưa cập nhật";
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function UserProfileViewContent({ userId }: { userId: string }) {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [profile, setProfile] = useState<UserProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProfile(await getUserProfileView(authFetch, userId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải hồ sơ.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <main className="min-h-screen bg-white text-[#1f1f1f]">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[720px]">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#77798c] transition hover:text-[#1f1f1f]"
            >
              <span aria-hidden="true">←</span> Quay lại
            </button>

            {loading ? (
              <div className="mt-8 h-64 animate-pulse rounded-[14px] bg-[#f3efe9]" />
            ) : error ? (
              <div className="mt-8 rounded-[14px] border border-[#e8b4a4] bg-[#fdf3ef] p-6 text-sm text-[#c0492b]">
                {error}
              </div>
            ) : profile ? (
              <div className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white px-5 py-6 sm:px-7">
                <div className="flex items-center gap-5">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-[#1f1f1f] text-xl font-semibold text-white">
                    {profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- avatar có thể đến từ storage ngoài, chưa cấu hình next/image loader
                      <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      initialsOf(profile.fullName ?? profile.email)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold">{profile.fullName ?? profile.email}</h1>
                    <p className="mt-1 text-sm text-[#6b6b6b]">{roleLabel(profile.role)}</p>
                  </div>
                </div>

                <div className="my-6 h-px bg-[#d8d1c9]" />

                <dl className="grid gap-4 text-[13px] sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] text-[#8a837b]">Email</dt>
                    <dd className="mt-1 break-all font-medium">{profile.email}</dd>
                  </div>
                  {profile.subject ? (
                    <div>
                      <dt className="text-[11px] text-[#8a837b]">Môn</dt>
                      <dd className="mt-1 font-medium">{subjectLabel(profile.subject)}</dd>
                    </div>
                  ) : null}
                  {profile.grades.length > 0 ? (
                    <div>
                      <dt className="text-[11px] text-[#8a837b]">Khối</dt>
                      <dd className="mt-1 font-medium">{profile.grades.join(", ")}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-[11px] text-[#8a837b]">
                      {profile.role === "STUDENT" ? "Ngày tham gia lớp" : "Ngày được cấp quyền"}
                    </dt>
                    <dd className="mt-1 font-medium">{formatDate(profile.grantedAt)}</dd>
                  </div>
                  {profile.grantedByName ? (
                    <div>
                      <dt className="text-[11px] text-[#8a837b]">Cấp bởi</dt>
                      <dd className="mt-1 font-medium">{profile.grantedByName}</dd>
                    </div>
                  ) : null}
                </dl>

                {profile.bio ? (
                  <div className="mt-6">
                    <p className="text-[11px] text-[#8a837b]">Giới thiệu</p>
                    <p className="mt-1.5 text-[13px] leading-6 text-[#1f1f1f]">{profile.bio}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export function UserProfileViewPage({ userId }: { userId: string }) {
  return (
    <RouteGuard pathname="/user-profile">
      <UserProfileViewContent userId={userId} />
    </RouteGuard>
  );
}
