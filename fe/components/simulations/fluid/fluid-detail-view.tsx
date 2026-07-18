"use client";

// Màn chi tiết cho thí nghiệm CHẤT LƯU TĨNH — song song với DetailView của
// preset cơ học, nhưng KHÔNG dùng kernel/SceneKonva2D. Sân khấu là một khung SVG
// vẽ trạng thái tĩnh từ tham số; panel bên phải tái dùng ParamPanel + bảng phân
// tích. Không có nút chạy/dừng vì đây là cân bằng tĩnh (không tích phân thời gian).

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ParamPanel } from "@/components/simulations/shared/param-panel";
import type { FluidSim } from "./types";

const H = 520; // chiều cao khung SVG (px)

export function FluidDetailView({ sim, onBack }: { sim: FluidSim; onBack: () => void }) {
  const baseParams = Object.fromEntries(sim.params.map((p) => [p.key, p.default]));
  const [params, setParams] = useState<Record<string, number>>(baseParams);
  const [tab, setTab] = useState<"params" | "analysis">("params");
  const [edited, setEdited] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const revertAll = () => {
    setParams(baseParams);
    setEdited(false);
  };

  const readings = sim.analysis?.readings ?? [];

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors duration-150 ease-out hover:text-[#171717]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            Thư viện
          </button>
          <span className="text-[#d8d1c9]">/</span>
          <span className="text-[14px] font-semibold text-[#171717]">{sim.title}</span>
          <span
            className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
              edited ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {edited ? "Đã chỉnh sửa" : "Bản gốc đã kiểm duyệt"}
          </span>
          {edited && (
            <button
              onClick={revertAll}
              className="flex items-center gap-1.5 rounded-[10px] border border-[#e8e2d9] px-3 py-1.5 text-[12px] font-semibold text-[#4f4943] transition-colors duration-150 ease-out hover:bg-[#f7f3ee]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              Khôi phục bản gốc
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sim stage */}
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
            <div className="w-full">
              <div
                ref={stageRef}
                className="overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm"
              >
                {w > 0 && (
                  <svg width={w} height={H} style={{ display: "block", background: "#0f172a" }}>
                    {sim.Stage({ params, width: w, height: H })}
                  </svg>
                )}
              </div>
              <p className="mt-3 text-center text-[13px] text-[#6b6b6b]">{sim.objective}</p>
            </div>
          </div>

          {/* Customize panel */}
          <div className="flex w-96 shrink-0 flex-col border-l border-[#e8e2d9] bg-white">
            <div className="flex shrink-0 border-b border-[#e8e2d9] px-2">
              {([
                ["params", "Tham số"],
                ["analysis", "Phân tích"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`relative px-3 py-3 text-sm font-medium transition-colors duration-150 ease-out ${
                    tab === k ? "text-[#c96545]" : "text-[#8a8178] hover:text-[#4f4943]"
                  }`}
                >
                  {label}
                  {tab === k && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[#e8724a]" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tab === "params" ? (
                <ParamPanel
                  schema={sim.params}
                  values={params}
                  onChange={(key, value) => {
                    setParams((prev) => ({ ...prev, [key]: value }));
                    setEdited(true);
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {readings.map((r) => (
                    <div key={r.key} className="rounded-[12px] border border-[#e8e2d9] p-3">
                      <h4 className="text-[13px] font-semibold text-[#171717]">{r.label}</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#6b6b6b]">{r.description}</p>
                      <div className="mt-2 space-y-1">
                        {r.values(params).map((v, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-[#6b6b6b]">{v.label}</span>
                            <span className="font-mono tabular-nums text-[#171717]">
                              {v.value}
                              {v.unit ? <span className="ml-1 text-[#8a8178]">{v.unit}</span> : null}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
