"use client";

import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Download,
  FileText,
  Inbox,
  Library,
  Paperclip,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  type ClassDetail,
  type ClassResourceSummary,
  type ClassStatus,
  type ClassSummary,
  formatFileSize,
  getClassDetail,
  listClassResources,
  listClasses,
  sourceTypeLabel,
  statusLabel,
  submissionStatusLabel,
  subjectLabel,
} from "@/lib/classroom";

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

function isOverdue(deadline: string | null): boolean {
  return Boolean(deadline) && new Date(deadline as string).getTime() < Date.now();
}

function deadlineClasses(deadline: string | null): string {
  return isOverdue(deadline)
    ? "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]"
    : "border-[#c9d5ff] bg-[#f1f4ff] text-[#3f54a3]";
}

function ResourceCard({ resource }: { resource: ClassResourceSummary }) {
  const SourceIcon = resource.sourceType === "LIBRARY_SNAPSHOT" ? Library : UploadCloud;

  return (
    <article className="overflow-hidden rounded-[14px] border border-[#d8d1c9] bg-white transition hover:border-[#c9a998] hover:shadow-[0_10px_24px_rgba(31,31,31,0.06)]">
      {resource.thumbnailUrl ? (
        <div className="relative h-[140px] w-full bg-[#f5f1ec]">
          <Image src={resource.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-[96px] w-full items-center justify-center bg-[#f5f1ec]">
          <SourceIcon className="size-8 text-[#c9a998]" />
        </div>
      )}

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d8d1c9] bg-[#faf9f7] px-2.5 py-1 text-[11px] font-medium text-[#6b6b6b]">
            <SourceIcon className="size-3" /> {sourceTypeLabel(resource.sourceType)}
          </span>
          {resource.submissionEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#f0d9aa] bg-[#fff7df] px-2.5 py-1 text-[11px] font-medium text-[#9a661c]">
              <ClipboardList className="size-3" /> {submissionStatusLabel(resource.submissionStatus)}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-[15px] font-semibold leading-snug text-[#1f1f1f]">{resource.title}</h3>
        {resource.description && (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[19px] text-[#6b6b6b]">{resource.description}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {resource.attachment?.url && (
            <a
              href={resource.attachment.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#d8d1c9] bg-[#faf9f7] px-2.5 py-1.5 text-[11.5px] font-medium text-[#1f1f1f] transition hover:bg-[#f5f1ec]"
            >
              <Paperclip className="size-3.5 text-[#8a837b]" />
              <span className="max-w-[160px] truncate">{resource.attachment.fileName ?? "Tệp đính kèm"}</span>
              {resource.attachment.sizeBytes !== null && (
                <span className="text-[#8a837b]">· {formatFileSize(resource.attachment.sizeBytes)}</span>
              )}
              <Download className="size-3.5 text-[#8a837b]" />
            </a>
          )}
          {resource.deadline && (
            <span className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[11.5px] font-medium ${deadlineClasses(resource.deadline)}`}>
              <CalendarClock className="size-3.5" />
              {isOverdue(resource.deadline) ? "Quá hạn" : "Hạn nộp"}: {formatDateTime(resource.deadline)}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#ede8e1] pt-3 text-[11.5px] text-[#8a837b]">
          <span>{resource.postedByName ?? "Giáo viên"}</span>
          <span>{formatDateTime(resource.postedAt)}</span>
        </div>
      </div>
    </article>
  );
}

export function ViewClassResourcesPage() {
  const { user, status, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
  const isTeacher = user?.role === "TEACHER";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);
  const [classLoading, setClassLoading] = useState(false);

  const [resources, setResources] = useState<ClassResourceSummary[]>([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [error, setError] = useState("");

  const loadClasses = useCallback(async () => {
    if (status !== "authenticated" || !isTeacher) return;
    setClassesLoading(true);
    try {
      const result = await listClasses(authFetch, { size: 100 });
      setClasses(result.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách lớp.");
    } finally {
      setClassesLoading(false);
    }
  }, [authFetch, isTeacher, status]);

  const loadResources = useCallback(
    async (id: string) => {
      setResourcesLoading(true);
      try {
        const result = await listClassResources(authFetch, id, 0, 100);
        setResources(result.items);
        setResourcesTotal(result.total);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Không thể tải danh sách tài nguyên.");
      } finally {
        setResourcesLoading(false);
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
        await loadResources(id);
      } catch (reason) {
        setSelectedClass(null);
        setError(reason instanceof Error ? reason.message : "Không thể mở lớp. Lớp có thể không tồn tại hoặc bạn chưa được cấp quyền truy cập.");
      } finally {
        setClassLoading(false);
      }
    },
    [authFetch, loadResources],
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
      setResources([]);
      setResourcesTotal(0);
      return;
    }
    void loadClassDetail(classId);
  }, [classId, loadClassDetail]);

  function handleSelectClass(event: ChangeEvent<HTMLSelectElement>) {
    const id = event.target.value;
    setError("");
    router.replace(id ? `/view-class-resources?classId=${id}` : "/view-class-resources");
  }

  if (!user) return null;

  const submissionCount = resources.filter((item) => item.submissionEnabled).length;
  const libraryCount = resources.filter((item) => item.sourceType === "LIBRARY_SNAPSHOT").length;

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
                {isTeacher && (
                  <Link
                    href="/create-class"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6b6b6b] transition hover:text-[#1f1f1f]"
                  >
                    <ArrowLeft className="size-3.5" /> Quay lại quản lý lớp
                  </Link>
                )}
                <div className="mt-3 inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#cdd7ef] bg-[#f1f4ff] px-3 text-[11px] font-medium text-[#3f54a3]">
                  <BookOpen className="size-3.5" /> Class Hub
                </div>
                <h1 className="font-libertine mt-4 text-[44px] font-normal leading-none sm:text-[60px]">Tài nguyên lớp học</h1>
                <p className="mt-4 max-w-[620px] text-[13px] leading-[23px] text-[#6b6b6b]">
                  Tài liệu và bài tập giáo viên đã đăng trong lớp, kèm hạn nộp và trạng thái nộp bài của bạn.
                </p>
              </div>

              {selectedClass && (
                <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
                  <div className="rounded-[14px] border border-[#d8d1c9] bg-white px-4 py-3">
                    <p className="text-[11px] text-[#6b6b6b]">Tổng tài nguyên</p>
                    <p className="mt-1 text-xl font-semibold">{resourcesTotal}</p>
                  </div>
                  <div className="rounded-[14px] border border-[#f0d9aa] bg-[#fff7df] px-4 py-3">
                    <p className="text-[11px] text-[#9a661c]">Cần nộp bài</p>
                    <p className="mt-1 text-xl font-semibold text-[#9a661c]">{submissionCount}</p>
                  </div>
                  <div className="rounded-[14px] border border-[#c9d5ff] bg-[#f1f4ff] px-4 py-3">
                    <p className="text-[11px] text-[#3f54a3]">Từ thư viện</p>
                    <p className="mt-1 text-xl font-semibold text-[#3f54a3]">{libraryCount}</p>
                  </div>
                </div>
              )}
            </div>

            {isTeacher && (
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
                      <span className="text-[12px] text-[#6b6b6b]">{selectedClass.name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-[12px] border border-[#e8b4a4] bg-[#fdf3ef] px-4 py-3 text-[13px] text-[#c0492b]">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {classLoading ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-[260px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                ))}
              </div>
            ) : selectedClass ? (
              <section className="mt-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-[16px] font-semibold">{selectedClass.name}</h2>
                    <p className="mt-1 text-[12px] text-[#6b6b6b]">
                      {subjectLabel(selectedClass.subject)} · Khối {selectedClass.grade} · Chủ lớp:{" "}
                      {selectedClass.ownerName ?? "Giáo viên"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadResources(selectedClass.id)}
                    className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-3 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
                  >
                    <RefreshCw className={`size-3.5 ${resourcesLoading ? "animate-spin" : ""}`} /> Làm mới
                  </button>
                </div>

                {selectedClass.status === "INACTIVE" && (
                  <p className="mt-4 rounded-[10px] border border-[#e6d8cb] bg-[#f8f2ec] px-3 py-2 text-[12px] leading-5 text-[#8a5a35]">
                    Lớp đang ở chế độ lưu trữ (Inactive) — tài nguyên cũ vẫn xem và tải được bình thường.
                  </p>
                )}

                <div className="mt-5">
                  {resourcesLoading && resources.length === 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-[260px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                      ))}
                    </div>
                  ) : resources.length === 0 ? (
                    <div className="rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
                      <Inbox className="mx-auto size-8 text-[#a8a097]" />
                      <p className="mt-3 text-[13px] font-medium">Không tìm thấy kết quả</p>
                      <p className="mt-1 text-[12px] text-[#6b6b6b]">Lớp này chưa có tài nguyên hoặc bài tập nào được đăng.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {resources.map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <div className="mt-8 rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
                <FileText className="mx-auto size-8 text-[#a8a097]" />
                <p className="mt-3 text-[13px] font-medium">
                  {isTeacher ? "Chọn một lớp ở trên để xem tài nguyên" : "Chưa chọn lớp"}
                </p>
                <p className="mt-1 text-[12px] text-[#6b6b6b]">
                  {isTeacher
                    ? "Danh sách lớp bạn sở hữu hiển thị ở ô chọn phía trên."
                    : "Mở liên kết tài nguyên từ lớp học của bạn để xem chi tiết tại đây."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
