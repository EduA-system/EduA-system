"use client";

import Link from "next/link";
import {
  Atom,
  BookOpen,
  ChevronDown,
  GraduationCap,
  Pencil,
  Plus,
  Presentation,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import {
  deleteLibraryContent,
  listLibrary,
  updateLibraryContent,
  type LibraryContent,
  type LibraryType,
} from "@/lib/library";

const tabs: Array<{ label: string; value: LibraryType }> = [
  { label: "Bài giảng", value: "LESSON_PLAN" },
  { label: "Slide", value: "SLIDE_DECK" },
  { label: "Bài kiểm tra", value: "TEST" },
  { label: "Mô phỏng", value: "SIMULATION" },
];

const paths: Record<LibraryType, string> = {
  LESSON_PLAN: "/lesson-edit",
  SLIDE_DECK: "/slide-maker",
  TEST: "/library",
  SIMULATION: "/molecules",
};

const typeLabels: Record<LibraryType, string> = {
  LESSON_PLAN: "Bài giảng",
  SLIDE_DECK: "Slide",
  TEST: "Bài kiểm tra",
  SIMULATION: "Mô phỏng",
};

const subjectLabels: Record<string, string> = {
  MATH: "Toán",
  CHEMISTRY: "Hóa học",
  PHYSICS: "Vật lý",
};

function ActionLink({
  href,
  label,
  primary = false,
  icon,
}: {
  href: string;
  label: string;
  primary?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-[38px] items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-medium shadow-[0_1px_1.5px_rgba(0,0,0,0.06)] transition hover:-translate-y-px hover:shadow-md ${
        primary
          ? "bg-[#e58461] text-white shadow-[0_1px_1.5px_rgba(229,132,97,0.3)]"
          : "border border-[#e0e0e0] bg-white text-[#1e1e1e]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function LibraryScreen() {
  const { authFetch } = useAuth();
  const [type, setType] = useState<LibraryType>("LESSON_PLAN");
  const [items, setItems] = useState<LibraryContent[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rename, setRename] = useState<LibraryContent | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, sort, size: "50" });
      if (query) params.set("q", query);
      if (subject) params.set("subject", subject);
      const data = await listLibrary(authFetch, params);
      setItems(data.items);
      setTotal(data.total);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thư viện.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, query, sort, subject, type]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  const openItem = (item: LibraryContent) => `${paths[item.type]}?libraryId=${item.id}`;
  const hasFilters = Boolean(query || subject);

  return (
    <main className="min-h-screen bg-[#f5f1ec] font-sans text-[#1e1e1e]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/library" />

        <section className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10">
            <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div className="space-y-2">
                <h1 className="font-libertine text-[36px] font-bold leading-none tracking-[-0.025em] text-[#1e1e1e]">
                  Thư viện của tôi
                </h1>
                <p className="text-sm leading-[21px] text-[#999]">
                  {total} tài nguyên giáo dục riêng tư
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <ActionLink href="/lesson-create" label="Tạo bài giảng" primary icon={<Plus className="size-3.5" />} />
                <ActionLink href="/slide-create" label="Tạo slide" icon={<Presentation className="size-3.5" />} />
                <ActionLink href="/molecules" label="Tạo mô phỏng" icon={<Atom className="size-3.5" />} />
              </div>
            </header>

            <div className="mt-16">
              <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[14px] border border-[#e0e0e0] bg-[#f0efeb] p-[5px]">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setType(tab.value)}
                    className={`whitespace-nowrap rounded-[10px] px-4 py-1.5 text-[13px] font-medium leading-[19.5px] transition ${
                      type === tab.value
                        ? "bg-white text-[#1e1e1e] shadow-[0_1px_1.5px_rgba(0,0,0,0.08)]"
                        : "text-[#999] hover:text-[#1e1e1e]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 lg:flex-row">
              <label className="flex h-[52px] min-w-0 flex-1 items-center gap-2.5 rounded-[14px] border border-[#e0e0e0] bg-white px-4 shadow-[0_1px_1px_rgba(0,0,0,0.04)] focus-within:border-[#c9a998]">
                <Search className="size-[15px] shrink-0 text-[#999]" />
                <span className="sr-only">Tìm kiếm</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm theo tiêu đề..."
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#bbb]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3 lg:flex">
                <label className="relative">
                  <span className="sr-only">Lọc theo môn học</span>
                  <select
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="h-[52px] w-full appearance-none rounded-[14px] border border-[#e0e0e0] bg-white py-0 pl-4 pr-10 text-[13px] font-medium text-[#1e1e1e] shadow-[0_1px_1px_rgba(0,0,0,0.04)] outline-none lg:w-40"
                  >
                    <option value="">Tất cả môn học</option>
                    <option value="MATH">Toán</option>
                    <option value="CHEMISTRY">Hóa học</option>
                    <option value="PHYSICS">Vật lý</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-3.5 -translate-y-1/2 text-[#777]" />
                </label>

                <label className="relative">
                  <span className="sr-only">Sắp xếp</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className="h-[52px] w-full appearance-none rounded-[14px] border border-[#e0e0e0] bg-white py-0 pl-4 pr-10 text-[13px] font-medium text-[#1e1e1e] shadow-[0_1px_1px_rgba(0,0,0,0.04)] outline-none lg:w-36"
                  >
                    <option value="updatedAt">Mới nhất</option>
                    <option value="title">Tên A–Z</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-3.5 -translate-y-1/2 text-[#777]" />
                </label>
              </div>
            </div>

            {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

            {loading ? (
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-44 animate-pulse rounded-[14px] border border-[#e0e0e0] bg-white/60" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 pb-24 pt-24 text-center sm:pt-32">
                <div className="flex size-24 items-center justify-center rounded-3xl border border-[#fddeca] bg-[#fef0ea] text-[#e58461]">
                  <GraduationCap className="size-9" strokeWidth={1.7} />
                </div>
                <div className="mt-5 flex items-center gap-2" aria-hidden>
                  <span className="size-[5px] rounded-full bg-[#e0e0e0]" />
                  <span className="size-[5px] rounded-full bg-[#e0e0e0]" />
                  <span className="size-2 rounded-full bg-[#e58461]" />
                  <span className="size-[5px] rounded-full bg-[#e0e0e0]" />
                  <span className="size-[5px] rounded-full bg-[#e0e0e0]" />
                </div>
                <h2 className="mt-6 text-lg font-semibold leading-7">
                  {hasFilters ? "Không tìm thấy tài nguyên phù hợp." : "Bạn chưa tạo tài nguyên học tập nào."}
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-[22.75px] text-[#999]">
                  {hasFilters
                    ? "Hãy thử thay đổi từ khóa hoặc bộ lọc để xem thêm kết quả."
                    : "Bắt đầu bằng cách tạo bài giảng hoặc slide đầu tiên. Chỉ mất khoảng một phút."}
                </p>
                {!hasFilters ? (
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <ActionLink href="/lesson-create" label="Tạo bài giảng" primary icon={<BookOpen className="size-3.5" />} />
                    <ActionLink href="/slide-create" label="Tạo slide" icon={<Presentation className="size-3.5" />} />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-[14px] border border-[#e0e0e0] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
                    <Link href={openItem(item)} className="flex h-24 items-end bg-[#fef0ea] p-4 text-sm font-semibold text-[#c45732]">
                      {typeLabels[item.type]}
                    </Link>
                    <div className="p-4">
                      <Link href={openItem(item)} className="font-semibold hover:text-[#e58461]">{item.title}</Link>
                      <p className="mt-2 text-xs text-[#999]">{item.subject ? subjectLabels[item.subject] ?? item.subject : "Chưa chọn môn"} · Riêng tư</p>
                      <div className="mt-5 flex items-center gap-4 text-[13px] font-medium">
                        <Link href={openItem(item)} className="text-[#e58461]">Mở</Link>
                        <button type="button" onClick={() => { setRename(item); setName(item.title); }} className="inline-flex items-center gap-1.5 hover:text-[#e58461]"><Pencil className="size-3.5" />Đổi tên</button>
                        <button type="button" className="ml-auto inline-flex items-center gap-1.5 text-red-700" onClick={() => { if (confirm(`Xóa “${item.title}”?`)) void deleteLibraryContent(authFetch, item.id).then(load).catch((deleteError: Error) => setError(deleteError.message)); }}><Trash2 className="size-3.5" />Xóa</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {rename ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[14px] border border-[#e0e0e0] bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Đổi tên nội dung</h2>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-4 h-11 w-full rounded-xl border border-[#e0e0e0] px-3 outline-none focus:border-[#e58461]" />
            <div className="mt-5 flex justify-end gap-2 text-sm font-medium">
              <button type="button" className="rounded-xl px-4 py-2" onClick={() => setRename(null)}>Hủy</button>
              <button type="button" className="rounded-xl bg-[#e58461] px-4 py-2 text-white" onClick={() => { if (rename && name.trim()) void updateLibraryContent(authFetch, rename.id, { title: name.trim() }).then(() => { setRename(null); return load(); }).catch((renameError: Error) => setError(renameError.message)); }}>Lưu</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function Page() {
  return (
    <RouteGuard pathname="/library">
      <LibraryScreen />
    </RouteGuard>
  );
}
