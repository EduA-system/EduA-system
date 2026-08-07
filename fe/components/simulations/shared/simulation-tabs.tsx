"use client";

export type SimulationTab = "params" | "analysis" | "ai";

export function SimulationTabs({ value, onChange, showAi = true }: { value: SimulationTab; onChange: (tab: SimulationTab) => void; showAi?: boolean }) {
  const tabs = ([['params', 'Tham số'], ['analysis', 'Phân tích'], ['ai', 'Sửa bằng AI']] as const).filter(([key]) => showAi || key !== "ai");
  return <div className="flex shrink-0 border-b border-[#e8e2d9] px-2">{tabs.map(([key, label]) => <button type="button" key={key} onClick={() => onChange(key)} className={`relative px-3 py-3 text-sm font-medium transition-colors duration-150 ease-out ${value === key ? "text-[#c96545]" : "text-[#6b6b6b] hover:text-[#171717]"}`}>{label}{value === key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-[#e8724a]" />}</button>)}</div>;
}
