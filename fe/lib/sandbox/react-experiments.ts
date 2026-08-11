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

/**
 * Thí nghiệm TỰ DỰNG GIAO DIỆN — không chạy qua renderer theo `kind` mà là
 * một component trọn màn hình. Preset của chúng là vỏ rỗng (`params: []`),
 * chỉ giữ metadata.
 *
 * `needsPreset` phản ánh hai chữ ký props có thật trong trang gốc:
 *   true  → <X preset={preset} onBack={...} />
 *   false → <X onBack={...} />          (trang gốc bọc thêm LegacyExperimentLayout)
 */
type SelfContained = { file: string; component: string; needsPreset: boolean };
type SpecialScene = { file: string; component: string };

/** Điều phối theo `preset.id` — 9 thí nghiệm chỉ nhận `onBack`. */
const SELF_CONTAINED_BY_ID: Record<string, SelfContained> = {
  "nut-bac-bat-noi-nang-thanh-cong": { file: "thermodynamics/cork-experiment.tsx", component: "CorkExperiment", needsPreset: false },
  "becquerel-uranium-lam-den-kinh-anh": { file: "radiography/becquerel-experiment.tsx", component: "BecquerelExperiment", needsPreset: false },
  "tac-dung-tu-cua-dong-dien-chuong-dien": { file: "circuit/electric-bell-experiment.tsx", component: "ElectricBellExperiment", needsPreset: false },
  "tac-dung-nhiet-dong-dien-day-sat-dot-giay": { file: "circuit/thermal-wire-experiment.tsx", component: "ThermalWireExperiment", needsPreset: false },
  "dac-trung-va-dien-tro-bong-den-day-toc": { file: "circuit/va-characteristic-experiment.tsx", component: "VaCharacteristicExperiment", needsPreset: false },
  "do-suat-dien-dong-e-cua-pin": { file: "circuit/emf-measurement-experiment.tsx", component: "EmfMeasurementExperiment", needsPreset: false },
  "do-nhiet-dung-rieng-c-cua-nuoc": { file: "circuit/water-calorimetry-experiment.tsx", component: "WaterCalorimetryExperiment", needsPreset: false },
  "do-nhiet-nong-chay-rieng-lambda-cua-nuoc-da": { file: "circuit/ice-fusion-experiment.tsx", component: "IceFusionExperiment", needsPreset: false },
  "do-nhiet-hoa-hoi-rieng-l-cua-nuoc": { file: "circuit/water-vaporization-experiment.tsx", component: "WaterVaporizationExperiment", needsPreset: false },
};

/** Điều phối theo `kind` — nhận cả `preset` lẫn `onBack`. */
const SELF_CONTAINED_BY_KIND: Record<string, SelfContained> = {
  // Trang chính dùng component này thay vì renderer Konva thuần vì nó có đồ thị
  // từ thông/EMF, trạng thái Lenz và bảng phân tích riêng.
  "electromagnetic-induction": {
    file: "electromagnetic-induction/ElectromagneticInductionExperiment.tsx",
    component: "ElectromagneticInductionExperiment",
    needsPreset: true,
  },
  brownian: { file: "brownian/BrownianDetailView.tsx", component: "BrownianDetailView", needsPreset: true },
  "heating-curve": { file: "heating-curve/HeatingCurveDetailView.tsx", component: "HeatingCurveDetailView", needsPreset: true },
  "pendulum-resonance": { file: "pendulum-resonance/PendulumResonanceDetailView.tsx", component: "PendulumResonanceDetailView", needsPreset: true },
  "heat-transfer": { file: "heat-transfer/HeatTransferDetailView.tsx", component: "HeatTransferDetailView", needsPreset: true },
  "isothermal-boyle": { file: "isothermal-boyle/IsothermalBoyleDetailView.tsx", component: "IsothermalBoyleDetailView", needsPreset: true },
  "isobaric-process": { file: "isobaric-process/IsobaricProcessDetailView.tsx", component: "IsobaricProcessDetailView", needsPreset: true },
  "hooke-law": { file: "hooke-law/HookeLawExperiment.tsx", component: "HookeLawExperiment", needsPreset: true },
  "cloud-chamber": { file: "cloud-chamber/BlackettCloudChamberExperiment.tsx", component: "BlackettCloudChamberExperiment", needsPreset: true },
  "magnetic-deflection": { file: "magnetic-deflection/MagneticDeflectionExperiment.tsx", component: "MagneticDeflectionExperiment", needsPreset: true },
  "coulomb-torsion-balance": { file: "coulomb-torsion-balance/CoulombTorsionBalanceExperiment.tsx", component: "CoulombTorsionBalanceExperiment", needsPreset: true },
  "oscilloscope-frequency": { file: "oscilloscope-frequency/OscilloscopeFrequencyExperiment.tsx", component: "OscilloscopeFrequencyExperiment", needsPreset: true },
  "water-surface-wave": { file: "water-surface-wave/WaterSurfaceWaveExperiment.tsx", component: "WaterSurfaceWaveExperiment", needsPreset: true },
  "rutherford-nitrogen": { file: "rutherford-nitrogen/RutherfordNitrogenExperiment.tsx", component: "RutherfordNitrogenExperiment", needsPreset: true },
  "rutherford-scattering": { file: "rutherford-scattering/RutherfordScatteringExperiment.tsx", component: "RutherfordScatteringExperiment", needsPreset: true },
  // `cork-pop` không nằm trong PRESETS index nên app không hiển thị, nhưng
  // component vẫn đầy đủ — sandbox nhận thêm được thí nghiệm này.
  "cork-pop": { file: "cork-pop/CorkPopDetailView.tsx", component: "CorkPopDetailView", needsPreset: true },
};

/** Hai cảnh Newton có canvas và mô hình vật lý riêng, không dùng SceneKonva2D. */
const SPECIAL_SCENE_BY_ID: Record<string, SpecialScene> = {
  "dinh-luat-2-newton": {
    file: "newton-second-law/NewtonSecondLawRaceScene.tsx",
    component: "NewtonSecondLawRaceScene",
  },
  "dinh-luat-3-newton": {
    file: "newton-third-law/NewtonThirdLawScene.tsx",
    component: "NewtonThirdLawScene",
  },
};

/** Một thí nghiệm kèm mã nguồn — metadata (ExperimentSummary) + file. */
export type ReactExperiment = ExperimentSummary & {
  /** File mô phỏng thật, đường dẫn đã theo Sandpack. */
  files: SandboxFileMap;
  /**
   * File mở sẵn trong editor — nơi chứa phần đáng đọc nhất của thí nghiệm:
   * preset (nếu chạy qua renderer theo kind), hoặc chính component (nếu thí
   * nghiệm tự dựng giao diện, vì preset khi đó chỉ là vỏ giữ metadata).
   */
  focusPath: string;
  /** Số file thật phải kéo theo (hiển thị cho người dùng biết chi phí). */
  fileCount: number;
};

/**
 * Vị trí bắt đầu object preset (`export const xyz: Preset = {`).
 *
 * Mọi trường phải đọc TỪ ĐÂY trở đi, không phải từ đầu file: nhiều preset khai
 * báo hằng số và hàm dựng cảnh phía trên, trong đó có cả `id` của từng vật.
 * `mat-nghieng-ma-sat.ts` có `id: "vat"` ở dòng 130, còn id thật ở dòng 231.
 */
function presetObjectOffset(code: string): number {
  const match = code.match(/export\s+const\s+[A-Za-z0-9_$]+\s*[:=]/);
  return match?.index ?? 0;
}

/**
 * Đọc một trường chuỗi của object preset.
 *
 * KHÔNG neo đầu dòng: vài preset viết dồn nhiều trường trên một dòng, ví dụ
 * `presets/tu-pho.ts` có ` id:"tu-pho", kind:"iron-filings", domain:"Điện & Từ"`.
 * Neo `^\s*` sẽ bỏ sót và trả về null.
 */
function readTopLevelString(code: string, field: string): string | null {
  const body = code.slice(presetObjectOffset(code));
  const match = body.match(new RegExp(`\\b${field}:\\s*"([^"]*)"`));
  return match ? match[1]! : null;
}

/** Như readTopLevelString nhưng cho trường số (grade). */
function readTopLevelNumber(code: string, field: string): number | null {
  const body = code.slice(presetObjectOffset(code));
  const match = body.match(new RegExp(`\\b${field}:\\s*(\\d+)`));
  return match ? Number(match[1]) : null;
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
  // Chỉ dò trong object preset — hằng số và hàm dựng cảnh phía trên cũng chứa
  // `kind` (của lực, ràng buộc…), xem presetObjectOffset.
  const body = code.slice(presetObjectOffset(code));
  for (const match of body.matchAll(/kind:\s*"([a-zA-Z-]+)"/g)) {
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
/**
 * `/App.tsx` cho thí nghiệm tự dựng giao diện.
 *
 * Component đã tự lo canvas, bảng tham số và thanh công cụ, nên vỏ ở đây chỉ
 * còn việc cấp `preset` (khi cần) và một `onBack` không làm gì — trong sandbox
 * không có thư viện để quay về.
 */
/**
 * Đếm số file MÃ NGUỒN THẬT đọc từ repo — bỏ `/App.tsx` (vỏ sinh ra) và các
 * shim (hạ tầng thay thế), để con số hiện lên UI đúng nghĩa "file thật".
 */
function countRealFiles(files: SandboxFileMap): number {
  return Object.keys(files).filter(
    (path) => path !== "/App.tsx" && !path.includes("__shims__"),
  ).length;
}

function buildSelfContainedApp(
  target: SelfContained,
  componentPath: string,
  presetPath: string,
  presetExport: string,
): string {
  const presetImport = target.needsPreset
    ? `import { ${presetExport} } from "${presetPath}";\n`
    : "";
  const presetProp = target.needsPreset
    ? ` preset={${presetExport} as any}`
    : "";

  return `import { ${target.component} } from "${componentPath}";
${presetImport}
/**
 * Vỏ chạy thử — thí nghiệm này tự dựng toàn bộ giao diện, nên đây chỉ là chỗ
 * gắn props. Mọi file khác là FILE THẬT đọc từ repo, không sửa.
 */
export default function App() {
  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: "#f5f1ec" }}>
      <${target.component}${presetProp} onBack={() => {}} />
    </div>
  );
}
`;
}

/** Vỏ Sandpack cho các scene chuyên biệt có cùng chữ ký props với trang chính. */
function buildSpecialSceneApp(
  scene: SpecialScene,
  componentPath: string,
  presetPath: string,
  presetExport: string,
): string {
  return `import { useState } from "react";
import { ${scene.component} } from "${componentPath}";
import { ${presetExport} } from "${presetPath}";
import { ParamPanel } from "${SIM_PREFIX}/shared/param-panel";

export default function App() {
  const preset = ${presetExport} as any;
  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(preset.params.map((p: any) => [p.key, p.default])),
  );
  const [running, setRunning] = useState(!preset.startPaused);
  const [resetSignal, setResetSignal] = useState(0);
  const [speed, setSpeed] = useState(1);

  const reset = () => {
    setParams(Object.fromEntries(preset.params.map((p: any) => [p.key, p.default])));
    setResetSignal((value) => value + 1);
    setRunning(!preset.startPaused);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ flex: 1, minWidth: 0, padding: 8 }}>
        <div style={{ height: "100%", overflow: "hidden", borderRadius: 14, border: "1px solid #e8e2d9" }}>
          <${scene.component}
            params={params}
            running={running}
            speed={speed}
            resetSignal={resetSignal}
            onRunningChange={setRunning}
          />
        </div>
      </div>
      <aside style={{ width: 320, flexShrink: 0, borderLeft: "1px solid #e8e2d9", padding: 16, overflowY: "auto" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{preset.title}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => setRunning((value) => !value)}>{running ? "Tạm dừng" : "Chạy"}</button>
          <button onClick={reset}>Đặt lại</button>
          {[0.5, 1, 2].map((value) => <button key={value} onClick={() => setSpeed(value)}>{value}×</button>)}
        </div>
        <ParamPanel
          schema={preset.params}
          values={params}
          onChange={(key: string, value: number) => setParams((old) => ({ ...old, [key]: value }))}
        />
      </aside>
    </div>
  );
}
`;
}

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
/** Đích render của một preset: renderer theo `kind`, hay component tự dựng. */
type Target =
  | { mode: "renderer"; renderer: { file: string; component: string } }
  | { mode: "self-contained"; target: SelfContained }
  | { mode: "special-scene"; target: SpecialScene };

/**
 * Chọn đích GIỐNG trang thật: ưu tiên `preset.id`, rồi tới `kind`, cuối cùng
 * mới tới renderer theo `kind`. Xem DetailView trong app/mo-phong-vat-ly.
 * Trả null nếu không có gì chạy được (vỏ rỗng không map, hoặc kind lạ).
 */
function resolveTarget(code: string, presetId: string, kind: string): Target | null {
  const selfContained = SELF_CONTAINED_BY_ID[presetId] ?? SELF_CONTAINED_BY_KIND[kind];
  if (selfContained) return { mode: "self-contained", target: selfContained };
  const specialScene = SPECIAL_SCENE_BY_ID[presetId];
  if (specialScene) return { mode: "special-scene", target: specialScene };
  if (isShellPreset(code)) return null;
  const renderer = RENDERER_BY_KIND[kind];
  return renderer ? { mode: "renderer", renderer } : null;
}

/** Metadata một thí nghiệm — đủ để dựng thẻ trong thư viện, KHÔNG kèm mã nguồn. */
export type ExperimentSummary = {
  /** Tên file preset, dùng làm URL `/sandbox/<id>`. */
  id: string;
  /**
   * `id` preset TỰ khai báo — khác tên file ở 13 preset (vd `brownian.ts` khai
   * `brownian-pollen`). Ảnh thu nhỏ khoá theo giá trị này, nên phải truyền nó
   * cho <Thumb>, không phải tên file.
   */
  presetId: string;
  title: string;
  domain: string;
  grade: number | null;
  desc: string;
  kind: string;
  mode: "renderer" | "self-contained";
};

type ScannedPreset = {
  fileName: string;
  relPath: string;
  code: string;
  summary: ExperimentSummary;
  target: Target;
};

let scanCache: ScannedPreset[] | null = null;

/**
 * Quét thư mục preset một lần. CHỈ đọc file preset (vài KB mỗi cái) — việc gom
 * cây phụ thuộc (hàng trăm KB) để dành cho getExperiment, nên trang danh sách
 * không phải trả giá cho cả 60 thí nghiệm.
 */
function scanPresets(): ScannedPreset[] {
  if (scanCache) return scanCache;

  const out: ScannedPreset[] = [];
  for (const name of readdirSync(PRESET_DIR).sort()) {
    if (!name.endsWith(".ts")) continue;
    if (name.endsWith(".test.ts") || name === "types.ts" || name === "index.ts") continue;

    const relPath = "presets/" + name;
    const code = readFileSync(resolve(PRESET_DIR, name), "utf8");
    if (!readPresetExportName(relPath)) continue;

    const kind = readKind(code);
    const presetId = readTopLevelString(code, "id") ?? "";
    const target = resolveTarget(code, presetId, kind);
    if (!target) continue;

    out.push({
      fileName: name,
      relPath,
      code,
      target,
      summary: {
        id: name.replace(/\.ts$/, ""),
        presetId: presetId || name.replace(/\.ts$/, ""),
        title: readTopLevelString(code, "title") ?? name,
        domain: readTopLevelString(code, "domain") ?? "—",
        grade: readTopLevelNumber(code, "grade"),
        desc: readTopLevelString(code, "desc") ?? "",
        // Thí nghiệm tự dựng giao diện thì `kind` của preset không nói lên
        // cách chạy — ghi rõ để thẻ trong thư viện không gây hiểu nhầm.
        kind: target.mode === "self-contained" && !target.target.needsPreset
          ? "giao diện riêng"
          : kind,
        // Cảnh chuyên biệt vẫn là một renderer từ góc nhìn thư viện; chỉ cách
        // dựng `/App.tsx` khác với renderer Konva chung.
        mode: target.mode === "special-scene" ? "renderer" : target.mode,
      },
    });
  }

  scanCache = out;
  return out;
}

/** Metadata mọi thí nghiệm chạy được — cho trang thư viện. */
export function listExperiments(): ExperimentSummary[] {
  return scanPresets().map((p) => p.summary);
}

/** Một thí nghiệm kèm TOÀN BỘ mã nguồn để nạp vào Sandpack. */
export function getExperiment(id: string): ReactExperiment | null {
  const found = scanPresets().find((p) => p.summary.id === id);
  if (!found) return null;

  const presetExport = readPresetExportName(found.relPath)!;
  const presetPath = SIM_PREFIX + "/" + found.relPath;
  // Import phải BỎ đuôi — webpack/CRA không resolve specifier có đuôi file.
  const presetImportPath = presetPath.replace(/\.tsx?$/, "");

  if (found.target.mode === "self-contained") {
    const sc = found.target.target;
    const files = collectSimulationFiles([found.relPath, sc.file]);
    const componentPath = SIM_PREFIX + "/" + sc.file.replace(/\.tsx$/, "");
    files["/App.tsx"] = buildSelfContainedApp(
      sc,
      componentPath,
      presetImportPath,
      presetExport,
    );
    return {
      ...found.summary,
      files,
      // Mở thẳng file component — nơi chứa toàn bộ logic của thí nghiệm này,
      // vì preset của nó chỉ là vỏ giữ metadata.
      focusPath: componentPath + ".tsx",
      fileCount: countRealFiles(files),
    };
  }

  if (found.target.mode === "special-scene") {
    const specialScene = found.target.target;
    const files = collectSimulationFiles([
      found.relPath,
      specialScene.file,
      "shared/param-panel.tsx",
    ]);
    const componentPath = SIM_PREFIX + "/" + specialScene.file.replace(/\.tsx$/, "");
    files["/App.tsx"] = buildSpecialSceneApp(
      specialScene,
      componentPath,
      presetImportPath,
      presetExport,
    );
    return {
      ...found.summary,
      files,
      focusPath: componentPath + ".tsx",
      fileCount: countRealFiles(files),
    };
  }

  const renderer = found.target.renderer;
  const files = collectSimulationFiles([
    found.relPath,
    renderer.file,
    "shared/param-panel.tsx",
  ]);
  files["/App.tsx"] = buildAppSource(
    presetImportPath,
    presetExport,
    SIM_PREFIX + "/" + renderer.file.replace(/\.tsx$/, ""),
    renderer.component,
    readKind(found.code),
  );
  return {
    ...found.summary,
    files,
    focusPath: presetPath,
    fileCount: countRealFiles(files),
  };
}

/**
 * Preset có trong repo nhưng sandbox chưa chạy được. Suy ra từ CHÍNH kết quả
 * quét, nên hai danh sách không thể lệch nhau khi thêm ánh xạ mới.
 */
export function loadUnsupportedPresets(): { id: string; title: string; kind: string }[] {
  const supported = new Set(scanPresets().map((p) => p.summary.id));
  const out: { id: string; title: string; kind: string }[] = [];

  for (const name of readdirSync(PRESET_DIR).sort()) {
    if (!name.endsWith(".ts")) continue;
    if (name.endsWith(".test.ts") || name === "types.ts" || name === "index.ts") continue;
    const id = name.replace(/\.ts$/, "");
    if (supported.has(id)) continue;

    const code = readFileSync(resolve(PRESET_DIR, name), "utf8");
    out.push({
      id,
      title: readTopLevelString(code, "title") ?? name,
      kind: readKind(code),
    });
  }
  return out;
}
