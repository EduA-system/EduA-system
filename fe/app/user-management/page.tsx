"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  RotateCcw,
  ShieldCheck,
  UserMinus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardIcon } from "@/components/ui/DashboardIcon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { hasAnyRole } from "@/lib/auth/permissions";

const SUBJECTS = ["MATH", "CHEMISTRY", "PHYSICS"] as const;
const GRADES = [10, 11, 12] as const;

const SUBJECT_LABELS: Record<string, string> = {
  MATH: "Toán",
  CHEMISTRY: "Hoá",
  PHYSICS: "Lý",
};

const STATUS_LABELS: Record<string, string> = {
  INVITED: "Đã mời",
  ACTIVE: "Đang hoạt động",
  DISABLED: "Đã thu hồi",
};

const PAGE_SIZE = 20;

// Khớp AppUserFieldValidator.MAX_EMAIL_LENGTH ở backend (be/.../service/auth/AppUserFieldValidator.java).
const EMAIL_MAX_LENGTH = 320;
// Cú pháp email chung — cố tình không khoá theo domain gmail.com cụ thể, vì backend cũng không giới hạn
// domain (Google Workspace của trường có thể dùng domain riêng, không chỉ @gmail.com).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate client-side trước khi gọi API — trả về message lỗi tiếng Việt, hoặc null nếu hợp lệ. */
function emailError(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Vui lòng nhập email.";
  if (/\s/.test(trimmed)) return "Email không được chứa khoảng trắng.";
  if (trimmed.length > EMAIL_MAX_LENGTH) return `Email không được vượt quá ${EMAIL_MAX_LENGTH} ký tự.`;
  if (!EMAIL_PATTERN.test(trimmed)) return "Email không đúng định dạng (vd: ten@truong.edu.vn).";
  return null;
}

function EmailFieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-[#c2483c]">{message}</p>;
}

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type AccountItem = {
  id: string;
  email: string;
  fullName: string | null;
  status: string;
};

type SubjectAccountItem = AccountItem & {
  subject: string;
  grades?: number[];
  grantedAt: string;
  grantedByEmail: string | null;
};

type PageResponse<T> = {
  content: T[];
  page: number;
  number?: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

type AccountStatusStats = {
  active: number;
  disabled: number;
};

type PrincipalAccountStats = {
  moderators: AccountStatusStats;
  itStaff: AccountStatusStats;
};

type Tab = "moderator" | "teacher" | "it-staff";

type DisableAccountTarget =
  | { kind: "moderator"; item: SubjectAccountItem }
  | { kind: "teacher"; item: SubjectAccountItem }
  | { kind: "it-staff"; item: AccountItem };

function availableSubject(items: SubjectAccountItem[], currentSubject: string): string {
  const activeSubjects = new Set(items.filter((item) => item.status !== "DISABLED").map((item) => item.subject));
  return activeSubjects.has(currentSubject)
    ? SUBJECTS.find((subject) => !activeSubjects.has(subject)) ?? currentSubject
    : currentSubject;
}

async function api<T>(authFetch: AuthFetch, path: string, init: RequestInit = {}): Promise<T> {
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

function normalizePageResponse<T>(data: PageResponse<T>): PageResponse<T> {
  return {
    ...data,
    page: data.page ?? data.number ?? 0,
  };
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8178]">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-[#1f1f1f]">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const disabled = status === "DISABLED";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        disabled ? "bg-[#fdeceb] text-[#c2483c]" : "bg-[#eef6ec] text-[#5a7a4a]"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** Tên tài khoản trong danh sách — chỉ dẫn tới hồ sơ read-only khi còn active (backend cũng chặn xem
 * tài khoản DISABLED, ẩn link luôn ở đây để tránh dẫn tới trang báo lỗi vô nghĩa). */
function AccountName({ item }: { item: AccountItem }) {
  const label = item.fullName ?? item.email;
  if (item.status === "DISABLED") return <>{label}</>;
  return (
    <Link href={`/user-profile/${item.id}`} className="underline decoration-transparent transition hover:decoration-current">
      {label}
    </Link>
  );
}

function GradeCheckboxes({
  value,
  onChange,
}: {
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const toggle = (grade: number) => {
    onChange(value.includes(grade) ? value.filter((item) => item !== grade) : [...value, grade].sort((a, b) => a - b));
  };
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Chọn khối giảng dạy">
      {GRADES.map((grade) => (
        <label key={grade} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d8d1c9] bg-white px-3 text-sm text-[#4f4943]">
          <input
            type="checkbox"
            checked={value.includes(grade)}
            onChange={() => toggle(grade)}
            className="size-4 accent-[#1f1f1f]"
          />
          Khối {grade}
        </label>
      ))}
    </div>
  );
}

function gradeText(grades: number[] | undefined) {
  return grades && grades.length > 0 ? ` · Khối ${grades.join(", ")}` : "";
}

function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-[#6b6b6b]">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 0}
        className="inline-flex items-center gap-1 rounded-lg border border-[#d8d1c9] bg-white px-3 py-1.5 font-medium transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden /> Trước
      </button>
      <span>
        Trang {page + 1}/{totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="inline-flex items-center gap-1 rounded-lg border border-[#d8d1c9] bg-white px-3 py-1.5 font-medium transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sau <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function UserManagementContent() {
  const { user, authFetch } = useAuth();
  const isPrincipal = hasAnyRole(user, ["PRINCIPAL"]);
  const isModerator = hasAnyRole(user, ["MODERATOR"]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [disableAccountTarget, setDisableAccountTarget] = useState<DisableAccountTarget | null>(null);
  const [disablingAccount, setDisablingAccount] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(isPrincipal ? "moderator" : "teacher");
  const [principalStats, setPrincipalStats] = useState<PrincipalAccountStats | null>(null);
  const [teacherStats, setTeacherStats] = useState<AccountStatusStats | null>(null);

  // ── Moderator accounts (Principal only) ──────────────────────────────
  const [moderatorData, setModeratorData] = useState<PageResponse<SubjectAccountItem> | null>(null);
  const [moderatorEmail, setModeratorEmail] = useState("");
  const [moderatorEmailTouched, setModeratorEmailTouched] = useState(false);
  const [moderatorFullName, setModeratorFullName] = useState("");
  const [moderatorSubject, setModeratorSubject] = useState<string>("CHEMISTRY");
  const [replacementTarget, setReplacementTarget] = useState<SubjectAccountItem | null>(null);
  const [replacementEmail, setReplacementEmail] = useState("");
  const [replacementEmailTouched, setReplacementEmailTouched] = useState(false);
  // Lỗi riêng của modal "Thay Moderator" — không dùng chung `msg` ở đầu trang vì modal là overlay che
  // hết trang, `msg` render phía sau overlay sẽ vô hình, người dùng bấm xong tưởng không có gì xảy ra.
  const [replacementError, setReplacementError] = useState("");
  const [disablePrevious, setDisablePrevious] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  const loadModerators = useCallback(
    async (page: number) => {
      const data = normalizePageResponse(await api<PageResponse<SubjectAccountItem>>(
        authFetch,
        `/principal/moderators?page=${page}&size=${PAGE_SIZE}`,
      ));
      setModeratorData(data);
      setModeratorSubject((current) => availableSubject(data.content, current));
    },
    [authFetch],
  );

  const loadPrincipalStats = useCallback(async () => {
    const data = await api<PrincipalAccountStats>(authFetch, "/principal/account-stats");
    setPrincipalStats(data);
  }, [authFetch]);

  // ── Teacher accounts (Moderator only) ────────────────────────────────
  const [teacherData, setTeacherData] = useState<PageResponse<SubjectAccountItem> | null>(null);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherEmailTouched, setTeacherEmailTouched] = useState(false);
  const [teacherFullName, setTeacherFullName] = useState("");
  const [teacherGrades, setTeacherGrades] = useState<number[]>([10, 11, 12]);

  const loadTeachers = useCallback(
    async (page: number) => {
      const data = normalizePageResponse(await api<PageResponse<SubjectAccountItem>>(
        authFetch,
        `/moderator/teachers?page=${page}&size=${PAGE_SIZE}`,
      ));
      setTeacherData(data);
    },
    [authFetch],
  );

  const loadTeacherStats = useCallback(async () => {
    const data = await api<AccountStatusStats>(authFetch, "/moderator/teachers/stats");
    setTeacherStats(data);
  }, [authFetch]);

  // ── IT Staff accounts (Principal only) ───────────────────────────────
  const [itStaffData, setItStaffData] = useState<PageResponse<AccountItem> | null>(null);
  const [itStaffEmail, setItStaffEmail] = useState("");
  const [itStaffEmailTouched, setItStaffEmailTouched] = useState(false);
  const [itStaffFullName, setItStaffFullName] = useState("");
  const [itStaffReplacementTarget, setItStaffReplacementTarget] = useState<AccountItem | null>(null);
  const [itStaffReplacementEmail, setItStaffReplacementEmail] = useState("");
  const [itStaffReplacementEmailTouched, setItStaffReplacementEmailTouched] = useState(false);
  const [itStaffReplacementFullName, setItStaffReplacementFullName] = useState("");
  const [itStaffReplacementError, setItStaffReplacementError] = useState("");
  const [isReplacingItStaff, setIsReplacingItStaff] = useState(false);

  const loadItStaff = useCallback(
    async (page: number) => {
      const data = normalizePageResponse(await api<PageResponse<AccountItem>>(authFetch, `/principal/it-staff?page=${page}&size=${PAGE_SIZE}`));
      setItStaffData(data);
    },
    [authFetch],
  );

  useEffect(() => {
    if (isPrincipal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadModerators(0).catch((e) => setMsg(String(e)));
      void loadItStaff(0).catch((e) => setMsg(String(e)));
      void loadPrincipalStats().catch((e) => setMsg(String(e)));
    } else if (isModerator) {
      void loadTeachers(0).catch((e) => setMsg(String(e)));
      void loadTeacherStats().catch((e) => setMsg(String(e)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrincipal, isModerator]);

  async function addModerator() {
    setModeratorEmailTouched(true);
    if (emailError(moderatorEmail)) return;
    try {
      await api(authFetch, "/principal/moderators", {
        method: "POST",
        body: JSON.stringify({ email: moderatorEmail, subject: moderatorSubject, fullName: moderatorFullName || null }),
      });
      setModeratorEmail("");
      setModeratorEmailTouched(false);
      setModeratorFullName("");
      setMsg("Đã thêm Người Kiểm Duyệt.");
      await loadModerators(moderatorData?.page ?? 0);
      await loadPrincipalStats();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function toggleModerator(item: SubjectAccountItem) {
    const isDisabled = item.status === "DISABLED";
    if (!isDisabled) {
      setDisableAccountTarget({ kind: "moderator", item });
      return;
    }
    try {
      await api(authFetch, `/principal/moderators/${item.id}/reactivate`, { method: "PATCH" });
      setMsg("Đã kích hoạt lại.");
      await loadModerators(moderatorData?.page ?? 0);
      await loadPrincipalStats();
    } catch (e) {
      setMsg(String(e));
    }
  }

  function openReplacement(item: SubjectAccountItem) {
    setReplacementTarget(item);
    setReplacementEmail("");
    setReplacementEmailTouched(false);
    setReplacementError("");
    setDisablePrevious(false);
  }

  function closeReplacement() {
    if (isReplacing) return;
    setReplacementTarget(null);
  }

  async function replaceModerator() {
    setReplacementEmailTouched(true);
    if (!replacementTarget || emailError(replacementEmail)) return;
    setReplacementError("");
    setIsReplacing(true);
    try {
      await api(authFetch, `/principal/moderators/${replacementTarget.id}/replacement`, {
        method: "POST",
        body: JSON.stringify({ replacementEmail, disablePrevious }),
      });
      setReplacementTarget(null);
      setMsg("Đã thay Moderator.");
      await loadModerators(moderatorData?.page ?? 0);
      await loadPrincipalStats();
    } catch (e) {
      // Lỗi hiện ngay trong modal (không dùng `msg` ngoài trang — modal là overlay che hết, `msg` sẽ vô hình).
      setReplacementError(String(e));
    } finally {
      setIsReplacing(false);
    }
  }

  async function addTeacher() {
    setTeacherEmailTouched(true);
    if (emailError(teacherEmail) || !user?.subject || teacherGrades.length === 0) return;
    try {
      await api(authFetch, "/moderator/teachers", {
        method: "POST",
        body: JSON.stringify({ email: teacherEmail, subject: user.subject, fullName: teacherFullName || null, grades: teacherGrades }),
      });
      setTeacherEmail("");
      setTeacherEmailTouched(false);
      setTeacherFullName("");
      setTeacherGrades([10, 11, 12]);
      setMsg("Đã thêm Giáo Viên.");
      await loadTeachers(teacherData?.page ?? 0);
      await loadTeacherStats();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function toggleTeacher(item: SubjectAccountItem) {
    const isDisabled = item.status === "DISABLED";
    if (!isDisabled) {
      setDisableAccountTarget({ kind: "teacher", item });
      return;
    }
    try {
      await api(authFetch, `/moderator/teachers/${item.id}/reactivate`, { method: "PATCH" });
      setMsg("Đã kích hoạt lại.");
      await loadTeachers(teacherData?.page ?? 0);
      await loadTeacherStats();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function addItStaff() {
    setItStaffEmailTouched(true);
    if (emailError(itStaffEmail)) return;
    try {
      await api(authFetch, "/principal/it-staff", {
        method: "POST",
        body: JSON.stringify({ email: itStaffEmail, fullName: itStaffFullName || null }),
      });
      setItStaffEmail("");
      setItStaffEmailTouched(false);
      setItStaffFullName("");
      setMsg("Đã cấp quyền IT Staff.");
      await loadItStaff(itStaffData?.page ?? 0);
      await loadPrincipalStats();
    } catch (e) {
      setMsg(String(e));
    }
  }

  function openItStaffReplacement(item: AccountItem) {
    setItStaffReplacementTarget(item);
    setItStaffReplacementEmail("");
    setItStaffReplacementEmailTouched(false);
    setItStaffReplacementFullName("");
    setItStaffReplacementError("");
  }

  function closeItStaffReplacement() {
    if (isReplacingItStaff) return;
    setItStaffReplacementTarget(null);
  }

  async function replaceItStaff() {
    setItStaffReplacementEmailTouched(true);
    if (!itStaffReplacementTarget || emailError(itStaffReplacementEmail)) return;
    setItStaffReplacementError("");
    setIsReplacingItStaff(true);
    try {
      await api(authFetch, `/principal/it-staff/${itStaffReplacementTarget.id}/replacement`, {
        method: "POST",
        body: JSON.stringify({
          replacementEmail: itStaffReplacementEmail,
          fullName: itStaffReplacementFullName || null,
        }),
      });
      setItStaffReplacementTarget(null);
      setMsg("Đã thay IT Staff.");
      await loadItStaff(itStaffData?.page ?? 0);
      await loadPrincipalStats();
    } catch (e) {
      setItStaffReplacementError(String(e));
    } finally {
      setIsReplacingItStaff(false);
    }
  }

  async function confirmDisableAccount() {
    if (!disableAccountTarget) return;
    setDisablingAccount(true);
    try {
      if (disableAccountTarget.kind === "moderator") {
        await api(authFetch, `/principal/moderators/${disableAccountTarget.item.id}`, { method: "DELETE" });
        await loadModerators(moderatorData?.page ?? 0);
        await loadPrincipalStats();
      } else if (disableAccountTarget.kind === "teacher") {
        await api(authFetch, `/moderator/teachers/${disableAccountTarget.item.id}`, { method: "DELETE" });
        await loadTeachers(teacherData?.page ?? 0);
        await loadTeacherStats();
      } else {
        await api(authFetch, `/principal/it-staff/${disableAccountTarget.item.id}`, { method: "DELETE" });
        await loadItStaff(itStaffData?.page ?? 0);
        await loadPrincipalStats();
      }
      setMsg("Đã thu hồi.");
      setDisableAccountTarget(null);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setDisablingAccount(false);
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    ...(isPrincipal ? [{ key: "moderator" as Tab, label: "Moderator", icon: <Users className="size-4" aria-hidden /> }] : []),
    ...(isModerator ? [{ key: "teacher" as Tab, label: "Teacher", icon: <Users className="size-4" aria-hidden /> }] : []),
    ...(isPrincipal ? [{ key: "it-staff" as Tab, label: "IT Staff", icon: <ShieldCheck className="size-4" aria-hidden /> }] : []),
  ];

  const takenSubjects = new Set(
    (moderatorData?.content ?? []).filter((i) => i.status !== "DISABLED").map((i) => i.subject),
  );
  const moderatorStats = principalStats?.moderators;
  const itStaffStats = principalStats?.itStaff;
  const itStaffSeatOccupied = itStaffStats == null || itStaffStats.active > 0;
  const activeItStaff = (itStaffData?.content ?? []).filter((item) => item.status !== "DISABLED");

  return (
    <main className="min-h-screen bg-white text-[#1f1f1f]">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[#d8d1c9] bg-[#f7f5f2] px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-[#1f1f1f] transition hover:bg-[#edeae5]"
          aria-label="Mở menu chức năng"
        >
          <Menu className="size-4" aria-hidden />
        </button>
        <div className="ml-3 flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#1f1f1f] text-white">
            <DashboardIcon name="spark" className="size-3.5" />
          </span>
          EDUA
        </div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/25 md:hidden"
          aria-label="Đóng menu chức năng"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        <Sidebar responsive mobileOpen={mobileMenuOpen} activeHref="/user-management" />
        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d97757]">
                {isPrincipal ? "Hiệu trưởng" : "Người kiểm duyệt"}
              </p>
              <h1 className="font-libertine mt-3 text-4xl leading-none sm:text-5xl">Quản lý tài khoản</h1>
              <p className="mt-4 text-sm leading-6 text-[#6b6b6b]">
                {isPrincipal
                  ? "Cấp và thu hồi quyền truy cập cho Người Kiểm Duyệt từng môn và cho nhân viên IT Staff."
                  : "Cấp và thu hồi quyền truy cập cho Giáo Viên trong môn bạn phụ trách."}
              </p>
            </div>

            {msg && (
              <div className="mt-6 rounded-lg border border-[#d8d1c9] bg-white px-4 py-3 text-sm text-[#4f4943] shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                {msg}
              </div>
            )}

            {tabs.length > 1 && (
              <div className="mt-8 inline-flex rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                      activeTab === tab.key ? "bg-[#1f1f1f] text-white" : "text-[#5f5a54] hover:bg-[#edeae5]"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Moderator tab ── */}
            {isPrincipal && activeTab === "moderator" && (
              <div className="mt-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric
                    icon={<Users className="size-4" aria-hidden />}
                    label="Tổng số"
                    value={String(moderatorStats ? moderatorStats.active + moderatorStats.disabled : moderatorData?.totalElements ?? 0)}
                  />
                  <Metric
                    icon={<ShieldCheck className="size-4" aria-hidden />}
                    label="Đang hoạt động"
                    value={String(moderatorStats?.active ?? 0)}
                  />
                  <Metric
                    icon={<UserMinus className="size-4" aria-hidden />}
                    label="Đã thu hồi"
                    value={String(moderatorStats?.disabled ?? 0)}
                  />
                </div>

                <div className="mt-6 rounded-lg border border-[#d8d1c9] bg-white p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                  <h2 className="font-medium">Thêm Nguời Kiểm Duyệt</h2>
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <div className="min-w-48 flex-1">
                      <input
                        value={moderatorEmail}
                        onChange={(e) => setModeratorEmail(e.target.value)}
                        onBlur={() => setModeratorEmailTouched(true)}
                        placeholder="Email"
                        type="email"
                        required
                        maxLength={EMAIL_MAX_LENGTH}
                        aria-invalid={moderatorEmailTouched && !!emailError(moderatorEmail)}
                        className="w-full rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm outline-none focus:border-[#d97757]"
                      />
                      <EmailFieldError message={moderatorEmailTouched ? emailError(moderatorEmail) : null} />
                    </div>
                    <input
                      value={moderatorFullName}
                      onChange={(e) => setModeratorFullName(e.target.value)}
                      placeholder="Họ tên (không bắt buộc)"
                      className="min-w-40 flex-1 rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm outline-none focus:border-[#d97757]"
                    />
                    <select
                      value={moderatorSubject}
                      onChange={(e) => setModeratorSubject(e.target.value)}
                      className="rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm"
                      disabled={takenSubjects.size >= SUBJECTS.length}
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s} disabled={takenSubjects.has(s)}>
                          {SUBJECT_LABELS[s] ?? s}
                          {takenSubjects.has(s) ? " (đã có)" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addModerator}
                      disabled={!!emailError(moderatorEmail)}
                      className="rounded-lg bg-[#1f1f1f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#34312e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="mb-3 font-medium">Danh sách ({moderatorData?.totalElements ?? 0})</h2>
                  {(moderatorData?.content.length ?? 0) === 0 ? (
                    <p className="rounded-lg border border-[#d8d1c9] bg-white p-6 text-sm text-[#6b6b6b]">Chưa có Moderator.</p>
                  ) : (
                    <div className="space-y-2">
                      {moderatorData!.content.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d8d1c9] bg-white p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                          <div>
                            <div className="flex items-center gap-2 font-medium text-[#1f1f1f]">
                              <AccountName item={item} />
                              <StatusBadge status={item.status} />
                            </div>
                            <div className="mt-1 text-xs text-[#8a8178]">
                              {item.email} · Môn {SUBJECT_LABELS[item.subject] ?? item.subject}
                              {item.grantedByEmail ? ` · cấp bởi ${item.grantedByEmail}` : ""}
                            </div>
                          </div>
                          {item.status !== "DISABLED" ? (
                            <button
                              type="button"
                              onClick={() => openReplacement(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8d1c9] px-3 py-1.5 text-sm font-medium text-[#c2483c] transition hover:bg-[#fdeceb]"
                            >
                              <ArrowLeftRight className="size-4" aria-hidden /> Thay Moderator
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleModerator(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8d1c9] px-3 py-1.5 text-sm font-medium text-[#5a7a4a] transition hover:bg-[#eef6ec]"
                            >
                              <RotateCcw className="size-4" aria-hidden /> Kích hoạt lại
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {moderatorData && (
                    <Pager page={moderatorData.page} totalPages={moderatorData.totalPages} onChange={(p) => void loadModerators(p).catch((e) => setMsg(String(e)))} />
                  )}
                </div>
              </div>
            )}

            {/* ── Teacher tab ── */}
            {isModerator && activeTab === "teacher" && (
              <div className="mt-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric
                    icon={<Users className="size-4" aria-hidden />}
                    label="Tổng số"
                    value={String(teacherStats ? teacherStats.active + teacherStats.disabled : teacherData?.totalElements ?? 0)}
                  />
                  <Metric
                    icon={<ShieldCheck className="size-4" aria-hidden />}
                    label="Đang hoạt động"
                    value={String(teacherStats?.active ?? 0)}
                  />
                  <Metric
                    icon={<UserMinus className="size-4" aria-hidden />}
                    label="Đã thu hồi"
                    value={String(teacherStats?.disabled ?? 0)}
                  />
                </div>

                <div className="mt-6 rounded-lg border border-[#d8d1c9] bg-white p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                  <h2 className="font-medium">Thêm Giáo Viên </h2>
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <div className="min-w-48 flex-1">
                      <input
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        onBlur={() => setTeacherEmailTouched(true)}
                        placeholder="Email"
                        type="email"
                        required
                        maxLength={EMAIL_MAX_LENGTH}
                        aria-invalid={teacherEmailTouched && !!emailError(teacherEmail)}
                        className="w-full rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm outline-none focus:border-[#d97757]"
                      />
                      <EmailFieldError message={teacherEmailTouched ? emailError(teacherEmail) : null} />
                    </div>
                    <input
                      value={teacherFullName}
                      onChange={(e) => setTeacherFullName(e.target.value)}
                      placeholder="Họ tên (không bắt buộc)"
                      className="min-w-40 flex-1 rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm outline-none focus:border-[#d97757]"
                    />
                    <span className="rounded-lg bg-[#f5f1ec] px-3 py-2 text-sm text-[#6b6b6b]">
                      Môn: {SUBJECT_LABELS[user?.subject ?? ""] ?? user?.subject ?? "—"}
                    </span>
                    <GradeCheckboxes value={teacherGrades} onChange={setTeacherGrades} />
                    <button
                      disabled={teacherGrades.length === 0 || !!emailError(teacherEmail)}
                      onClick={addTeacher}
                      className="rounded-lg bg-[#1f1f1f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#34312e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="mb-3 font-medium">Danh sách ({teacherData?.totalElements ?? 0})</h2>
                  {(teacherData?.content.length ?? 0) === 0 ? (
                    <p className="rounded-lg border border-[#d8d1c9] bg-white p-6 text-sm text-[#6b6b6b]">Chưa có Teacher.</p>
                  ) : (
                    <div className="space-y-2">
                      {teacherData!.content.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d8d1c9] bg-white p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                          <div>
                            <div className="flex items-center gap-2 font-medium text-[#1f1f1f]">
                              <AccountName item={item} />
                              <StatusBadge status={item.status} />
                            </div>
                            <div className="mt-1 text-xs text-[#8a8178]">
                              {item.email} · Môn {SUBJECT_LABELS[item.subject] ?? item.subject}
                              {gradeText(item.grades)}
                              {item.grantedByEmail ? ` · cấp bởi ${item.grantedByEmail}` : ""}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleTeacher(item)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border border-[#d8d1c9] px-3 py-1.5 text-sm font-medium transition ${
                              item.status === "DISABLED" ? "text-[#5a7a4a] hover:bg-[#eef6ec]" : "text-[#c2483c] hover:bg-[#fdeceb]"
                            }`}
                          >
                            {item.status === "DISABLED" ? (
                              <>
                                <RotateCcw className="size-4" aria-hidden /> Kích hoạt lại
                              </>
                            ) : (
                              <>
                                <UserMinus className="size-4" aria-hidden /> Thu hồi
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {teacherData && (
                    <Pager page={teacherData.page} totalPages={teacherData.totalPages} onChange={(p) => void loadTeachers(p).catch((e) => setMsg(String(e)))} />
                  )}
                </div>
              </div>
            )}

            {/* ── IT Staff tab ── */}
            {isPrincipal && activeTab === "it-staff" && (
              <div className="mt-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric
                    icon={<Users className="size-4" aria-hidden />}
                    label="Tổng số"
                    value={String(itStaffStats ? itStaffStats.active + itStaffStats.disabled : itStaffData?.totalElements ?? 0)}
                  />
                  <Metric
                    icon={<ShieldCheck className="size-4" aria-hidden />}
                    label="Đang hoạt động"
                    value={String(itStaffStats?.active ?? 0)}
                  />
                  <Metric
                    icon={<UserMinus className="size-4" aria-hidden />}
                    label="Đã thu hồi"
                    value={String(itStaffStats?.disabled ?? 0)}
                  />
                </div>

                <div className="mt-6 rounded-lg border border-[#d8d1c9] bg-white p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                  <h2 className="font-medium">Cấp quyền IT Staff</h2>
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <div className="min-w-48 flex-1">
                      <input
                        value={itStaffEmail}
                        onChange={(e) => setItStaffEmail(e.target.value)}
                        onBlur={() => setItStaffEmailTouched(true)}
                        placeholder="Email"
                        type="email"
                        required
                        maxLength={EMAIL_MAX_LENGTH}
                        aria-invalid={itStaffEmailTouched && !!emailError(itStaffEmail)}
                        className="w-full rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm outline-none focus:border-[#d97757]"
                      />
                      <EmailFieldError message={itStaffEmailTouched ? emailError(itStaffEmail) : null} />
                    </div>
                    <input
                      value={itStaffFullName}
                      onChange={(e) => setItStaffFullName(e.target.value)}
                      placeholder="Họ tên (không bắt buộc)"
                      className="min-w-40 flex-1 rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm outline-none focus:border-[#d97757]"
                    />
                    <button
                      onClick={addItStaff}
                      disabled={itStaffSeatOccupied || !!emailError(itStaffEmail)}
                      className="rounded-lg bg-[#1f1f1f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#34312e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {itStaffSeatOccupied ? "Đã có IT Staff" : "Cấp quyền"}
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="mb-3 font-medium">Danh sách ({activeItStaff.length})</h2>
                  {activeItStaff.length === 0 ? (
                    <p className="rounded-lg border border-[#d8d1c9] bg-white p-6 text-sm text-[#6b6b6b]">Chưa có IT Staff.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeItStaff.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d8d1c9] bg-white p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                          <div>
                            <div className="flex items-center gap-2 font-medium text-[#1f1f1f]">
                              <AccountName item={item} />
                              <StatusBadge status={item.status} />
                            </div>
                            <div className="mt-1 text-xs text-[#8a8178]">{item.email}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openItStaffReplacement(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8d1c9] px-3 py-1.5 text-sm font-medium text-[#c2483c] transition hover:bg-[#fdeceb]"
                          >
                            <ArrowLeftRight className="size-4" aria-hidden /> Thay IT Staff
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                
                  {itStaffData && (
                    <Pager page={itStaffData.page} totalPages={itStaffData.totalPages} onChange={(p) => void loadItStaff(p).catch((e) => setMsg(String(e)))} />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {replacementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="replace-moderator-title">
            <h2 id="replace-moderator-title" className="text-lg font-semibold">
              Thay Moderator
            </h2>
            <p className="mt-2 text-sm text-[#6b6b6b]">
              {replacementTarget.fullName ?? replacementTarget.email} sẽ được chuyển thành Teacher.
            </p>
            <label className="mt-4 block text-sm font-medium" htmlFor="replacement-email">
              Email Moderator thay thế
            </label>
            <input
              id="replacement-email"
              type="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              value={replacementEmail}
              onChange={(e) => setReplacementEmail(e.target.value)}
              onBlur={() => setReplacementEmailTouched(true)}
              placeholder="Email"
              aria-invalid={replacementEmailTouched && !!emailError(replacementEmail)}
              className="mt-1 w-full rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm outline-none focus:border-[#d97757]"
              autoFocus
            />
            <EmailFieldError message={replacementEmailTouched ? emailError(replacementEmail) : null} />
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={disablePrevious} onChange={(e) => setDisablePrevious(e.target.checked)} />
              Vô hiệu hoá tài khoản Moderator cũ sau khi chuyển thành Teacher
            </label>
            {replacementError && (
              <p className="mt-4 rounded-lg border border-[#f3c6bd] bg-[#fdeceb] px-3 py-2 text-sm text-[#c2483c]">{replacementError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeReplacement} disabled={isReplacing} className="rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm">
                Huỷ
              </button>
              <button
                type="button"
                onClick={replaceModerator}
                disabled={isReplacing || !!emailError(replacementEmail)}
                className="rounded-lg bg-[#1f1f1f] px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReplacing ? "Đang thay..." : "Xác nhận thay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {itStaffReplacementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="replace-it-staff-title">
            <h2 id="replace-it-staff-title" className="text-lg font-semibold">
              Thay IT Staff
            </h2>
            <p className="mt-2 text-sm text-[#6b6b6b]">
              {itStaffReplacementTarget.fullName ?? itStaffReplacementTarget.email} sẽ bị thu hồi quyền IT Staff.
            </p>
            <label className="mt-4 block text-sm font-medium" htmlFor="it-staff-replacement-email">
              Email IT Staff thay thế
            </label>
            <input
              id="it-staff-replacement-email"
              type="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              value={itStaffReplacementEmail}
              onChange={(e) => setItStaffReplacementEmail(e.target.value)}
              onBlur={() => setItStaffReplacementEmailTouched(true)}
              placeholder="Email"
              aria-invalid={itStaffReplacementEmailTouched && !!emailError(itStaffReplacementEmail)}
              className="mt-1 w-full rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm outline-none focus:border-[#d97757]"
              autoFocus
            />
            <EmailFieldError message={itStaffReplacementEmailTouched ? emailError(itStaffReplacementEmail) : null} />
            <label className="mt-4 block text-sm font-medium" htmlFor="it-staff-replacement-full-name">
              Họ tên
            </label>
            <input
              id="it-staff-replacement-full-name"
              value={itStaffReplacementFullName}
              onChange={(e) => setItStaffReplacementFullName(e.target.value)}
              placeholder="Không bắt buộc"
              className="mt-1 w-full rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm outline-none focus:border-[#d97757]"
            />
            {itStaffReplacementError && (
              <p className="mt-4 rounded-lg border border-[#f3c6bd] bg-[#fdeceb] px-3 py-2 text-sm text-[#c2483c]">{itStaffReplacementError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeItStaffReplacement} disabled={isReplacingItStaff} className="rounded-lg border border-[#d8d1c9] px-3 py-2 text-sm">
                Huỷ
              </button>
              <button
                type="button"
                onClick={replaceItStaff}
                disabled={isReplacingItStaff || !!emailError(itStaffReplacementEmail)}
                className="rounded-lg bg-[#1f1f1f] px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReplacingItStaff ? "Đang thay..." : "Xác nhận thay"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={disableAccountTarget !== null}
        onClose={() => setDisableAccountTarget(null)}
        onConfirm={() => void confirmDisableAccount()}
        loading={disablingAccount}
        title="Thu hồi quyền truy cập?"
        description={
          <>
            Tài khoản <span className="font-semibold text-[#1f1f1f]">{disableAccountTarget?.item.fullName ?? disableAccountTarget?.item.email}</span> sẽ bị thu hồi quyền truy cập hiện tại.
          </>
        }
        confirmLabel="Thu hồi"
        variant="danger"
      />
    </main>
  );
}

export default function UserManagementPage() {
  return (
    <RouteGuard pathname="/user-management">
      <UserManagementContent />
    </RouteGuard>
  );
}
