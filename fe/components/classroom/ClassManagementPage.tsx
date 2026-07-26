"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  CLASS_SUBJECTS,
  type ClassDetail,
  type ClassStatus,
  type ClassSubject,
  type ClassSummary,
  createClass,
  getClassDetail,
  isClassSubject,
  listClasses,
  statusLabel,
  subjectLabel,
  updateClass,
  updateClassStatus,
} from "@/lib/classroom";

const GRADES = [10, 11, 12] as const;

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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClasses(status: ClassStatus): string {
  return status === "ACTIVE"
    ? "border-[#b7e0c4] bg-[#f0faf3] text-[#287447]"
    : "border-[#e6d8cb] bg-[#f8f2ec] text-[#8a5a35]";
}

function subjectClasses(subject: ClassSubject): string {
  if (subject === "MATH") return "border-[#b7e0c4] bg-[#f0faf3] text-[#287447]";
  if (subject === "PHYSICS") return "border-[#c9d5ff] bg-[#f1f4ff] text-[#3f54a3]";
  return "border-[#f0d9aa] bg-[#fff7df] text-[#9a661c]";
}

function updateFormFromDetail(detail: ClassDetail): FormState {
  return {
    name: detail.name,
    subject: detail.subject,
    grade: detail.grade,
    description: detail.description ?? "",
  };
}

function ClassCard({
  item,
  active,
  onOpen,
  onToggleStatus,
  statusBusy,
}: {
  item: ClassSummary;
  active: boolean;
  onOpen: (id: string) => void;
  onToggleStatus: (item: ClassSummary) => void;
  statusBusy: boolean;
}) {
  const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  return (
    <article
      className={`rounded-[14px] border bg-white p-4 transition ${
        active ? "border-[#d97757] shadow-[0_10px_24px_rgba(217,119,87,0.12)]" : "border-[#d8d1c9] hover:border-[#c9a998]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${subjectClasses(item.subject)}`}>
              {subjectLabel(item.subject)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(item.status)}`}>
              {statusLabel(item.status)}
            </span>
          </div>
          <h3 className="mt-3 truncate text-[15px] font-semibold text-[#1f1f1f]">{item.name}</h3>
          <p className="mt-1 text-[12px] text-[#6b6b6b]">Khối {item.grade} · cập nhật {formatDateTime(item.updatedAt)}</p>
        </button>
        <button
          type="button"
          title={nextStatus === "INACTIVE" ? "Lưu trữ lớp" : "Kích hoạt lại lớp"}
          disabled={statusBusy}
          onClick={() => onToggleStatus(item)}
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#d8d1c9] text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {statusBusy ? <Loader2 className="size-4 animate-spin" /> : nextStatus === "INACTIVE" ? <Archive className="size-4" /> : <RefreshCw className="size-4" />}
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-[#ede8e1] pt-3 text-[12px] text-[#6b6b6b]">
        <Users className="size-3.5" />
        <span>{item.memberCount} thành viên</span>
      </div>
    </article>
  );
}

export function ClassManagementPage() {
  const { user, status, authFetch } = useAuth();
  const defaultSubject = isClassSubject(user?.subject) ? user.subject : "CHEMISTRY";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [items, setItems] = useState<ClassSummary[]>([]);
  const [selected, setSelected] = useState<ClassDetail | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(() => emptyForm(defaultSubject));
  const [editForm, setEditForm] = useState<FormState>(() => emptyForm(defaultSubject));
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [subjectFilter, setSubjectFilter] = useState<ClassSubject | "">("");
  const [gradeFilter, setGradeFilter] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyStatusId, setBusyStatusId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(() => items.filter((item) => item.status === "ACTIVE").length, [items]);
  const inactiveCount = items.length - activeCount;
  const isInitialLoading = loading && items.length === 0;

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
      if (selected && !result.items.some((item) => item.id === selected.id)) {
        setSelected(null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách lớp.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, gradeFilter, q, selected, status, statusFilter, subjectFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClasses();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadClasses]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
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
      setCreateForm(emptyForm(createForm.subject));
      setSelected(created);
      setEditForm(updateFormFromDetail(created));
      setMessage(`Đã tạo lớp ${created.name}.`);
      await loadClasses();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo lớp.");
    } finally {
      setCreating(false);
    }
  }

  async function openDetail(id: string) {
    setError("");
    setMessage("");
    try {
      const detail = await getClassDetail(authFetch, id);
      setSelected(detail);
      setEditForm(updateFormFromDetail(detail));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể mở lớp.");
    }
  }

  async function handleSaveDetail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || saving || selected.status === "INACTIVE") return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateClass(authFetch, selected.id, {
        name: editForm.name.trim(),
        subject: editForm.subject,
        grade: editForm.grade,
        description: editForm.description.trim() || null,
      });
      setSelected(updated);
      setEditForm(updateFormFromDetail(updated));
      setMessage("Đã lưu thay đổi lớp.");
      await loadClasses();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu lớp.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: Pick<ClassSummary, "id" | "status">) {
    const nextStatus: ClassStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyStatusId(item.id);
    setError("");
    setMessage("");
    try {
      const updated = await updateClassStatus(authFetch, item.id, nextStatus);
      setSelected((current) => (current?.id === updated.id ? updated : current));
      if (selected?.id === updated.id) setEditForm(updateFormFromDetail(updated));
      setMessage(nextStatus === "INACTIVE" ? "Lớp đã chuyển sang chế độ chỉ đọc." : "Lớp đã được kích hoạt lại.");
      await loadClasses();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đổi trạng thái lớp.");
    } finally {
      setBusyStatusId(null);
    }
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#f5f1ec] text-[#1f1f1f]">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[#d8d1c9] bg-[#f7f5f2] px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-[#1f1f1f] transition hover:bg-[#edeae5]"
          aria-label="Mở menu chức năng"
        >
          <span className="flex w-4 flex-col gap-1" aria-hidden>
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
          </span>
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
        <Sidebar activeHref="/create-class" responsive mobileOpen={mobileMenuOpen} />

        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1220px]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#cdd7ef] bg-[#f1f4ff] px-3 text-[11px] font-medium text-[#3f54a3]">
                  <BookOpen className="size-3.5" /> Class Hub
                </div>
                <h1 className="font-libertine mt-4 text-[44px] font-normal leading-none sm:text-[60px]">Tạo lớp học</h1>
                <p className="mt-4 max-w-[620px] text-[13px] leading-[23px] text-[#6b6b6b]">
                  Tạo không gian lớp để quản lý thông tin, thành viên và tài nguyên học tập theo cấu trúc Class Hub.
                </p>
              </div>

              <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
                <div className="rounded-[14px] border border-[#d8d1c9] bg-white px-4 py-3">
                  <p className="text-[11px] text-[#6b6b6b]">Tổng lớp</p>
                  <p className="mt-1 text-xl font-semibold">{items.length}</p>
                </div>
                <div className="rounded-[14px] border border-[#b7e0c4] bg-[#f0faf3] px-4 py-3">
                  <p className="text-[11px] text-[#287447]">Active</p>
                  <p className="mt-1 text-xl font-semibold text-[#287447]">{activeCount}</p>
                </div>
                <div className="rounded-[14px] border border-[#e6d8cb] bg-[#f8f2ec] px-4 py-3">
                  <p className="text-[11px] text-[#8a5a35]">Inactive</p>
                  <p className="mt-1 text-xl font-semibold text-[#8a5a35]">{inactiveCount}</p>
                </div>
              </div>
            </div>

            {(error || message) && (
              <div className={`mt-6 flex items-start gap-2 rounded-[12px] border px-4 py-3 text-[13px] ${
                error ? "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]" : "border-[#bfdcc8] bg-[#f1faf3] text-[#287447]"
              }`}>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>{error || message}</span>
              </div>
            )}

            <div className="mt-8 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <form onSubmit={handleCreate} className="rounded-[14px] border border-[#d8d1c9] bg-white p-5">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                  <Plus className="size-4 text-[#d97757]" /> Lớp mới
                </div>

                <label className="mt-5 block text-[12px] font-medium text-[#6b6b6b]">
                  Tên lớp
                  <input
                    value={createForm.name}
                    onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                    maxLength={255}
                    placeholder="Ví dụ: 10A1 - Hóa học"
                    className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]"
                  />
                </label>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="block text-[12px] font-medium text-[#6b6b6b]">
                    Môn học
                    <select
                      value={createForm.subject}
                      onChange={(event) => setCreateForm((current) => ({ ...current, subject: event.target.value as ClassSubject }))}
                      className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition focus:border-[#d97757]"
                    >
                      {CLASS_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subjectLabel(subject)}</option>)}
                    </select>
                  </label>
                  <label className="block text-[12px] font-medium text-[#6b6b6b]">
                    Khối
                    <select
                      value={createForm.grade}
                      onChange={(event) => setCreateForm((current) => ({ ...current, grade: Number(event.target.value) }))}
                      className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition focus:border-[#d97757]"
                    >
                      {GRADES.map((grade) => <option key={grade} value={grade}>Khối {grade}</option>)}
                    </select>
                  </label>
                </div>

                <label className="mt-4 block text-[12px] font-medium text-[#6b6b6b]">
                  Mô tả
                  <textarea
                    value={createForm.description}
                    onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
                    maxLength={2000}
                    rows={5}
                    placeholder="Mục tiêu, ghi chú hoặc quy ước lớp..."
                    className="mt-2 w-full resize-none rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 py-2.5 text-[13px] leading-5 text-[#1f1f1f] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={creating || !createForm.name.trim()}
                  className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[#d97757] px-5 text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(217,119,87,0.25)] transition hover:bg-[#c96545] disabled:cursor-not-allowed disabled:bg-[#e8b9a7]"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  {creating ? "Đang tạo..." : "Tạo lớp"}
                </button>
              </form>

              <div className="min-w-0 space-y-6">
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

                  <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_140px_140px]">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a837b]" />
                      <input
                        value={q}
                        onChange={(event) => setQ(event.target.value)}
                        placeholder="Tìm tên hoặc mô tả lớp..."
                        className="h-10 w-full rounded-lg border border-[#d8d1c9] bg-white pl-9 pr-3 text-[13px] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]"
                      />
                    </label>
                    <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value as ClassSubject | "")} className="h-10 rounded-lg border border-[#d8d1c9] bg-white px-3 text-[13px] outline-none focus:border-[#d97757]">
                      <option value="">Tất cả môn</option>
                      {CLASS_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subjectLabel(subject)}</option>)}
                    </select>
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

                  <div className="mt-5 grid gap-3">
                    {isInitialLoading ? (
                      [1, 2, 3].map((item) => <div key={item} className="h-[138px] animate-pulse rounded-[14px] bg-[#e8e2db]" />)
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
                          active={selected?.id === item.id}
                          onOpen={(id) => void openDetail(id)}
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

                {selected && (
                  <aside className="rounded-[14px] border border-[#d8d1c9] bg-white p-5">
                    <form onSubmit={handleSaveDetail}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">Chi tiết lớp</p>
                          <p className="mt-1 text-[12px] text-[#8a837b]">Chủ lớp: {selected.ownerName ?? "Giáo viên"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(selected.status)}`}>
                          {statusLabel(selected.status)}
                        </span>
                      </div>

                      <label className="mt-5 block text-[12px] font-medium text-[#6b6b6b]">
                        Tên lớp
                        <input
                          value={editForm.name}
                          disabled={selected.status === "INACTIVE"}
                          onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                          className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none transition disabled:text-[#8a837b] focus:border-[#d97757]"
                        />
                      </label>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <label className="block text-[12px] font-medium text-[#6b6b6b]">
                          Môn
                          <select
                            value={editForm.subject}
                            disabled={selected.status === "INACTIVE"}
                            onChange={(event) => setEditForm((current) => ({ ...current, subject: event.target.value as ClassSubject }))}
                            className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none disabled:text-[#8a837b] focus:border-[#d97757]"
                          >
                            {CLASS_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subjectLabel(subject)}</option>)}
                          </select>
                        </label>
                        <label className="block text-[12px] font-medium text-[#6b6b6b]">
                          Khối
                          <select
                            value={editForm.grade}
                            disabled={selected.status === "INACTIVE"}
                            onChange={(event) => setEditForm((current) => ({ ...current, grade: Number(event.target.value) }))}
                            className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none disabled:text-[#8a837b] focus:border-[#d97757]"
                          >
                            {GRADES.map((grade) => <option key={grade} value={grade}>Khối {grade}</option>)}
                          </select>
                        </label>
                      </div>

                      <label className="mt-4 block text-[12px] font-medium text-[#6b6b6b]">
                        Mô tả
                        <textarea
                          value={editForm.description}
                          disabled={selected.status === "INACTIVE"}
                          rows={5}
                          onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                          className="mt-2 w-full resize-none rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 py-2.5 text-[13px] leading-5 outline-none disabled:text-[#8a837b] focus:border-[#d97757]"
                        />
                      </label>

                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded-[12px] bg-[#f7f5f2] p-3">
                          <p className="text-[11px] text-[#6b6b6b]">Thành viên</p>
                          <p className="mt-1 text-lg font-semibold">{selected.memberCount}</p>
                        </div>
                        <div className="rounded-[12px] bg-[#f7f5f2] p-3">
                          <p className="text-[11px] text-[#6b6b6b]">Tài nguyên</p>
                          <p className="mt-1 text-lg font-semibold">{selected.resourceCount}</p>
                        </div>
                        <div className="rounded-[12px] bg-[#f7f5f2] p-3">
                          <p className="text-[11px] text-[#6b6b6b]">Bài nộp</p>
                          <p className="mt-1 text-lg font-semibold">{selected.submissionCount}</p>
                        </div>
                      </div>

                      {selected.status === "INACTIVE" && (
                        <p className="mt-4 rounded-[10px] border border-[#e6d8cb] bg-[#f8f2ec] px-3 py-2 text-[12px] leading-5 text-[#8a5a35]">
                          Lớp đang ở chế độ chỉ đọc. Kích hoạt lại lớp để chỉnh sửa thông tin.
                        </p>
                      )}

                      <div className="mt-5 flex flex-col gap-3">
                        <button
                          type="submit"
                          disabled={saving || selected.status === "INACTIVE" || !editForm.name.trim()}
                          className="flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1f1f1f] px-4 text-[13px] font-medium text-white transition hover:bg-[#34312d] disabled:cursor-not-allowed disabled:bg-[#b8b0a8]"
                        >
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                          Lưu thông tin
                        </button>
                        <Link
                          href={`/add-student?classId=${selected.id}`}
                          className="flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#d97757] px-4 text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(217,119,87,0.25)] transition hover:bg-[#c96545]"
                        >
                          <UserPlus className="size-4" />
                          Quản lý học sinh
                        </Link>
                        <Link
                          href={`/view-class-resources?classId=${selected.id}`}
                          className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#d8d1c9] px-4 text-[13px] font-medium text-[#1f1f1f] transition hover:bg-[#f5f1ec]"
                        >
                          <FileText className="size-4" />
                          Xem tài nguyên lớp
                        </Link>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(selected)}
                          disabled={busyStatusId === selected.id}
                          className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#d8d1c9] px-4 text-[13px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyStatusId === selected.id ? <Loader2 className="size-4 animate-spin" /> : selected.status === "ACTIVE" ? <Archive className="size-4" /> : <RefreshCw className="size-4" />}
                          {selected.status === "ACTIVE" ? "Lưu trữ lớp" : "Kích hoạt lại lớp"}
                        </button>
                      </div>
                    </form>
                  </aside>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
