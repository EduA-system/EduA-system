"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Menu, RefreshCw, Save, Search, SlidersHorizontal } from "lucide-react";
import { DashboardIcon } from "@/components/ui/DashboardIcon";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";

type Prompt = {
  key: string;
  instruction: string;
  updatedAt: string | null;
};

type EditablePrompt = Prompt & {
  originalInstruction: string;
};

type PromptGroup = {
  title: string;
  subtitle: string;
  accent: string;
  keys: readonly string[];
};

const groups: readonly PromptGroup[] = [
  {
    title: "Giáo án",
    subtitle: "Sinh mục tiêu, học liệu và hoạt động dạy học.",
    accent: "#d97757",
    keys: ["LESSON_PLAN_OBJECTIVES", "LESSON_PLAN_MATERIALS", "LESSON_PLAN_ACTIVITIES_FRAME", "LESSON_PLAN_ACTIVITY_DETAIL", "LESSON_PLAN_SUB_ACTIVITY_DETAIL"],
  },
  {
    title: "Dàn ý slide",
    subtitle: "Chia cấu trúc, ánh xạ nội dung và mở rộng từng phần.",
    accent: "#7c8f59",
    keys: ["SLIDE_OUTLINE_DECK_BLUEPRINT", "SLIDE_OUTLINE_CONTENT_MAP", "SLIDE_OUTLINE_STRUCTURE", "SLIDE_OUTLINE_MERGED", "SLIDE_OUTLINE_PART_SKELETON", "SLIDE_OUTLINE_EXPAND_PART", "SLIDE_OUTLINE_SPLIT_ITEM"],
  },
  {
    title: "Thiết kế slide",
    subtitle: "Điều phối nền, bố cục và nội dung HTML cho slide.",
    accent: "#8b6f9f",
    keys: ["SLIDE_DESIGN_BACKGROUND", "SLIDE_DESIGN_STRUCTURE", "SLIDE_DESIGN_CONTENT_FILL", "SLIDE_DESIGN_CONTENT_SLOTS"],
  },
  {
    title: "Phân tử",
    subtitle: "Sinh cấu trúc mô phỏng hoá học từ yêu cầu giáo viên.",
    accent: "#4f8f9f",
    keys: ["MOLECULE_STRUCTURE"],
  },
] as const;

const labels: Record<string, string> = {
  LESSON_PLAN_OBJECTIVES: "Mục tiêu bài dạy",
  LESSON_PLAN_MATERIALS: "Thiết bị và học liệu",
  LESSON_PLAN_ACTIVITIES_FRAME: "Khung hoạt động",
  LESSON_PLAN_ACTIVITY_DETAIL: "Chi tiết hoạt động",
  LESSON_PLAN_SUB_ACTIVITY_DETAIL: "Chi tiết tiểu hoạt động",
  SLIDE_OUTLINE_DECK_BLUEPRINT: "Deck blueprint",
  SLIDE_OUTLINE_CONTENT_MAP: "Content map",
  SLIDE_OUTLINE_STRUCTURE: "Cấu trúc dàn ý",
  SLIDE_OUTLINE_MERGED: "Hợp nhất dàn ý",
  SLIDE_OUTLINE_PART_SKELETON: "Khung phần slide",
  SLIDE_OUTLINE_EXPAND_PART: "Mở rộng nội dung phần",
  SLIDE_OUTLINE_SPLIT_ITEM: "Tách slide quá tải",
  SLIDE_DESIGN_BACKGROUND: "Nền và trang trí",
  SLIDE_DESIGN_STRUCTURE: "Cấu trúc vùng nội dung",
  SLIDE_DESIGN_CONTENT_FILL: "Điền nội dung HTML",
  SLIDE_DESIGN_CONTENT_SLOTS: "Điền nội dung theo slot",
  MOLECULE_STRUCTURE: "Cấu trúc phân tử",
};

function toEditablePrompt(prompt: Prompt): EditablePrompt {
  return { ...prompt, originalInstruction: prompt.instruction };
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function ItStaffContent() {
  const { authFetch, user } = useAuth();
  const [prompts, setPrompts] = useState<EditablePrompt[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState(groups[0].title);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await authFetch("/api/it-staff/system-prompts");
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không thể tải cấu hình AI.");
      }
      setPrompts(Array.isArray(payload) ? payload.map(toEditablePrompt) : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(prompt: EditablePrompt) {
    setSaving(prompt.key);
    setMessage("");
    try {
      const response = await authFetch(`/api/it-staff/system-prompts/${prompt.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: prompt.instruction }),
      });
      const updated = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(updated?.message ?? "Không thể lưu cấu hình.");
      }
      const nextPrompt = toEditablePrompt(updated as Prompt);
      setPrompts((items) => items.map((item) => (item.key === prompt.key ? nextPrompt : item)));
      setMessage(`Đã lưu ${labels[prompt.key] ?? prompt.key}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(null);
    }
  }

  const promptsByKey = useMemo(() => new Map(prompts.map((prompt) => [prompt.key, prompt])), [prompts]);
  const dirtyCount = prompts.filter((prompt) => prompt.instruction !== prompt.originalInstruction).length;
  const latestUpdate = prompts
    .map((prompt) => prompt.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = groups
    .filter((group) => activeGroup === "Tất cả" || group.title === activeGroup)
    .map((group) => ({
      ...group,
      prompts: group.keys
        .map((key) => promptsByKey.get(key))
        .filter((prompt): prompt is EditablePrompt => Boolean(prompt))
        .filter((prompt) => {
          if (!normalizedQuery) return true;
          return `${labels[prompt.key] ?? prompt.key} ${prompt.key} ${prompt.instruction}`.toLowerCase().includes(normalizedQuery);
        }),
    }))
    .filter((group) => group.prompts.length > 0);

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
        <Sidebar responsive mobileOpen={mobileMenuOpen} activeHref="/it-staff" />
        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d97757]">IT Staff</p>
                <h1 className="font-libertine mt-3 text-4xl leading-none sm:text-5xl">Cấu hình AI</h1>
                <p className="mt-4 text-sm leading-6 text-[#6b6b6b]">
                  Quản lý chỉ dẫn hệ thống cho các luồng tạo giáo án, slide và mô phỏng. Các thay đổi được áp dụng cho lần sinh nội dung kế tiếp.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:w-[480px]">
                <Metric icon={<SlidersHorizontal className="size-4" />} label="Prompt" value={String(prompts.length)} />
                <Metric icon={<AlertCircle className="size-4" />} label="Đã chỉnh" value={String(dirtyCount)} />
                <Metric icon={<Clock3 className="size-4" />} label="Cập nhật" value={latestUpdate ? formatUpdatedAt(latestUpdate) : "Chưa có"} compact />
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-3 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                  <label className="flex h-10 items-center gap-2 rounded-lg border border-[#d8d1c9] bg-white px-3 text-sm text-[#6b6b6b] focus-within:border-[#d97757]">
                    <Search className="size-4 shrink-0" aria-hidden />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Tìm prompt"
                      className="min-w-0 flex-1 bg-transparent text-[#1f1f1f] outline-none placeholder:text-[#9d978f]"
                    />
                  </label>

                  <div className="mt-3 space-y-1">
                    {["Tất cả", ...groups.map((group) => group.title)].map((title) => {
                      const active = title === activeGroup;
                      const group = groups.find((item) => item.title === title);
                      const count = title === "Tất cả" ? prompts.length : group?.keys.filter((key) => promptsByKey.has(key)).length ?? 0;
                      return (
                        <button
                          key={title}
                          type="button"
                          onClick={() => setActiveGroup(title)}
                          className={`flex h-10 w-full items-center justify-between rounded-lg px-3 text-sm font-medium transition ${
                            active ? "bg-[#1f1f1f] text-white" : "text-[#5f5a54] hover:bg-[#edeae5] hover:text-[#1f1f1f]"
                          }`}
                        >
                          <span>{title}</span>
                          <span className={active ? "text-white/70" : "text-[#9d978f]"}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 text-sm text-[#6b6b6b] shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                  <p className="font-medium text-[#1f1f1f]">{user?.fullName ?? user?.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#d97757]">Nhân viên IT</p>
                  <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#d8d1c9] bg-white px-3 text-sm font-medium text-[#1f1f1f] transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
                    Tải lại
                  </button>
                </div>
              </aside>

              <section className="min-w-0">
                {message && (
                  <div className="mb-5 flex items-start gap-3 rounded-lg border border-[#d8d1c9] bg-white px-4 py-3 text-sm text-[#4f4943] shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#7c8f59]" aria-hidden />
                    <p>{message}</p>
                  </div>
                )}

                {loading ? (
                  <div className="rounded-lg border border-[#d8d1c9] bg-white p-8 text-sm text-[#6b6b6b] shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                    Đang tải cấu hình AI...
                  </div>
                ) : visibleGroups.length === 0 ? (
                  <div className="rounded-lg border border-[#d8d1c9] bg-white p-8 text-sm text-[#6b6b6b] shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                    Không có prompt phù hợp.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {visibleGroups.map((group) => (
                      <section key={group.title} aria-labelledby={`prompt-group-${group.title}`}>
                        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <h2 id={`prompt-group-${group.title}`} className="text-lg font-semibold text-[#1f1f1f]">{group.title}</h2>
                            <p className="mt-1 text-sm text-[#6b6b6b]">{group.subtitle}</p>
                          </div>
                          <span className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] px-3 py-1.5 text-xs font-medium text-[#6b6b6b]">
                            {group.prompts.length} prompt
                          </span>
                        </div>

                        <div className="grid gap-4">
                          {group.prompts.map((prompt) => (
                            <PromptCard
                              key={prompt.key}
                              prompt={prompt}
                              accent={group.accent}
                              saving={saving === prompt.key}
                              onChange={(instruction) =>
                                setPrompts((items) => items.map((item) => (item.key === prompt.key ? { ...item, instruction } : item)))
                              }
                              onSave={() => void save(prompt)}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8178]">
        {icon}
        {label}
      </div>
      <div className={`mt-3 font-semibold text-[#1f1f1f] ${compact ? "text-sm leading-5" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function PromptCard({
  prompt,
  accent,
  saving,
  onChange,
  onSave,
}: {
  prompt: EditablePrompt;
  accent: string;
  saving: boolean;
  onChange: (instruction: string) => void;
  onSave: () => void;
}) {
  const dirty = prompt.instruction !== prompt.originalInstruction;
  const words = wordCount(prompt.instruction);

  return (
    <article className="rounded-lg border border-[#d8d1c9] bg-white p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
            <h3 className="text-base font-semibold text-[#1f1f1f]">{labels[prompt.key] ?? prompt.key}</h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#8a8178]">
            <span className="rounded-lg bg-[#f5f1ec] px-2 py-1 font-mono">{prompt.key}</span>
            <span className="rounded-lg bg-[#f5f1ec] px-2 py-1">{words} từ</span>
            <span className="rounded-lg bg-[#f5f1ec] px-2 py-1">Cập nhật: {formatUpdatedAt(prompt.updatedAt)}</span>
            {dirty && <span className="rounded-lg bg-[#fff2e9] px-2 py-1 font-medium text-[#c96545]">Chưa lưu</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || !dirty || !prompt.instruction.trim()}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1f1f1f] px-4 text-sm font-medium text-white transition hover:bg-[#34312e] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Save className="size-4" aria-hidden />
          {saving ? "Đang lưu" : "Lưu"}
        </button>
      </div>

      <textarea
        value={prompt.instruction}
        onChange={(event) => onChange(event.target.value)}
        rows={8}
        className="mt-4 min-h-48 w-full resize-y rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 text-sm leading-6 text-[#2b2926] outline-none transition placeholder:text-[#9d978f] focus:border-[#d97757] focus:bg-white"
        spellCheck={false}
      />
    </article>
  );
}

export default function ItStaffPage() {
  return (
    <RouteGuard pathname="/it-staff">
      <ItStaffContent />
    </RouteGuard>
  );
}
