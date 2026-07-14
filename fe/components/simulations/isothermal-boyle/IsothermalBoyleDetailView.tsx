"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { IsothermalBoylePreset } from "../presets/types";
import { calculateState, resetIsothermalExperiment } from "./physics";
import { IsothermalBoyleCanvas } from "./isothermal-boyle-canvas";
import { IsothermalBoylePanel } from "./isothermal-boyle-panel";
import type { BoyleParams } from "./types";

export function IsothermalBoyleDetailView({ preset, onBack }: { preset: IsothermalBoylePreset; onBack: () => void }) {
  const [params, setParams] = useState<BoyleParams>(resetIsothermalExperiment());
  const [edited, setEdited] = useState(false);
  const [panelTab, setPanelTab] = useState<"params" | "analysis" | "ai">("params");
  const stateA = useMemo(() => calculateState({ volume: params.volumeA, temperature: params.temperature }), [params.volumeA, params.temperature]);
  const stateB = useMemo(() => calculateState({ volume: params.volumeB, temperature: params.temperature }), [params.volumeB, params.temperature]);

  const updateParams = (patch: Partial<BoyleParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setEdited(true);
  };

  const reset = () => {
    setParams(resetIsothermalExperiment());
    setEdited(false);
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] hover:text-[#171717]">
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            Thư viện
          </button>
          <span className="text-[#d8d1c9]">/</span>
          <span className="truncate text-[14px] font-semibold text-[#171717]">{preset.title}</span>
          <span className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${edited ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            <span className="size-1.5 rounded-full bg-current" />
            {edited ? "Đã chỉnh sửa" : "Bản gốc đã kiểm duyệt"}
          </span>
          {edited && (
            <button type="button" onClick={reset} className="hidden items-center gap-1.5 rounded-[9px] border border-[#e8e2d9] px-3 py-1.5 text-[12px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee] sm:flex">
              <RotateCcw className="h-3.5 w-3.5" />
              Khôi phục
            </button>
          )}
        </header>

        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
                <IsothermalBoyleCanvas params={params} onParamsChange={updateParams} />
              </div>
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] text-[#6b6b6b]">{preset.objective}</p>
          </div>
          <IsothermalBoylePanel
            params={params}
            stateA={stateA}
            stateB={stateB}
            panelTab={panelTab}
            onPanelTabChange={setPanelTab}
            onParamsChange={updateParams}
            onReset={reset}
          />
        </div>
      </div>
    </main>
  );
}
