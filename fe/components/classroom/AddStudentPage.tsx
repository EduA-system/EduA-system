"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ClassHubNavigation } from "./ClassHubFrame";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  type ClassDetail,
  type ClassMember,
  type ClassStatus,
  type ClassSummary,
  type ImportStudentsResult,
  addClassStudent,
  ClassApiError,
  getClassDetail,
  importClassStudents,
  importSkipReasonLabel,
  listClassMembers,
  listClasses,
  memberStatusLabel,
  removeClassStudent,
  statusLabel,
  subjectLabel,
} from "@/lib/classroom";

const MAX_CLASS_SIZE = 60;
const MIN_STUDENT_AGE_YEARS = 16;

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

function studentStatusClasses(status: string | null): string {
  if (status === "ENROLLED") return "border-[#b7e0c4] bg-[#f0faf3] text-[#287447]";
  if (status === "REMOVED") return "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]";
  return "border-[#d8d1c9] bg-[#f7f5f2] text-[#6b6b6b]";
}

export function AddStudentPage() {
  const { user, status, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);
  const [classLoading, setClassLoading] = useState(false);

  const [members, setMembers] = useState<ClassMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);

  const [addForm, setAddForm] = useState({ fullName: "", phoneNumber: "", dateOfBirth: "", email: "" });
  const [addBusy, setAddBusy] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<ImportStudentsResult | null>(null);
  const [addInlineError, setAddInlineError] = useState("");
  const [importErrorResult, setImportErrorResult] = useState<ImportStudentsResult | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [memberToRemove, setMemberToRemove] = useState<ClassMember | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removeBusy, setRemoveBusy] = useState(false);

  const loadClasses = useCallback(async () => {
    if (status !== "authenticated") return;
    setClassesLoading(true);
    try {
      const result = await listClasses(authFetch, { size: 100 });
      setClasses(result.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách lớp.");
    } finally {
      setClassesLoading(false);
    }
  }, [authFetch, status]);

  const loadMembers = useCallback(
    async (id: string) => {
      setMembersLoading(true);
      try {
        const result = await listClassMembers(authFetch, id, 0, 100);
        setMembers(result.items);
        setMembersTotal(result.total);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Không thể tải danh sách thành viên.");
      } finally {
        setMembersLoading(false);
      }
    },
    [authFetch],
  );

  const loadClassDetail = useCallback(
    async (id: string) => {
      setClassLoading(true);
      setError("");
      try {
        const detail = await getClassDetail(authFetch, id);
        setSelectedClass(detail);
        await loadMembers(id);
      } catch (reason) {
        setSelectedClass(null);
        setError(reason instanceof Error ? reason.message : "Không thể mở lớp.");
      } finally {
        setClassLoading(false);
      }
    },
    [authFetch, loadMembers],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClasses();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadClasses]);

  useEffect(() => {
    if (!classId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedClass(null);
      setMembers([]);
      setMembersTotal(0);
      return;
    }
    void loadClassDetail(classId);
  }, [classId, loadClassDetail]);

  useEffect(() => {
    if (!addDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (importErrorResult || importErrorMessage) {
        setImportErrorResult(null);
        setImportErrorMessage("");
        return;
      }
      setAddDialogOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addDialogOpen, importErrorMessage, importErrorResult]);

  function handleSelectClass(event: ChangeEvent<HTMLSelectElement>) {
    const id = event.target.value;
    setMessage("");
    setError("");
    setImportResult(null);
    setImportErrorResult(null);
    setImportErrorMessage("");
    router.replace(id ? `/class-detail/members?classId=${id}` : "/class-detail/members");
  }

  async function refreshSelectedClass(id: string) {
    await Promise.all([loadMembers(id), loadClasses()]);
    try {
      const refreshed = await getClassDetail(authFetch, id);
      setSelectedClass(refreshed);
    } catch {
      // giu nguyen selectedClass hien tai neu refresh loi, khong chan flow chinh
    }
  }

  async function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || addBusy) return;
    setAddBusy(true);
    setError("");
    setMessage("");
    setAddInlineError("");
    try {
      await addClassStudent(authFetch, selectedClass.id, {
        fullName: addForm.fullName.trim(), phoneNumber: addForm.phoneNumber.trim(), dateOfBirth: addForm.dateOfBirth, email: addForm.email.trim(),
      });
      setAddForm({ fullName: "", phoneNumber: "", dateOfBirth: "", email: "" });
      setAddDialogOpen(false);
      setMessage("Đã thêm học sinh vào lớp.");
      await refreshSelectedClass(selectedClass.id);
    } catch (reason) {
      const errorMessage = reason instanceof Error ? reason.message : "Không thể thêm học sinh.";
      if (reason instanceof ClassApiError && reason.reason === "PROFILE_MISMATCH" && reason.existingAccount) {
        setAddInlineError(reason.message);
      } else {
        setAddInlineError(errorMessage);
      }
    } finally {
      setAddBusy(false);
    }
  }

  function openRemoveDialog(member: ClassMember) {
    setRemoveReason("");
    setMemberToRemove(member);
  }

  async function handleRemoveStudent() {
    if (!selectedClass || !memberToRemove || removeBusy) return;
    setRemoveBusy(true);
    setError("");
    setMessage("");
    try {
      await removeClassStudent(
        authFetch,
        selectedClass.id,
        memberToRemove.studentId,
        removeReason.trim() || undefined,
      );
      setMessage(`Đã gỡ học sinh "${memberToRemove.studentName || memberToRemove.studentEmail}" khỏi lớp.`);
      setMemberToRemove(null);
      setRemoveReason("");
      await refreshSelectedClass(selectedClass.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gỡ học sinh khỏi lớp.");
    } finally {
      setRemoveBusy(false);
    }
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || !importFile || importBusy) return;
    setImportBusy(true);
    setError("");
    setMessage("");
    setImportResult(null);
    setImportErrorResult(null);
    setImportErrorMessage("");
    try {
      const result = await importClassStudents(authFetch, selectedClass.id, importFile);
      if (result.errorCount > 0) {
        setImportErrorResult(result);
      } else {
        setImportResult(result);
        setMessage(`Đã thêm ${result.addedCount} học sinh (${result.createdCount} học sinh mới, ${result.rejoinedCount} học sinh quay lại lớp).`);
        await refreshSelectedClass(selectedClass.id);
      }
    } catch (reason) {
      setImportErrorMessage(
        reason instanceof Error
          ? reason.message
          : "Không thể nhập danh sách từ tệp. Vui lòng chọn lại tệp và thử lại.",
      );
    } finally {
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setImportBusy(false);
    }
  }

  if (!user) return null;

  const remainingSlots = selectedClass ? Math.max(0, MAX_CLASS_SIZE - membersTotal) : null;
  const isInactive = selectedClass?.status === "INACTIVE";
  const isFull = remainingSlots !== null && remainingSlots <= 0;
  const formsDisabled = isInactive || isFull;
  const latestAllowedBirthDate = `${new Date().getFullYear() - MIN_STUDENT_AGE_YEARS}-12-31`;

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
        <Sidebar activeHref="/list-class" responsive mobileOpen={mobileMenuOpen} />

        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1220px]">
            <nav aria-label="Đường dẫn lớp học" className="flex flex-wrap items-center gap-2 text-[12px] text-[#817a72]">
              <Link href="/list-class" className="font-medium transition hover:text-[#1f1f1f]">Lớp học</Link>
              <span aria-hidden className="text-[#b4aaa1]">/</span>
              {selectedClass ? (
                <Link href={`/class-detail?classId=${selectedClass.id}`} className="max-w-[240px] truncate font-medium transition hover:text-[#1f1f1f]">{selectedClass.name}</Link>
              ) : (
                <span>Chọn lớp</span>
              )}
              <span aria-hidden className="text-[#b4aaa1]">/</span>
              <span aria-current="page" className="font-semibold text-[#a45c3e]">Thành viên</span>
            </nav>
            <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="font-libertine mt-3 text-[40px] font-normal leading-[1.02] tracking-[-0.025em] sm:text-[52px]">Thành viên lớp</h1>
                <p className="mt-4 max-w-[620px] text-[14px] leading-6 text-[#6b6b6b]">
                  Xem danh sách thành viên và quản lý học sinh trong lớp — thêm từng người hoặc nhập cả danh sách từ tệp .csv/.xlsx.
                </p>
              </div>

              {selectedClass && (
                <div className="flex items-center gap-5 border-t border-[#ede8e1] pt-4 lg:border-t-0 lg:pt-0">
                  <div>
                    <p className="text-[11px] text-[#817a72]">Sĩ số</p>
                    <p className="mt-1 text-xl font-semibold text-[#1f1f1f]">{membersTotal}/{MAX_CLASS_SIZE}</p>
                  </div>
                  <span aria-hidden className="h-9 w-px bg-[#e7e0d8]" />
                  <div>
                    <p className={`text-[11px] ${isFull ? "text-[#c0492b]" : "text-[#287447]"}`}>Còn trống</p>
                    <p className={`mt-1 text-xl font-semibold ${isFull ? "text-[#c0492b]" : "text-[#287447]"}`}>{remainingSlots}</p>
                  </div>
                </div>
              )}
            </div>

            <ClassHubNavigation classId={classId} active="members" />

            <div className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <label className="block text-[12px] font-medium text-[#6b6b6b] sm:min-w-[340px]">
                  Chọn lớp
                  <select
                    value={classId}
                    onChange={handleSelectClass}
                    className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition focus:border-[#d97757]"
                  >
                    <option value="">{classesLoading ? "Đang tải danh sách lớp..." : "-- Chọn lớp của bạn --"}</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · Khối {item.grade} · {subjectLabel(item.subject)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedClass && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(selectedClass.status)}`}>
                      {statusLabel(selectedClass.status)}
                    </span>
                    <span className="text-[12px] text-[#6b6b6b]">Chủ lớp: {selectedClass.ownerName ?? "Bạn"}</span>
                  </div>
                )}
              </div>
              {classes.length === 0 && !classesLoading && (
                <p className="mt-3 text-[12px] text-[#6b6b6b]">
                  Bạn chưa có lớp nào.{" "}
                  <Link href="/list-class" className="font-medium text-[#d97757] underline">
                    Tạo lớp mới
                  </Link>{" "}
                  trước khi thêm học sinh.
                </p>
              )}
            </div>

            {(error || message) && (
              <div
                className={`mt-6 flex items-start gap-2 rounded-[12px] border px-4 py-3 text-[13px] ${
                  error ? "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]" : "border-[#bfdcc8] bg-[#f1faf3] text-[#287447]"
                }`}
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>{error || message}</span>
              </div>
            )}

            {classLoading ? (
              <div className="mt-8 h-[280px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
            ) : selectedClass ? (
              <div className="mt-8">
                <section className="min-w-0 rounded-[14px] border border-[#d8d1c9] bg-[#faf9f7] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-[16px] font-semibold">Thành viên lớp</h2>
                      <p className="mt-1 text-[12px] text-[#6b6b6b]">
                        {selectedClass.name} · {membersTotal} học sinh
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAddDialogOpen(true)}
                        disabled={formsDisabled}
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#d97757] px-3 text-[12px] font-medium text-white transition hover:bg-[#c96545] disabled:cursor-not-allowed disabled:bg-[#e8b9a7]"
                      >
                        <UserPlus className="size-3.5" /> Thêm thành viên
                      </button>
                      <button
                        type="button"
                        onClick={() => void loadMembers(selectedClass.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-3 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
                      >
                        <RefreshCw className={`size-3.5 ${membersLoading ? "animate-spin" : ""}`} /> Làm mới
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    {membersLoading && members.length === 0 ? (
                      <div className="grid gap-3">
                        {[1, 2, 3].map((item) => (
                          <div key={item} className="h-[62px] animate-pulse rounded-[12px] bg-[#e8e2db]" />
                        ))}
                      </div>
                    ) : members.length === 0 ? (
                      <div className="rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-10 text-center">
                        <Users className="mx-auto size-8 text-[#a8a097]" />
                        <p className="mt-3 text-[13px] font-medium">Lớp chưa có học sinh nào</p>
                        <p className="mt-1 text-[12px] text-[#6b6b6b]">Thêm học sinh bằng thông tin hồ sơ hoặc nhập tệp.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[12px] border border-[#ede8e1] bg-white">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="border-b border-[#ede8e1] text-[11px] uppercase tracking-[0.06em] text-[#6b6b6b]">
                              <th className="px-4 py-3 font-medium">Học sinh</th>
                              <th className="px-4 py-3 font-medium">Trạng thái</th>
                              <th className="px-4 py-3 font-medium">Tham gia</th>
                              <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {members.map((member) => (
                              <tr key={member.id} className="border-b border-[#f2efe9] last:border-0">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-[#1f1f1f]">
                                    {member.studentName || member.studentEmail || "—"}
                                  </div>
                                  {member.studentName && (
                                    <div className="text-[12px] text-[#8a837b]">{member.studentEmail}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${studentStatusClasses(
                                      member.membershipStatus,
                                    )}`}
                                  >
                                    {memberStatusLabel(member.membershipStatus)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[#6b6b6b]">{formatDateTime(member.joinedAt)}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openRemoveDialog(member)}
                                    disabled={isInactive}
                                    title="Gỡ học sinh khỏi lớp"
                                    aria-label={`Gỡ học sinh ${member.studentName || member.studentEmail || ""} khỏi lớp`}
                                    className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-[#a8a097] transition hover:border-[#e8b4a4] hover:bg-[#fdf3ef] hover:text-[#c0492b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              !classesLoading &&
              classes.length > 0 && (
                <div className="mt-8 rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
                  <BookOpen className="mx-auto size-8 text-[#a8a097]" />
                  <p className="mt-3 text-[13px] font-medium">Chọn một lớp ở trên để quản lý học sinh</p>
                </div>
              )
            )}
          </div>
        </section>
      </div>
      {addDialogOpen && selectedClass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1f1f]/35 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAddDialogOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="add-student-dialog-title" className="max-h-[calc(100vh-3rem)] w-full max-w-[560px] overflow-y-auto rounded-[16px] border border-[#d8d1c9] bg-white p-5 shadow-[0_20px_60px_rgba(31,31,31,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-student-dialog-title" className="text-[18px] font-semibold">Thêm thành viên</h2>
                <p className="mt-1 text-[12px] text-[#6b6b6b]">Thêm học sinh vào lớp {selectedClass.name} bằng thông tin hồ sơ hoặc danh sách tệp.</p>
              </div>
              <button type="button" onClick={() => setAddDialogOpen(false)} aria-label="Đóng cửa sổ thêm thành viên" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d8d1c9] text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"><X className="size-4" /></button>
            </div>
            <form onSubmit={handleAddStudent} className="mt-5 rounded-[12px] border border-[#ede8e1] bg-[#faf9f7] p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]"><UserPlus className="size-4 text-[#d97757]" /> Thêm học sinh</div>
              <label className="block text-[12px] font-medium text-[#6b6b6b]">
                Họ và tên *
                <input
                  value={addForm.fullName}
                  onChange={(event) => setAddForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Nguyễn Văn A"
                  autoFocus
                  required
                  disabled={addBusy || formsDisabled}
                  className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757] disabled:text-[#8a837b]"
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block text-[12px] font-medium text-[#6b6b6b]">Số điện thoại *<input type="tel" value={addForm.phoneNumber} onChange={(event) => setAddForm((current) => ({ ...current, phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 10) }))} required pattern="0[35789][0-9]{8}" maxLength={10} title="Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09." disabled={addBusy || formsDisabled} className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px]" /></label>
                <label className="block text-[12px] font-medium text-[#6b6b6b]">Ngày sinh *<input type="date" value={addForm.dateOfBirth} onChange={(event) => setAddForm((current) => ({ ...current, dateOfBirth: event.target.value }))} required max={latestAllowedBirthDate} disabled={addBusy || formsDisabled} className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px]" /></label>
              </div>
              <label className="mt-3 block text-[12px] font-medium text-[#6b6b6b]">Gmail *<input type="email" value={addForm.email} onChange={(event) => setAddForm((current) => ({ ...current, email: event.target.value }))} placeholder="hocsinh01@gmail.com" required disabled={addBusy || formsDisabled} className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px]" /></label>
              {addInlineError && <p className="mt-3 text-[12px] leading-5 text-[#c0492b]">{addInlineError}</p>}
              {isInactive && <p className="mt-3 text-[12px] leading-5 text-[#8a5a35]">Lớp đang lưu trữ, không thể thêm học sinh.</p>}
              {!isInactive && isFull && <p className="mt-3 text-[12px] leading-5 text-[#c0492b]">Lớp đã đủ {MAX_CLASS_SIZE} thành viên.</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setAddDialogOpen(false)} disabled={addBusy} className="h-10 rounded-[10px] border border-[#d8d1c9] px-4 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] disabled:opacity-50">Hủy</button>
                <button type="submit" disabled={addBusy || formsDisabled || !addForm.fullName.trim() || !addForm.phoneNumber.trim() || !addForm.dateOfBirth || !addForm.email.trim()} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#d97757] px-4 text-[12px] font-medium text-white transition hover:bg-[#c96545] disabled:cursor-not-allowed disabled:bg-[#e8b9a7]">
                  {addBusy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  {addBusy ? "Đang thêm..." : "Thêm học sinh"}
                </button>
              </div>
            </form>
            <form onSubmit={handleImport} className="mt-4 rounded-[12px] border border-[#ede8e1] bg-[#faf9f7] p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]"><Upload className="size-4 text-[#d97757]" /> Nhập từ tệp</div>
              <p className="mt-3 text-[12px] leading-5 text-[#6b6b6b]">Tệp .csv, .xls hoặc .xlsx phải có các cột: <span className="font-medium text-[#1f1f1f]">Họ và tên | Số điện thoại | Ngày/tháng/năm sinh | Gmail</span>. Nếu có bất kỳ dòng lỗi nào, hệ thống sẽ không thêm học sinh nào; hãy sửa file rồi nộp lại.</p>
              <label className="mt-4 block text-[12px] font-medium text-[#6b6b6b]">Chọn tệp<input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" disabled={formsDisabled || importBusy} onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-[13px] text-[#6b6b6b] file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5f1ec] file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-[#1f1f1f] hover:file:bg-[#edeae5] disabled:opacity-50" /></label>
              <button type="submit" disabled={importBusy || formsDisabled || !importFile} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#1f1f1f] px-5 text-[12px] font-medium text-white transition hover:bg-[#34312d] disabled:cursor-not-allowed disabled:bg-[#b8b0a8]">{importBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{importBusy ? "Đang nhập danh sách..." : "Nhập danh sách"}</button>
            </form>
            {importResult && <div className="mt-4 rounded-[12px] border border-[#d8d1c9] bg-[#f7f5f2] p-4"><p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">Kết quả import</p><div className="mt-3 grid grid-cols-3 gap-3"><div className="rounded-[10px] border border-[#b7e0c4] bg-[#f0faf3] p-3"><p className="text-[11px] text-[#287447]">Đã thêm</p><p className="mt-1 text-lg font-semibold text-[#287447]">{importResult.addedCount}</p></div><div className="rounded-[10px] border border-[#d8d1c9] bg-white p-3"><p className="text-[11px] text-[#6b6b6b]">Học sinh mới</p><p className="mt-1 text-lg font-semibold text-[#1f1f1f]">{importResult.createdCount}</p></div><div className="rounded-[10px] border border-[#d8d1c9] bg-white p-3"><p className="text-[11px] text-[#6b6b6b]">Quay lại lớp</p><p className="mt-1 text-lg font-semibold text-[#1f1f1f]">{importResult.rejoinedCount}</p></div></div></div>}
          </div>
        </div>
      )}
      {(importErrorResult || importErrorMessage) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1f1f1f]/45 px-4 py-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setImportErrorResult(null); setImportErrorMessage(""); } }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="import-error-title" className="max-h-[calc(100vh-3rem)] w-full max-w-[680px] overflow-y-auto rounded-[16px] border border-[#e8b4a4] bg-white p-5 shadow-[0_24px_70px_rgba(31,31,31,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="import-error-title" className="text-[18px] font-semibold text-[#c0492b]">File import có lỗi</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#6b6b6b]">
                  {importErrorResult
                    ? `File có ${importErrorResult.errorCount} dòng lỗi. Chưa có học sinh nào được thêm; vui lòng sửa file rồi nộp lại.`
                    : importErrorMessage}
                </p>
              </div>
              <button type="button" onClick={() => { setImportErrorResult(null); setImportErrorMessage(""); }} aria-label="Đóng thông báo lỗi import" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8b4a4] text-[#c0492b] transition hover:bg-[#fdf3ef]"><X className="size-4" /></button>
            </div>
            {importErrorResult && importErrorResult.errors.length > 0 && (
              <ul className="mt-5 max-h-[320px] space-y-2 overflow-y-auto rounded-[12px] border border-[#f0d0c5] bg-[#fff8f5] p-3">
                {importErrorResult.errors.map((row) => (
                  <li key={`${row.row}-${row.email ?? ""}-${row.reason}`} className="rounded-[10px] border border-[#f0d0c5] bg-white px-3 py-2 text-[12px] leading-5">
                    <span className="font-semibold text-[#1f1f1f]">{row.row > 0 ? `Dòng ${row.row}` : "File"}</span>
                    <span className="text-[#6b6b6b]"> · {row.email || "(trống)"} · </span>
                    <span className="text-[#c0492b]">{row.message || importSkipReasonLabel(row.reason)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => { setImportErrorResult(null); setImportErrorMessage(""); }} className="h-10 rounded-[10px] bg-[#d97757] px-4 text-[12px] font-medium text-white transition hover:bg-[#c96545]">Đã hiểu</button>
            </div>
          </div>
        </div>
      )}
      {memberToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1f1f]/35 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !removeBusy) setMemberToRemove(null);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="remove-student-dialog-title" className="max-h-[calc(100vh-3rem)] w-full max-w-[520px] overflow-y-auto rounded-[16px] border border-[#d8d1c9] bg-white p-5 shadow-[0_20px_60px_rgba(31,31,31,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="remove-student-dialog-title" className="text-[18px] font-semibold">
                  Gỡ học sinh khỏi lớp
                </h2>
                <p className="mt-1 text-[12px] text-[#6b6b6b]">
                  {memberToRemove.studentName || memberToRemove.studentEmail || "Học sinh"} · {memberToRemove.studentEmail}
                </p>
              </div>
              <button type="button" onClick={() => setMemberToRemove(null)} disabled={removeBusy} aria-label="Đóng cửa sổ gỡ học sinh khỏi lớp" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d8d1c9] text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f] disabled:opacity-50"><X className="size-4" /></button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[12px] border border-[#bfdcc8] bg-[#f1faf3] p-4">
                <p className="text-[13px] font-semibold text-[#287447]">Chỉ gỡ khỏi lớp này</p>
                <p className="mt-2 text-[12px] leading-5 text-[#6b6b6b]">
                  Tài khoản, role học sinh và toàn bộ dữ liệu trong lớp (bài đã nộp, file, đóng góp, lịch sử) được <strong>giữ nguyên</strong>.
                  Nếu giáo viên thêm lại sau này, học sinh sẽ quay lại lớp và thấy lại dữ liệu cũ của mình.
                </p>
              </div>
              <label className="block text-[12px] font-medium text-[#6b6b6b]">
                Lý do xóa (không bắt buộc)
                <textarea
                  value={removeReason}
                  onChange={(event) => setRemoveReason(event.target.value)}
                  disabled={removeBusy}
                  rows={3}
                  placeholder="Ghi chú nội bộ cho lần gỡ học sinh khỏi lớp này."
                  className="mt-2 w-full resize-none rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 py-2 text-[13px] text-[#1f1f1f] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757] disabled:text-[#8a837b]"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setMemberToRemove(null)} disabled={removeBusy} className="h-10 rounded-[10px] border border-[#d8d1c9] px-4 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] disabled:opacity-50">Hủy</button>
              <button
                type="button"
                onClick={() => void handleRemoveStudent()}
                disabled={removeBusy}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#d97757] px-4 text-[12px] font-medium text-white transition hover:bg-[#c96545] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {removeBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {removeBusy ? "Đang gỡ..." : "Gỡ khỏi lớp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
