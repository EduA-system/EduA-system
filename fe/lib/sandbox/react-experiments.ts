import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  collectSimulationFiles,
  readPresetExportName,
  SIM_PREFIX,
  type SandboxFileMap,
} from "./collect-files";

/**
 * Quét `components/simulations/presets/`, ghép mỗi preset với renderer đúng
 * họ của nó, rồi đóng gói thành một dự án Sandpack chạy React.
 *
 * KHÔNG chép code: mọi file mô phỏng đọc thẳng từ đĩa (xem collect-files.ts).
 * Thứ duy nhất sinh mới là `/App.tsx` — khoảng 60 dòng dán preset vào renderer,
 * tương ứng phần điều phối mà `app/mo-phong-vat-ly/page.tsx` đang làm.
 */

const SIM_ROOT = resolve(process.cwd(), "components/simulations");
const PRESET_DIR = resolve(SIM_ROOT, "presets");

/** Họ engine → renderer đảm nhiệm. Gương của bảng điều phối trong trang thật. */
const RENDERER_BY_KIND: Record<string, { file: string; component: string }> = {
  mechanics: { file: "renderers/mechanics/scene-konva-2d.tsx", component: "SceneKonva2D" },
  wave: { file: "renderers/wave/scene-konva-wave-2d.tsx", component: "SceneKonvaWave2D" },
  "string-wave": { file: "renderers/string-wave/scene-konva-string-wave.tsx", component: "SceneKonvaStringWave" },
  "wave-field": { file: "renderers/wave-field/scene-canvas-wave-field.tsx", component: "SceneCanvasWaveField" },
  "point-charge-field": { file: "renderers/point-charge-field/scene-canvas-point-charge-field.tsx", component: "SceneCanvasPointChargeField" },
  rotation: { file: "renderers/rotation/scene-konva-rotation.tsx", component: "SceneKonvaRotation" },
  "magnetic-loop": { file: "renderers/magnetic-loop/scene-konva-ac-generator.tsx", component: "SceneKonvaAcGenerator" },
  magnetism: { file: "renderers/magnetism/scene-konva-magnetism.tsx", component: "SceneKonvaMagnetism" },
  "iron-filings": { file: "renderers/iron-filings/scene-konva-iron-filings.tsx", component: "SceneKonvaIronFilings" },
  "parallel-current-sheets": { file: "renderers/parallel-current-sheets/scene-konva-parallel-current-sheets.tsx", component: "SceneKonvaParallelCurrentSheets" },
  "electromagnetic-induction": { file: "renderers/electromagnetic-induction/scene-konva-electromagnetic-induction.tsx", component: "SceneKonvaElectromagneticInduction" },
  "variable-current-induction": { file: "renderers/electromagnetic-induction/scene-konva-variable-current-induction.tsx", component: "SceneKonvaVariableCurrentInduction" },
};

export type ReactExperiment = {
  id: string;
  title: string;
  domain: string;
  kind: string;
  /** File mô phỏng thật, đường dẫn đã theo Sandpack. */
  files: SandboxFileMap;
  /** Đường dẫn preset trong Sandpack — để mở sẵn trong editor. */
  presetPath: string;
  /** Số file thật phải kéo theo (hiển thị cho người dùng biết chi phí). */
  fileCount: number;
};

/** Đọc một trường chuỗi ở cấp cao nhất của object preset. */
function readTopLevelString(code: string, field: string): string | null {
  const match = code.match(new RegExp(`^\\s*${field}:\\s*"([^"]*)"`, "m"));
  return match ? match[1]! : null;
}

/**
 * `kind` của LỰC, RÀNG BUỘC và ANNOTATION — không phải họ engine.
 * Phải loại chúng ra khi dò, vì preset cơ học đầy `kind: "gravity"`,
 * `kind: "rod"`, `kind: "vector"`… bên trong applyParams.
 */
const NON_ENGINE_KINDS = new Set([
  // forces
  "gravity", "spring", "drag", "applied", "coulomb",
  // constraints
  "rod", "rope", "surface", "curveTrack", "rightAngleRope",
  // annotations (engines/mechanics/types.ts + shared/scene-types.ts)
  "vector", "springVector", "springActionReaction", "photogateTimer",
  "circularMotionVectors", "pendulumResultant",
  "arrow", "velocity", "label", "rect", "polygon", "arc", "curve",
]);

/**
 * Họ engine của preset. Vắng `kind` nghĩa là cơ học (xem presets/types.ts).
 *
 * KHÔNG dò theo vị trí dòng: vài preset viết `kind` giữa dòng, ví dụ
 * `presets/tu-pho.ts` có ` id:"tu-pho", kind:"iron-filings", ...`. Dò theo
 * tập giá trị hợp lệ thay vì theo thụt lề, và trả về nguyên `kind` lạ (thay
 * vì mặc định về "mechanics") để họ chưa hỗ trợ hiện ra thay vì vỡ ngầm.
 */
function readKind(code: string): string {
  for (const match of code.matchAll(/kind:\s*"([a-zA-Z-]+)"/g)) {
    const value = match[1]!;
    if (!NON_ENGINE_KINDS.has(value)) return value;
  }
  return "mechanics";
}

/**
 * Preset "vỏ rỗng": `params: []` và `applyParams` trả cảnh trống. Đây là chỗ
 * giữ metadata cho các thí nghiệm tự dựng UI riêng — trang thật điều phối
 * chúng bằng `preset.id` sang component riêng, không qua renderer theo `kind`.
 *
 * Phải loại, nếu không `becquerel-uranium-kinh-anh` và `nut-bac-bat` (hai
 * preset KHÔNG khai báo `kind`) sẽ bị coi là cơ học và render ra cảnh trống.
 * Đã đối chiếu: cả 23 preset `params: []` trên main đều thuộc loại này, và
 * không preset thật nào có params rỗng.
 */
function isShellPreset(code: string): boolean {
  return /params:\s*\[\s*\]/.test(code);
}

/**
 * `/App.tsx` — mã DUY NHẤT được sinh mới.
 *
 * Bám sát cách `GenericDetailView` trong trang thật làm: memo hoá scene và
 * các nhãn/chú thích. Nếu gọi thẳng `applyParams(params)` trong JSX thì mỗi
 * render sẽ tạo object mới → useEffect của renderer chạy lại → dựng lại stage
 * → vòng lặp vô hạn ("Maximum update depth exceeded").
 */
function buildAppSource(
  presetPath: string,
  presetExport: string,
  rendererPath: string,
  rendererComponent: string,
  kind: string,
): string {
  const isMechanics = kind === "mechanics";
  return `import { useMemo, useState } from "react";
import { ${rendererComponent} } from "${rendererPath}";
import { ${presetExport} } from "${presetPath}";
import { ParamPanel } from "${SIM_PREFIX}/shared/param-panel";

/**
 * Vỏ chạy thử — phần điều phối tối thiểu, tương ứng GenericDetailView của
 * app thật. Mọi thứ khác trong dự án này là FILE THẬT đọc từ repo, không sửa.
 */
export default function App() {
  const preset = ${presetExport} as any;

  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(preset.params.map((p: any) => [p.key, p.default])),
  );
  const [running, setRunning] = useState(!preset.startPaused);
  const [resetSignal, setResetSignal] = useState(0);
  const [speed, setSpeed] = useState(1);

  // applyParams là nguồn duy nhất dựng Scene. PHẢI memo — xem chú thích trên.
  const scene = useMemo(() => preset.applyParams(params), [preset, params]);
${
  isMechanics
    ? `  const annotations = useMemo(() => preset.annotations?.(params), [preset, params]);
  const bodyLabels = useMemo(() => {
    const bl = preset.bodyLabels;
    return typeof bl === "function" ? bl(params) : bl;
  }, [preset, params]);
  const bodySigns = useMemo(() => {
    const bs = preset.bodySigns;
    return typeof bs === "function" ? bs(params) : bs;
  }, [preset, params]);
`
    : ""
}
  return (
    <div style={{ display: "flex", height: "100vh", background: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: 8 }}>
        <div style={{ flex: 1, minHeight: 0, borderRadius: 14, overflow: "hidden", border: "1px solid #e8e2d9" }}>
          <${rendererComponent}
            scene={scene as any}
            running={running}
            resetSignal={resetSignal}
            onRunningChange={setRunning}
            speed={speed}
${isMechanics ? `            annotations={annotations}\n            bodyLabels={bodyLabels}\n            bodySigns={bodySigns}\n            bodyColors={preset.bodyColors}\n            bodyTrails={preset.bodyTrails}\n            minimalOverlay={preset.minimalOverlay}\n` : ""}          />
        </div>
        <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 13, color: "#6b6b6b" }}>
          {preset.objective}
        </p>
      </div>

      <aside style={{ width: 320, flexShrink: 0, borderLeft: "1px solid #e8e2d9", padding: 16, overflowY: "auto" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{preset.title}</div>
        <div style={{ fontSize: 11, color: "#8a8178", marginBottom: 12 }}>
          {preset.domain} · Lớp {preset.grade}{preset.sgkRef ? " · " + preset.sgkRef : ""}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => setRunning((r) => !r)} style={btn(running)}>
            {running ? "Tạm dừng" : "Chạy"}
          </button>
          <button
            onClick={() => {
              setParams(Object.fromEntries(preset.params.map((p: any) => [p.key, p.default])));
              setResetSignal((n) => n + 1);
              setRunning(!preset.startPaused);
            }}
            style={btn(false)}
          >
            Đặt lại
          </button>
          {[0.5, 1, 2].map((s) => (
            <button key={s} onClick={() => setSpeed(s)} style={btn(speed === s)}>
              {s}×
            </button>
          ))}
        </div>

        {preset.paramGuide && (
          <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "#6b6b6b", background: "#faf9f7", padding: 10, borderRadius: 8 }}>
            {preset.paramGuide}
          </p>
        )}

        {/* ParamPanel THẬT của app (Tweakpane), không phải bản dựng lại. */}
        <ParamPanel
          schema={preset.params}
          values={params}
          onChange={(key: string, value: number) =>
            setParams((old) => ({ ...old, [key]: value }))
          }
        />
      </aside>
    </div>
  );
}

function btn(active: boolean): React.CSSProperties {
  return {
    borderRadius: 8,
    border: "1px solid " + (active ? "#e8724a" : "#e8e2d9"),
    background: active ? "#e8724a" : "#fff",
    color: active ? "#fff" : "#4f4943",
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}
`;
}

let cache: ReactExperiment[] | null = null;

/** Danh mục thí nghiệm chạy được, dựng từ preset có thật trên nhánh hiện tại. */
export function loadReactExperiments(): ReactExperiment[] {
  if (cache) return cache;

  const experiments: ReactExperiment[] = [];

  for (const name of readdirSync(PRESET_DIR).sort()) {
    if (!name.endsWith(".ts")) continue;
    if (name.endsWith(".test.ts") || name === "types.ts" || name === "index.ts") continue;

    const relPath = "presets/" + name;
    const code = readFileSync(resolve(PRESET_DIR, name), "utf8");
    if (isShellPreset(code)) continue;
    const kind = readKind(code);
    const renderer = RENDERER_BY_KIND[kind];
    // Họ chưa map renderer (brownian, heating-curve, cloud-chamber…) dùng
    // component tự chứa riêng, không khớp hợp đồng scene/running — bỏ qua,
    // hiển thị riêng ở danh sách "chưa hỗ trợ" thay vì vỡ âm thầm.
    if (!renderer) continue;

    const presetExport = readPresetExportName(relPath);
    if (!presetExport) continue;

    const files = collectSimulationFiles([
      relPath,
      renderer.file,
      "shared/param-panel.tsx",
    ]);

    const presetPath = SIM_PREFIX + "/" + relPath;
    files["/App.tsx"] = buildAppSource(
      // Import phải BỎ đuôi .ts — webpack/CRA không resolve specifier có đuôi.
      presetPath.replace(/\.tsx?$/, ""),
      presetExport,
      SIM_PREFIX + "/" + renderer.file.replace(/\.tsx$/, ""),
      renderer.component,
      kind,
    );

    experiments.push({
      id: name.replace(/\.ts$/, ""),
      title: readTopLevelString(code, "title") ?? name,
      domain: readTopLevelString(code, "domain") ?? "—",
      kind,
      files,
      presetPath,
      fileCount: Object.keys(files).length - 1, // trừ /App.tsx
    });
  }

  cache = experiments;
  return experiments;
}

/** Preset có mặt nhưng chưa chạy được vì họ engine chưa map renderer. */
export function loadUnsupportedPresets(): { id: string; title: string; kind: string }[] {
  const out: { id: string; title: string; kind: string }[] = [];
  for (const name of readdirSync(PRESET_DIR).sort()) {
    if (!name.endsWith(".ts")) continue;
    if (name.endsWith(".test.ts") || name === "types.ts" || name === "index.ts") continue;
    const code = readFileSync(resolve(PRESET_DIR, name), "utf8");
    const shell = isShellPreset(code);
    const kind = readKind(code);
    if (!shell && RENDERER_BY_KIND[kind]) continue;
    out.push({
      id: name.replace(/\.ts$/, ""),
      title: readTopLevelString(code, "title") ?? name,
      // Vỏ rỗng không khai báo kind (becquerel, nút bấc) — ghi rõ lý do bỏ
      // qua thay vì hiện "mechanics" gây hiểu nhầm.
      kind: shell && !RENDERER_BY_KIND[kind] ? kind : shell ? "giao diện riêng" : kind,
    });
  }
  return out;
}
