"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  type ClassStatus,
  type ClassSubject,
  type ClassSummary,
  createClass,
  isClassSubject,
  listClasses,
  statusLabel,
  subjectLabel,
  updateClassStatus,
} from "@/lib/classroom";

const GRADES = [10, 11, 12] as const;
const MAX_CLASS_NAME_LENGTH = 255;
const MAX_CLASS_DESCRIPTION_LENGTH = 2000;

type StatusFilter = ClassStatus | "";

type FormState = {
  name: string;
  subject: ClassSubject;
  grade: number;
  description: string;
};

const emptyForm = (subject: ClassSubject): FormState => ({
  name: "",
  subject,
  grade: 10,
  description: "",
});

function statusClasses(status: ClassStatus): string {
  return status === "ACTIVE"
    ? "border-[#b7e0c4] bg-[#f0faf3] text-[#287447]"
    : "border-[#e6d8cb] bg-[#f8f2ec] text-[#8a5a35]";
}

function ClassCard({
  item,
  onOpen,
  onToggleStatus,
  statusBusy,
}: {
  item: ClassSummary;
  onOpen: (id: string) => void;
  onToggleStatus: (item: ClassSummary) => void;
  statusBusy: boolean;
}) {
  const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const bannerClasses = item.subject === "MATH"
    ? "from-[#315b4a] via-[#4b8065] to-[#93bd8a]"
    : item.subject === "PHYSICS"
      ? "from-[#293d77] via-[#536bac] to-[#9eb6e8]"
      : "from-[#87552d] via-[#c78743] to-[#efd28d]";

  return (
    <article className="group min-h-[250px] overflow-hidden rounded-2xl border border-[#ded8d0] bg-white shadow-[0_2px_5px_rgba(56,40,28,0.05)] transition duration-200 hover:-translate-y-1 hover:border-[#c9a998] hover:shadow-[0_14px_30px_rgba(80,58,43,0.14)]">
      <div className={`flex h-[112px] flex-col justify-between bg-gradient-to-br p-4 text-white ${bannerClasses}`}>
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
            {subjectLabel(item.subject)}
          </span>
          <button
            type="button"
            title={nextStatus === "INACTIVE" ? "Lưu trữ lớp" : "Kích hoạt lại lớp"}
            disabled={statusBusy}
            onClick={() => onToggleStatus(item)}
            className="group/tooltip relative flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/10 text-white transition hover:bg-black/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {statusBusy ? <Loader2 className="size-4 animate-spin" /> : nextStatus === "INACTIVE" ? <Archive className="size-4" /> : <RefreshCw className="size-4" />}
            <span role="tooltip" className="pointer-events-none absolute right-0 top-10 z-20 whitespace-nowrap rounded-md bg-[#2b2926] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100">
              {nextStatus === "INACTIVE" ? "Lưu trữ lớp" : "Kích hoạt lại lớp"}
            </span>
          </button>
        </div>
        <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 text-left">
          <h3 className="truncate text-[18px] font-semibold tracking-[-0.01em]">{item.name}</h3>
        </button>
      </div>
      <div className="flex min-h-[138px] flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(item.status)}`}>
            {statusLabel(item.status)}
          </span>
          <span className="text-[12px] text-[#7a736b]">Khối {item.grade}</span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#ede8e1] pt-3">
          <div className="flex items-center gap-1.5 text-[12px] text-[#6b6b6b]">
            <Users className="size-3.5" />
            <span>{item.memberCount} thành viên</span>
          </div>
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#9a5a3b] transition group-hover:text-[#6e3c26]"
          >
            Mở lớp <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ClassManagementPage({ view = "create" }: { view?: "create" | "list" }) {
  const { user, status, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultSubject = isClassSubject(user?.subject) ? user.subject : "CHEMISTRY";
  const createFormRef = useRef<HTMLFormElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(view === "create" || searchParams.get("create") === "1");
  const [items, setItems] = useState<ClassSummary[]>([]);
  const [createForm, setCreateForm] = useState<FormState>(() => emptyForm(defaultSubject));
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const subjectFilter = isClassSubject(user?.subject) ? user.subject : "";
  const [gradeFilter, setGradeFilter] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [busyStatusId, setBusyStatusId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(() => items.filter((item) => item.status === "ACTIVE").length, [items]);
  const inactiveCount = items.length - activeCount;
  const isInitialLoading = loading && items.length === 0;
  const allowedGrades = useMemo(
    () => (user?.grades ?? []).filter((grade): grade is number => GRADES.includes(grade as (typeof GRADES)[number])),
    [user?.grades],
  );

  const loadClasses = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    setError("");
    try {
      const result = await listClasses(authFetch, {
        q,
        subject: subjectFilter,
        grade: gradeFilter,
        status: statusFilter,
        size: 50,
      });
      setItems(result.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách lớp.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, gradeFilter, q, status, statusFilter, subjectFilter]);

  useEffect(() => {
    if (view !== "list") return;
    const timer = window.setTimeout(() => {
      void loadClasses();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadClasses, view]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCreateForm((current) => ({
      ...current,
      subject: defaultSubject,
      grade: allowedGrades.includes(current.grade) ? current.grade : (allowedGrades[0] ?? current.grade),
    }));
  }, [allowedGrades, defaultSubject]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    if (!createForm.name.trim()) {
      setError("Tên lớp là trường bắt buộc.");
      return;
    }
    if (createForm.name.length > MAX_CLASS_NAME_LENGTH) {
      setError(`Tên lớp không được vượt quá ${MAX_CLASS_NAME_LENGTH} ký tự.`);
      return;
    }
    if (createForm.description.length > MAX_CLASS_DESCRIPTION_LENGTH) {
      setError(`Mô tả không được vượt quá ${MAX_CLASS_DESCRIPTION_LENGTH} ký tự.`);
      return;
    }
    if (!allowedGrades.includes(createForm.grade)) {
      setError("Bạn chỉ được tạo lớp thuộc khối mình phụ trách.");
      return;
    }
    if (!isClassSubject(user?.subject) || createForm.subject !== user.subject) {
      setError("Bạn chỉ được tạo lớp thuộc chuyên ngành của mình.");
      return;
    }
    setError("");
    setConfirmCreate(true);
  }

  async function confirmCreateClass() {
    if (creating || !isClassSubject(user?.subject) || createForm.subject !== user.subject || !allowedGrades.includes(createForm.grade)) return;
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const created = await createClass(authFetch, {
        name: createForm.name.trim(),
        subject: createForm.subject,
        grade: createForm.grade,
        description: createForm.description.trim() || null,
      });
      setConfirmCreate(false);
      setMessage(`Đã tạo lớp ${created.name}.`);
      router.push(`/class-detail?classId=${created.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo lớp.");
    } finally {
      setCreating(false);
    }
  }

  function openDetail(id: string) {
    router.push(`/class-detail?classId=${id}`);
  }

  function openCreateForm() {
    if (view === "list") {
      setCreateOpen(true);
      return;
    }
    createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    createFormRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }

  const closeCreateForm = useCallback(() => {
    setCreateOpen(false);
    setConfirmCreate(false);
    if (view === "list" && searchParams.get("create") === "1") {
      router.replace("/list-class", { scroll: false });
    }
  }, [router, searchParams, view]);

  useEffect(() => {
    if (view !== "list" || !createOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCreateForm();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeCreateForm, createOpen, view]);

  async function toggleStatus(item: Pick<ClassSummary, "id" | "status">) {
    const nextStatus: ClassStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyStatusId(item.id);
    setError("");
    setMessage("");
    try {
      await updateClassStatus(authFetch, item.id, nextStatus);
      setMessage(nextStatus === "INACTIVE" ? "Lớp đã chuyển sang chế độ chỉ đọc." : "Lớp đã được kích hoạt lại.");
      await loadClasses();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đổi trạng thái lớp.");
    } finally {
      setBusyStatusId(null);
    }
  }

  if (!user) return null;

  const allowedSubjects = isClassSubject(user.subject) ? [user.subject] : [];
  const canCreateClass = allowedSubjects.length > 0 && allowedGrades.length > 0;
  const createNameError = createForm.name.length > MAX_CLASS_NAME_LENGTH
    ? `Tên lớp không được vượt quá ${MAX_CLASS_NAME_LENGTH} ký tự.`
    : "";
  const createDescriptionError = createForm.description.length > MAX_CLASS_DESCRIPTION_LENGTH
    ? `Mô tả không được vượt quá ${MAX_CLASS_DESCRIPTION_LENGTH} ký tự.`
    : "";

  const createFormElement = (
    <form ref={createFormRef} onSubmit={handleCreate} className="rounded-[14px] border border-[#d8d1c9] bg-white p-5">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
        <Plus className="size-4 text-[#d97757]" /> Lớp mới
      </div>

      <label className="mt-5 block text-[12px] font-medium text-[#6b6b6b]">
        Tên lớp <span className="text-[#c0492b]" aria-label="Bắt buộc">*</span>
        <input
          value={createForm.name}
          onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
          required
          placeholder="Ví dụ: 10A1 - Hóa học"
          aria-invalid={Boolean(createNameError)}
          aria-describedby={createNameError ? "create-class-name-error" : undefined}
          className={`mt-2 h-11 w-full rounded-lg border bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757] ${createNameError ? "border-[#c0492b]" : "border-[#d8d1c9]"}`}
        />
        {createNameError && <span id="create-class-name-error" className="mt-1.5 block text-[12px] text-[#c0492b]" role="alert">{createNameError}</span>}
      </label>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block text-[12px] font-medium text-[#6b6b6b]">
          Môn học <span className="text-[#c0492b]" aria-label="Bắt buộc">*</span>
          <div className="mt-2 flex h-11 items-center rounded-lg border border-[#d8d1c9] bg-[#f3f0ec] px-3 text-[13px] text-[#4f4943]">
            {allowedSubjects[0] ? subjectLabel(allowedSubjects[0]) : "Chưa thiết lập"}
          </div>
        </label>
        <label className="block text-[12px] font-medium text-[#6b6b6b]">
          Khối <span className="text-[#c0492b]" aria-label="Bắt buộc">*</span>
          <select
            value={createForm.grade}
            onChange={(event) => setCreateForm((current) => ({ ...current, grade: Number(event.target.value) }))}
            className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition focus:border-[#d97757]"
            required
          >
            {allowedGrades.length > 0 ? (
              allowedGrades.map((grade) => <option key={grade} value={grade}>Khối {grade}</option>)
            ) : (
              <option value={createForm.grade}>Chưa được phân công khối</option>
            )}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-[12px] font-medium text-[#6b6b6b]">
        Mô tả
        <textarea
          value={createForm.description}
          onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
          rows={5}
          placeholder="Mục tiêu, ghi chú hoặc quy ước lớp..."
          aria-invalid={Boolean(createDescriptionError)}
          aria-describedby={createDescriptionError ? "create-class-description-error" : undefined}
          className={`mt-2 w-full resize-none rounded-lg border bg-[#faf9f7] px-3 py-2.5 text-[13px] leading-5 text-[#1f1f1f] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757] ${createDescriptionError ? "border-[#c0492b]" : "border-[#d8d1c9]"}`}
        />
        {createDescriptionError && <span id="create-class-description-error" className="mt-1.5 block text-[12px] text-[#c0492b]" role="alert">{createDescriptionError}</span>}
      </label>

      <div className="mt-5 flex gap-2">
        {view === "list" && (
          <button
            type="button"
            onClick={closeCreateForm}
            disabled={creating}
            className="h-11 flex-1 rounded-[11px] border border-[#d8d1c9] px-5 text-[13px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={creating || !createForm.name.trim() || !canCreateClass || Boolean(createNameError) || Boolean(createDescriptionError)}
          className="h-11 flex-1 items-center justify-center gap-2 rounded-[11px] bg-[#d97757] px-5 text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(217,119,87,0.25)] transition hover:bg-[#c96545] disabled:cursor-not-allowed disabled:bg-[#e8b9a7]"
        >
          <span className="flex items-center justify-center gap-2">
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {creating ? "Đang tạo..." : "Tạo lớp"}
          </span>
        </button>
      </div>
      {allowedSubjects.length === 0 && <p className="mt-3 text-[12px] text-[#c0492b]">Tài khoản chưa có chuyên ngành nên chưa thể tạo lớp.</p>}
      {allowedGrades.length === 0 && <p className="mt-3 text-[12px] text-[#c0492b]">Tài khoản chưa được phân công khối nên chưa thể tạo lớp.</p>}
    </form>
  );

  return (
    <main className="min-h-screen bg-white text-[#1f1f1f]">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[#d8d1c9] bg-[#f7f5f2] px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="group/tooltip relative inline-flex size-9 items-center justify-center rounded-lg text-[#1f1f1f] transition hover:bg-[#edeae5]"
          aria-label="Mở menu chức năng"
          title="Mở menu chức năng"
        >
          <span className="flex w-4 flex-col gap-1" aria-hidden>
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
          </span>
          <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-[70] mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2b2926] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100">Mở menu chức năng</span>
        </button>
        <div className="ml-3 flex items-center gap-2 text-sm font-semibold">EDUA</div>
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
        <Sidebar activeHref={view === "list" ? "/list-class" : "/create-class"} responsive mobileOpen={mobileMenuOpen} />

        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1220px]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#cdd7ef] bg-[#f1f4ff] px-3 text-[11px] font-medium text-[#3f54a3]">
                  <BookOpen className="size-3.5" /> Quản lý lớp học
                </div>
                <h1 className="font-libertine mt-4 text-[44px] font-normal leading-none sm:text-[60px]">
                  {view === "list" ? "Lớp học" : "Tạo lớp học"}
                </h1>
                <p className="mt-4 max-w-[620px] text-[13px] leading-[23px] text-[#6b6b6b]">
                  {view === "list"
                    ? "Quản lý các lớp bạn phụ trách."
                    : "Tạo không gian lớp để quản lý thông tin, thành viên và tài nguyên học tập."}
                </p>
              </div>

              {view === "list" && (
                <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
                  <div className="rounded-[14px] border border-[#d8d1c9] bg-white px-4 py-3">
                    <p className="text-[11px] text-[#6b6b6b]">Tổng lớp</p>
                    <p className="mt-1 text-xl font-semibold">{items.length}</p>
                  </div>
                  <div className="rounded-[14px] border border-[#b7e0c4] bg-[#f0faf3] px-4 py-3">
                    <p className="text-[11px] text-[#287447]">Đang hoạt động</p>
                    <p className="mt-1 text-xl font-semibold text-[#287447]">{activeCount}</p>
                  </div>
                  <div className="rounded-[14px] border border-[#e6d8cb] bg-[#f8f2ec] px-4 py-3">
                    <p className="text-[11px] text-[#8a5a35]">Đã lưu trữ</p>
                    <p className="mt-1 text-xl font-semibold text-[#8a5a35]">{inactiveCount}</p>
                  </div>
                </div>
              )}
            </div>

            {(error || message) && (
              <div className={`mt-6 flex items-start gap-2 rounded-[12px] border px-4 py-3 text-[13px] ${
                error ? "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]" : "border-[#bfdcc8] bg-[#f1faf3] text-[#287447]"
              }`}>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>{error || message}</span>
              </div>
            )}

            <div className={`mt-8 grid gap-6 ${view === "create" ? "max-w-[560px]" : ""}`}>
              {view === "create" ? createFormElement : null}

              <div className={view === "list" ? "min-w-0 space-y-6" : "hidden"}>
                <section className="min-w-0 rounded-[14px] border border-[#d8d1c9] bg-[#faf9f7] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-[16px] font-semibold">Lớp của tôi</h2>
                      <p className="mt-1 text-[12px] text-[#6b6b6b]">Danh sách lớp do bạn sở hữu.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadClasses()}
                      className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-3 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
                    >
                      <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_140px]">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a837b]" />
                      <input
                        value={q}
                        onChange={(event) => setQ(event.target.value)}
                        placeholder="Tìm tên hoặc mô tả lớp..."
                        className="h-10 w-full rounded-lg border border-[#d8d1c9] bg-white pl-9 pr-3 text-[13px] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]"
                      />
                    </label>
                    <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value ? Number(event.target.value) : "")} className="h-10 rounded-lg border border-[#d8d1c9] bg-white px-3 text-[13px] outline-none focus:border-[#d97757]">
                      <option value="">Tất cả khối</option>
                      {GRADES.map((grade) => <option key={grade} value={grade}>Khối {grade}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-10 rounded-lg border border-[#d8d1c9] bg-white px-3 text-[13px] outline-none focus:border-[#d97757]">
                      <option value="">Tất cả trạng thái</option>
                      <option value="ACTIVE">Đang hoạt động</option>
                      <option value="INACTIVE">Đã lưu trữ</option>
                    </select>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {!isInitialLoading && (
                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#c9a998] bg-[#fffdfb] px-5 py-10 text-center text-[#8a5a35] transition hover:-translate-y-1 hover:border-[#d97757] hover:bg-[#fff8f5] hover:shadow-[0_14px_30px_rgba(80,58,43,0.10)]"
                      >
                        <Plus className="size-8" />
                        <p className="mt-3 text-[13px] font-semibold">Tạo lớp mới</p>
                        <p className="mt-1 text-[12px] text-[#6b6b6b]">Thêm một lớp mới để quản lý.</p>
                      </button>
                    )}
                    {isInitialLoading ? (
                      [1, 2, 3].map((item) => <div key={item} className="h-[250px] animate-pulse rounded-2xl bg-[#e8e2db]" />)
                    ) : items.length === 0 ? (
                      <div className="rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-10 text-center">
                        <BookOpen className="mx-auto size-8 text-[#a8a097]" />
                        <p className="mt-3 text-[13px] font-medium">Chưa có lớp phù hợp</p>
                        <p className="mt-1 text-[12px] text-[#6b6b6b]">Tạo lớp mới hoặc thay đổi bộ lọc hiện tại.</p>
                      </div>
                    ) : (
                      items.map((item) => (
                        <ClassCard
                          key={item.id}
                          item={item}
                          onOpen={openDetail}
                          onToggleStatus={(classItem) => void toggleStatus(classItem)}
                          statusBusy={busyStatusId === item.id}
                        />
                      ))
                    )}
                  </div>
                  {loading && items.length > 0 && (
                    <p className="mt-3 text-[12px] text-[#8a837b]">Đang cập nhật danh sách...</p>
                  )}
                </section>
              </div>
            </div>

            {view === "list" && createOpen && (
              <div
                className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-class-title"
                onClick={closeCreateForm}
              >
                <div
                  className="max-h-[calc(100vh-2rem)] w-full max-w-[560px] overflow-y-auto rounded-[18px] bg-[#f7f5f2] p-5 shadow-2xl sm:p-6"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 id="create-class-title" className="font-libertine text-[30px] font-normal">Tạo lớp học</h2>
                      <p className="mt-1 text-[13px] text-[#6b6b6b]">Tạo không gian để quản lý học sinh và tài nguyên học tập.</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeCreateForm}
                      disabled={creating}
                      aria-label="Đóng form tạo lớp"
                      title="Đóng form tạo lớp"
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#d8d1c9] bg-white text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {createFormElement}
                </div>
              </div>
            )}
            {confirmCreate && (
              <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-create-class-title">
                <div className="w-full max-w-md rounded-[14px] border border-[#d8d1c9] bg-white p-5 shadow-xl">
                  <h2 id="confirm-create-class-title" className="text-[18px] font-semibold">Tạo lớp học?</h2>
                  <p className="mt-2 text-[13px] leading-6 text-[#6b6b6b]">Lớp <strong>{createForm.name.trim()}</strong> sẽ được tạo với môn {subjectLabel(createForm.subject)} và khối {createForm.grade}.</p>
                  <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => setConfirmCreate(false)} disabled={creating} className="h-9 rounded-[10px] border border-[#d8d1c9] px-3 text-[12px] font-medium disabled:opacity-50">Hủy</button>
                    <button type="button" onClick={() => void confirmCreateClass()} disabled={creating} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#d97757] px-3 text-[12px] font-medium text-white disabled:opacity-50">{creating && <Loader2 className="size-3.5 animate-spin" />} Xác nhận tạo lớp</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
