"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CHAMBER_BOUNDS, DEFAULT_CLOUD_CHAMBER_PARAMS } from "../engines/cloud-chamber/constants";
import { cloudChamberMetrics, createCloudChamberState } from "../engines/cloud-chamber/physics";
import { PHASE_LABELS } from "../engines/cloud-chamber/state-machine";
import { TRACK_NAMES } from "../engines/cloud-chamber/analysis";
import type {
  CloudChamberCommand,
  CloudChamberMetrics,
  CloudChamberObservation,
  CloudChamberParams,
  ObservationTrack,
  ParticleType,
} from "../engines/cloud-chamber/types";
import type { CloudChamberPreset } from "../presets/types";
import { ParamPanel, type ParamDef } from "../shared/param-panel";
import { SimulationTabs, type SimulationTab } from "../shared/simulation-tabs";
import { SimulationToolbar } from "../shared/simulation-toolbar";
import { CloudChamberScene } from "../renderers/cloud-chamber/cloud-chamber-scene";

const PARAM_SCHEMA: ParamDef[] = [
  { key: "topTemperature", label: "Nhiệt độ phần trên", unit: "°C", min: 15, max: 32, step: 1 },
  { key: "baseTemperature", label: "Nhiệt độ đáy lạnh", unit: "°C", min: -85, max: -35, step: 1 },
  { key: "ipaAmount", label: "Lượng IPA 99%", unit: "%", min: 25, max: 100, step: 1 },
];

const TRACK_COLORS: Record<ParticleType, string> = {
  alpha: "#f59e0b",
  proton: "#06b6d4",
  oxygen17: "#c084fc",
};

function formatLength(value: number): string {
  return `${(value / 10).toFixed(1)} cm`;
}

function MetricGrid({
  metrics,
  observation,
}: {
  metrics: CloudChamberMetrics;
  observation: CloudChamberObservation | null;
}) {
  const capturedLength = (type: ParticleType, fallback: number) =>
    observation?.tracks.find((track) => track.particleType === type)?.length ?? fallback;
  const eventType = observation?.eventType ?? metrics.eventType;
  const items = [
    ["Trạng thái buồng", PHASE_LABELS[metrics.phase]],
    ["Siêu bão hòa", metrics.supersaturation >= 1 && metrics.sensitivityWindow > 0 ? "Lớp đáy đang nhạy" : "Chưa hình thành"],
    ["Phần trên", `${metrics.topTemperature.toFixed(1)} °C`],
    ["Đáy lạnh", `${metrics.baseTemperature.toFixed(1)} °C`],
    ["Hơi IPA", `${(metrics.ipaVapor * 100).toFixed(0)}%`],
    ["Loại sự kiện", eventType === "blackett" ? "Phản ứng Blackett" : eventType === "normal" ? "Vệt α thông thường" : "Chưa có"],
    ["Hạt α đã phát", String(metrics.counters.alphasEmitted)],
    ["Vệt đã quan sát", String(metrics.counters.tracksObserved)],
    ["Phản ứng ghi nhận", String(metrics.counters.reactionsRecorded)],
    ["Năng lượng α", `${metrics.alphaEnergy.toFixed(0)}%`],
    ["Độ dài vệt α", formatLength(capturedLength("alpha", metrics.alphaLength))],
    ["Độ dài proton", formatLength(capturedLength("proton", metrics.protonLength))],
    ["Độ dài ¹⁷O", formatLength(capturedLength("oxygen17", metrics.oxygenLength))],
    ["Cửa sổ nhạy còn", `${metrics.sensitivityWindow.toFixed(1)} s`],
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-[8px] bg-[#faf9f7] px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-[#8a8178]">{label}</div>
          <div className="mt-1 text-[12px] font-semibold text-[#171717]">{value}</div>
        </div>
      ))}
    </div>
  );
}

function TrackDiagram({ tracks }: { tracks: ObservationTrack[] }) {
  if (tracks.length === 0) return <p className="text-xs text-[#8a8178]">Chưa có ảnh chụp để phân loại vệt.</p>;
  const mapX = (x: number) => 18 + ((x - CHAMBER_BOUNDS.left) / (CHAMBER_BOUNDS.right - CHAMBER_BOUNDS.left)) * 244;
  const mapY = (y: number) => 16 + ((y - CHAMBER_BOUNDS.top) / (CHAMBER_BOUNDS.bottom - CHAMBER_BOUNDS.top)) * 88;
  return (
    <svg viewBox="0 0 280 120" className="h-32 w-full rounded-[10px] bg-[#0f172a]" role="img" aria-label="Sơ đồ phân loại các vệt hạt từ ảnh hiện tại">
      {tracks.map((track) => (
        <g key={track.id}>
          <line
            x1={mapX(track.start.x)}
            y1={mapY(track.start.y)}
            x2={mapX(track.end.x)}
            y2={mapY(track.end.y)}
            stroke={TRACK_COLORS[track.particleType]}
            strokeWidth={Math.max(1.2, track.width * 0.7)}
            strokeLinecap="round"
          />
          <text x={Math.min(238, mapX(track.end.x) + 4)} y={Math.max(12, mapY(track.end.y) - 4)} fill="#e2e8f0" fontSize="9" fontWeight="500">
            {TRACK_NAMES[track.particleType]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function TrackChart({ tracks }: { tracks: ObservationTrack[] }) {
  const maxLength = Math.max(1, ...tracks.map((track) => track.length));
  return (
    <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#171717]">Chiều dài và độ đậm tương đối</p>
      <svg viewBox="0 0 280 126" className="h-36 w-full" role="img" aria-label="Biểu đồ dữ liệu vệt của lần chạy hiện tại">
        <path d="M76 10V108H272" fill="none" stroke="#d8d1c9" />
        {tracks.map((track, index) => {
          const y = 24 + index * 34;
          const width = (track.length / maxLength) * 174;
          return (
            <g key={track.id}>
              <text x="2" y={y + 7} fontSize="9" fill="#6b6b6b">{TRACK_NAMES[track.particleType]}</text>
              <rect x="78" y={y - 4} width={width} height="12" rx="5" fill={TRACK_COLORS[track.particleType]} opacity={0.34 + Math.min(0.6, track.ionizationDensity / 4)} />
              <text x={Math.min(252, 84 + width)} y={y + 6} fontSize="8" fill="#4f4943">{formatLength(track.length)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AnalysisPanel({
  metrics,
  observation,
}: {
  metrics: CloudChamberMetrics;
  observation: CloudChamberObservation | null;
}) {
  const tracks = observation?.tracks ?? [];
  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} observation={observation} />
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="mb-3 text-[13px] font-semibold text-[#171717]">Ảnh chụp sự kiện</p>
        {observation?.imageDataUrl ? (
          <Image
            src={observation.imageDataUrl}
            alt="Ảnh chụp vệt hạt trong buồng sương của lần chạy hiện tại"
            width={1000}
            height={620}
            unoptimized
            className="h-auto w-full rounded-[10px] border border-[#e8e2d9] bg-[#0f172a]"
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-[10px] bg-[#0f172a] text-xs text-slate-400">Chạy mô phỏng để chụp ảnh sự kiện.</div>
        )}
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="mb-3 text-[13px] font-semibold text-[#171717]">Sơ đồ phân loại ba vệt</p>
        <TrackDiagram tracks={tracks} />
        <p className="mt-2 text-[10px] leading-relaxed text-[#8a8178]">Màu chỉ dùng để phân loại: α vàng nhạt, proton cyan, oxygen-17 tím nhạt; không phải màu thật của hạt.</p>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-[#e8e2d9] bg-white">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#faf9f7] text-[#8a8178]"><tr><th className="px-3 py-2 font-semibold">Vệt</th><th className="px-3 py-2 font-semibold">Dài</th><th className="px-3 py-2 font-semibold">Độ đậm</th></tr></thead>
          <tbody>
            {tracks.map((track) => (
              <tr key={track.id} className="border-t border-[#f0ece5]"><td className="px-3 py-2 font-medium text-[#4f4943]">{TRACK_NAMES[track.particleType]}</td><td className="px-3 py-2 tabular-nums">{formatLength(track.length)}</td><td className="px-3 py-2 tabular-nums">{track.ionizationDensity.toFixed(2)}</td></tr>
            ))}
            {tracks.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-[#8a8178]">Chưa có dữ liệu vệt.</td></tr>}
          </tbody>
        </table>
      </div>
      <TrackChart tracks={tracks} />
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4">
        <p className="mb-3 text-[13px] font-semibold text-[#171717]">Timeline quá trình</p>
        {observation?.events.length ? observation.events.map((event) => (
          <div key={`${event.phase}-${event.time}`} className="mt-2 flex gap-2 text-xs"><span className="w-12 shrink-0 font-sans text-[#c96545]">{event.time.toFixed(1)} s</span><span className="text-[#4f4943]">{event.label}</span></div>
        )) : <p className="text-xs text-[#8a8178]">Timeline sẽ được ghi từ lần chạy hiện tại.</p>}
      </div>
      <div className="rounded-[12px] border border-[#e8e2d9] bg-white p-4 text-center">
        <p className="font-sans text-xl font-bold text-[#171717]">¹⁴₇N + ⁴₂He → ¹⁷₈O + ¹₁H</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-left text-xs"><div className="rounded-[8px] bg-emerald-50 p-3 text-emerald-900"><b>Số khối</b><br />14 + 4 = 17 + 1</div><div className="rounded-[8px] bg-emerald-50 p-3 text-emerald-900"><b>Điện tích hạt nhân</b><br />7 + 2 = 8 + 1</div></div>
      </div>
      {observation?.eventType === "blackett" && (
        <div className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#4f4943]">
          Vệt tới là hạt α; vệt dài, mảnh là proton; vệt ngắn, đậm là hạt nhân oxygen-17. Không có vệt α đi tiếp sau đỉnh va chạm, cho thấy hạt α đã được hạt nhân nitơ hấp thụ.
        </div>
      )}
      <p className="rounded-[10px] bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
        Trong buồng mây, các giọt IPA ngưng tụ dọc theo đường ion hóa giúp quan sát quỹ đạo của các hạt mang điện. Ở sự kiện Blackett, vệt hạt α kết thúc tại điểm va chạm và từ đó xuất hiện vệt proton cùng vệt hạt nhân oxygen-17. Điều này cho thấy hạt α đã được hạt nhân nitơ trong không khí hấp thụ.
      </p>
    </div>
  );
}

export function BlackettCloudChamberExperiment({
  preset,
  onBack,
}: {
  preset: CloudChamberPreset;
  onBack: () => void;
}) {
  const [params, setParams] = useState<CloudChamberParams>(DEFAULT_CLOUD_CHAMBER_PARAMS);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<SimulationTab>("params");
  const [edited, setEdited] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [command, setCommand] = useState<{ type: CloudChamberCommand; token: number }>({ type: "startCycle", token: 0 });
  const [metrics, setMetrics] = useState(() => cloudChamberMetrics(createCloudChamberState(DEFAULT_CLOUD_CHAMBER_PARAMS, "blackett"), DEFAULT_CLOUD_CHAMBER_PARAMS));
  const [observation, setObservation] = useState<CloudChamberObservation | null>(null);

  const sendCommand = (type: CloudChamberCommand) => setCommand((current) => ({ type, token: current.token + 1 }));
  const reset = () => {
    setRunning(false);
    setSpeed(1);
    setObservation(null);
    setResetSignal((value) => value + 1);
  };
  const restoreDefaults = () => {
    setParams(DEFAULT_CLOUD_CHAMBER_PARAMS);
    setEdited(false);
    reset();
  };
  const changeRunning = (next: boolean) => {
    if (next) sendCommand(metrics.phase === "idle" ? "startCycle" : "resume");
    else sendCommand("pause");
    setRunning(next);
  };
  const panelValues = useMemo<Record<string, number>>(() => ({ ...params }), [params]);

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/mo-phong-vat-ly" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#171717]"><ChevronLeft className="h-5 w-5" />Thư viện</button>
          <span className="text-[#d8d1c9]">/</span>
          <span className="truncate text-[14px] font-semibold text-[#171717]">{preset.title}</span>
          <span className={`ml-auto hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium sm:flex ${edited ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}><span className="size-1.5 rounded-full bg-current" />{edited ? "Đã chỉnh sửa" : "Bản gốc đã kiểm duyệt"}</span>
          {edited && <button type="button" onClick={restoreDefaults} className="hidden items-center gap-1.5 rounded-[9px] border border-[#e8e2d9] px-3 py-1.5 text-[12px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee] sm:flex"><RotateCcw className="h-3.5 w-3.5" />Khôi phục</button>}
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
              <CloudChamberScene
                params={params}
                mode="blackett"
                running={running}
                speed={speed}
                resetSignal={resetSignal}
                command={command}
                showFog
                showLabels
                classificationColors={false}
                onData={setMetrics}
                onPhotograph={setObservation}
                onCycleComplete={() => setRunning(false)}
              />
              <SimulationToolbar running={running} speed={speed} onRunningChange={changeRunning} onReset={reset} onSpeedChange={setSpeed} />
            </div>
            <p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]">Các vệt là chuỗi giọt IPA ngưng tụ quanh ion trong lớp hơi siêu bão hòa sát đáy lạnh, không phải tia sáng phát ra từ hạt.</p>
          </section>

          <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <SimulationTabs value={tab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "params" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#6b6b6b]">IPA 99% bay hơi từ lớp nỉ ấm phía trên rồi khuếch tán xuống bản đáy đặt trên đá khô. Gần đáy lạnh, hơi IPA trở nên siêu bão hòa và ngưng tụ quanh ion do hạt mang điện tạo ra.</p>
                  <div className="rounded-[10px] border border-[#e8e2d9] bg-white p-3 text-xs leading-relaxed text-[#6b6b6b]">
                    <b className="text-[#4f4943]">Cách đọc mô phỏng</b>
                    <div className="mt-2 space-y-1.5">
                      <p><b>1.</b> Lớp nỉ phía trên thấm IPA 99% và được giữ ấm để cồn bay hơi.</p>
                      <p><b>2.</b> Hơi IPA đi xuống; đá khô làm phần đáy lạnh hơn rất nhiều so với phần trên.</p>
                      <p><b>3.</b> Ngay trên đáy hình thành một lớp hơi IPA siêu bão hòa trông như sương mỏng.</p>
                      <p><b>4.</b> Hạt mang điện ion hóa không khí; IPA ngưng tụ quanh chuỗi ion nên quỹ đạo hiện thành vệt.</p>
                    </div>
                  </div>
                  <ParamPanel schema={PARAM_SCHEMA} values={panelValues} onChange={(key, value) => { setParams((current) => ({ ...current, [key]: value })); setEdited(true); reset(); }} />
                  <p className="text-[10px] leading-relaxed text-[#8a8178]">Các hệ số trên là giá trị mô phỏng giáo dục để thể hiện quan hệ trực quan, không phải số liệu đo chính xác của thiết bị Blackett.</p>
                </div>
              )}
              {tab === "analysis" && <AnalysisPanel metrics={metrics} observation={observation} />}
              {tab === "ai" && (
                <div className="space-y-4">
                  <p className="rounded-[10px] bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><b>Power user.</b> Đây là luồng Sửa bằng AI chung của khu vực mô phỏng; dịch vụ AI thật chưa được kết nối.</p>
                  <div className="flex flex-wrap gap-2">{["Giải thích buồng sương đơn giản hơn", "Làm vệt hạt rõ hơn", "Giải thích vì sao proton có vệt dài hơn", "Tạo câu hỏi kiểm tra", "Hiện bảo toàn số khối và điện tích", "So sánh va chạm đàn hồi với phản ứng hạt nhân"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setAiPrompt(suggestion)} className="rounded-full border border-[#e8e2d9] px-3 py-1 text-xs text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]">{suggestion}</button>)}</div>
                  <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} placeholder="Mô tả thay đổi bạn muốn…" className="w-full resize-none rounded-[12px] border border-[#e8e2d9] p-3 text-sm outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/15" />
                  <button type="button" disabled className="w-full rounded-[12px] bg-[#e8724a] py-2.5 text-sm font-semibold text-white opacity-40">Gửi cho AI</button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
