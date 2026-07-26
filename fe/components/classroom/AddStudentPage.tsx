"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  type ClassDetail,
  type ClassMember,
  type ClassStatus,
  type ClassSummary,
  type ImportStudentsResult,
  addClassStudent,
  getClassDetail,
  importClassStudents,
  importSkipReasonLabel,
  listClassMembers,
  listClasses,
  statusLabel,
  studentStatusLabel,
  subjectLabel,
} from "@/lib/classroom";

const MAX_CLASS_SIZE = 60;

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
  if (status === "ACTIVE") return "border-[#b7e0c4] bg-[#f0faf3] text-[#287447]";
  if (status === "DISABLED") return "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]";
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

  const [addEmail, setAddEmail] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<ImportStudentsResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  function handleSelectClass(event: ChangeEvent<HTMLSelectElement>) {
    const id = event.target.value;
    setMessage("");
    setError("");
    setImportResult(null);
    router.replace(id ? `/add-student?classId=${id}` : "/add-student");
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
    try {
      await addClassStudent(authFetch, selectedClass.id, addEmail.trim());
      setAddEmail("");
      setMessage("Đã thêm học sinh vào lớp.");
      await refreshSelectedClass(selectedClass.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thêm học sinh.");
    } finally {
      setAddBusy(false);
    }
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || !importFile || importBusy) return;
    setImportBusy(true);
    setError("");
    setMessage("");
    setImportResult(null);
    try {
      const result = await importClassStudents(authFetch, selectedClass.id, importFile);
      setImportResult(result);
      setMessage(`Đã thêm ${result.addedCount} học sinh, bỏ qua ${result.skippedCount} dòng.`);
      await refreshSelectedClass(selectedClass.id);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể import file. Vui lòng chọn lại tệp và thử lại.",
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
                <Link
                  href="/create-class"
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6b6b6b] transition hover:text-[#1f1f1f]"
                >
                  <ArrowLeft className="size-3.5" /> Quay lại quản lý lớp
                </Link>
                <div className="mt-3 inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#cdd7ef] bg-[#f1f4ff] px-3 text-[11px] font-medium text-[#3f54a3]">
                  <Users className="size-3.5" /> Class Hub
                </div>
                <h1 className="font-libertine mt-4 text-[44px] font-normal leading-none sm:text-[60px]">Thêm học sinh</h1>
                <p className="mt-4 max-w-[620px] text-[13px] leading-[23px] text-[#6b6b6b]">
                  Thêm học sinh vào lớp bằng Gmail — nhập từng người hoặc import cả danh sách từ file .csv/.xlsx.
                </p>
              </div>

              {selectedClass && (
                <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
                  <div className="rounded-[14px] border border-[#d8d1c9] bg-white px-4 py-3">
                    <p className="text-[11px] text-[#6b6b6b]">Sĩ số</p>
                    <p className="mt-1 text-xl font-semibold">
                      {membersTotal}/{MAX_CLASS_SIZE}
                    </p>
                  </div>
                  <div
                    className={`rounded-[14px] border px-4 py-3 ${
                      isFull ? "border-[#e8b4a4] bg-[#fdf3ef]" : "border-[#b7e0c4] bg-[#f0faf3]"
                    }`}
                  >
                    <p className={`text-[11px] ${isFull ? "text-[#c0492b]" : "text-[#287447]"}`}>Còn trống</p>
                    <p className={`mt-1 text-xl font-semibold ${isFull ? "text-[#c0492b]" : "text-[#287447]"}`}>
                      {remainingSlots}
                    </p>
                  </div>
                </div>
              )}
            </div>

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
                  <Link href="/create-class" className="font-medium text-[#d97757] underline">
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
              <div className="mt-8 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-6">
                  <form onSubmit={handleAddStudent} className="rounded-[14px] border border-[#d8d1c9] bg-white p-5">
                    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                      <UserPlus className="size-4 text-[#d97757]" /> Thêm 1 học sinh
                    </div>
                    <label className="mt-5 block text-[12px] font-medium text-[#6b6b6b]">
                      Gmail học sinh
                      <input
                        type="email"
                        value={addEmail}
                        onChange={(event) => setAddEmail(event.target.value)}
                        placeholder="hocsinh01@gmail.com"
                        disabled={formsDisabled}
                        className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] text-[#1f1f1f] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757] disabled:text-[#8a837b]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={addBusy || formsDisabled || !addEmail.trim()}
                      className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[#d97757] px-5 text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(217,119,87,0.25)] transition hover:bg-[#c96545] disabled:cursor-not-allowed disabled:bg-[#e8b9a7]"
                    >
                      {addBusy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                      {addBusy ? "Đang thêm..." : "Thêm học sinh"}
                    </button>
                    {isInactive && (
                      <p className="mt-3 text-[12px] leading-5 text-[#8a5a35]">
                        Lớp đang lưu trữ (Inactive), không thể thêm học sinh.
                      </p>
                    )}
                    {!isInactive && isFull && (
                      <p className="mt-3 text-[12px] leading-5 text-[#c0492b]">Lớp đã đủ {MAX_CLASS_SIZE} thành viên.</p>
                    )}
                  </form>

                  <form onSubmit={handleImport} className="rounded-[14px] border border-[#d8d1c9] bg-white p-5">
                    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                      <Upload className="size-4 text-[#d97757]" /> Import từ file
                    </div>
                    <p className="mt-3 text-[12px] leading-5 text-[#6b6b6b]">
                      File .csv hoặc .xlsx, có cột tên <span className="font-medium text-[#1f1f1f]">gmail</span>. Dòng lỗi
                      hoặc trùng sẽ tự động bị bỏ qua.
                    </p>
                    <label className="mt-4 block text-[12px] font-medium text-[#6b6b6b]">
                      Chọn file
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx"
                        disabled={formsDisabled}
                        onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                        className="mt-2 block w-full text-[13px] text-[#6b6b6b] file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5f1ec] file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-[#1f1f1f] hover:file:bg-[#edeae5] disabled:opacity-50"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={importBusy || formsDisabled || !importFile}
                      className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[#1f1f1f] px-5 text-[13px] font-medium text-white transition hover:bg-[#34312d] disabled:cursor-not-allowed disabled:bg-[#b8b0a8]"
                    >
                      {importBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      {importBusy ? "Đang import..." : "Import danh sách"}
                    </button>
                  </form>

                  {importResult && (
                    <div className="rounded-[14px] border border-[#d8d1c9] bg-[#faf9f7] p-5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">Kết quả import</p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-[12px] border border-[#b7e0c4] bg-[#f0faf3] p-3">
                          <p className="text-[11px] text-[#287447]">Đã thêm</p>
                          <p className="mt-1 text-lg font-semibold text-[#287447]">{importResult.addedCount}</p>
                        </div>
                        <div className="rounded-[12px] border border-[#e6d8cb] bg-[#f8f2ec] p-3">
                          <p className="text-[11px] text-[#8a5a35]">Bỏ qua</p>
                          <p className="mt-1 text-lg font-semibold text-[#8a5a35]">{importResult.skippedCount}</p>
                        </div>
                      </div>
                      {importResult.skipped.length > 0 && (
                        <ul className="mt-4 max-h-[240px] space-y-2 overflow-y-auto">
                          {importResult.skipped.map((row) => (
                            <li
                              key={`${row.row}-${row.email ?? ""}`}
                              className="rounded-[10px] border border-[#ede8e1] bg-white px-3 py-2 text-[12px]"
                            >
                              <span className="font-medium text-[#1f1f1f]">Dòng {row.row}</span>
                              <span className="text-[#6b6b6b]"> · {row.email || "(trống)"} · </span>
                              <span className="text-[#c0492b]">{importSkipReasonLabel(row.reason)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <section className="min-w-0 rounded-[14px] border border-[#d8d1c9] bg-[#faf9f7] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-[16px] font-semibold">Thành viên lớp</h2>
                      <p className="mt-1 text-[12px] text-[#6b6b6b]">
                        {selectedClass.name} · {membersTotal} học sinh
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadMembers(selectedClass.id)}
                      className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-3 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
                    >
                      <RefreshCw className={`size-3.5 ${membersLoading ? "animate-spin" : ""}`} /> Làm mới
                    </button>
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
                        <p className="mt-1 text-[12px] text-[#6b6b6b]">Thêm học sinh bằng Gmail hoặc import file ở bên trái.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[12px] border border-[#ede8e1] bg-white">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="border-b border-[#ede8e1] text-[11px] uppercase tracking-[0.06em] text-[#6b6b6b]">
                              <th className="px-4 py-3 font-medium">Học sinh</th>
                              <th className="px-4 py-3 font-medium">Trạng thái</th>
                              <th className="px-4 py-3 font-medium">Tham gia</th>
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
                                      member.studentStatus,
                                    )}`}
                                  >
                                    {studentStatusLabel(member.studentStatus)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[#6b6b6b]">{formatDateTime(member.joinedAt)}</td>
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
    </main>
  );
}
