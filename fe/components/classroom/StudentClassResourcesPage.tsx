"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, BookOpen, FileText, Inbox, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  type ClassDetail,
  type ClassResourceSummary,
  type ClassSummary,
  getClassDetail,
  listClassResources,
  listEnrolledClasses,
} from "@/lib/classroom";
import { ClassPickerCard, ResourceCard } from "./shared";

export function StudentClassResourcesPage() {
  const { user, status, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
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
    if (status !== "authenticated") return;
    setClassesLoading(true);
    try {
      const result = await listEnrolledClasses(authFetch, { size: 100 });
      setClasses(result.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách lớp.");
    } finally {
      setClassesLoading(false);
    }
  }, [authFetch, status]);

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

  function selectClass(id: string) {
    setError("");
    router.replace(id ? `/list-class?classId=${id}` : "/list-class");
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
        <Sidebar activeHref="/list-class" responsive mobileOpen={mobileMenuOpen} />

        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1220px]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#cdd7ef] bg-[#f1f4ff] px-3 text-[11px] font-medium text-[#3f54a3]">
                  <BookOpen className="size-3.5" /> Lớp học
                </div>
                <h1 className="font-libertine mt-4 text-[44px] font-normal leading-none sm:text-[60px]">Lớp học</h1>
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

            <div className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white p-5">
              <h2 className="text-[14px] font-semibold text-[#1f1f1f]">Lớp của tôi</h2>
              {classesLoading && classes.length === 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-[168px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                  ))}
                </div>
              ) : classes.length === 0 ? (
                <p className="mt-3 text-[12px] text-[#6b6b6b]">Bạn chưa được thêm vào lớp nào.</p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {classes.map((item) => (
                    <ClassPickerCard key={item.id} item={item} active={item.id === classId} onSelect={selectClass} />
                  ))}
                </div>
              )}
            </div>

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
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-[#1f1f1f]">Tài nguyên & bài tập</h2>
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
                <p className="mt-3 text-[13px] font-medium">Chọn một lớp ở trên để xem tài nguyên</p>
                <p className="mt-1 text-[12px] text-[#6b6b6b]">Danh sách lớp bạn đã tham gia hiển thị ở trên.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
