// Chỉ chạy phía server (đọc đĩa bằng node:fs). Không thêm package
// `server-only` để tránh phụ thuộc mới — `node:fs` tự nó đã khiến file này
// không bundle được vào client, và nó chỉ được import từ Server Component.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Gom mã nguồn THẬT của `components/simulations/` để nạp vào Sandpack.
 *
 * Điểm mấu chốt: KHÔNG chép code. Hàm này đọc thẳng file trên đĩa lúc build,
 * đi theo cây import tương đối và trả về đúng nội dung hiện tại của nhánh
 * đang checkout. Sửa `components/simulations/` là sandbox tự cập nhật theo,
 * không có bản sao nào để trôi.
 *
 * Phần lớn cây này tự chứa (chỉ import tương đối) và chỉ cần 4 package ngoài:
 * react, konva, lucide-react, tweakpane. Hai ngoại lệ được xử lý bằng shim,
 * xem SPECIFIER_SHIMS bên dưới.
 */

const SIM_ROOT = resolve(process.cwd(), "components/simulations");

/** Tiền tố đường dẫn trong Sandpack. Giữ nguyên cấu trúc thư mục thật để mọi
 *  import tương đối (`../../engines/...`) resolve y hệt như trong repo. */
export const SIM_PREFIX = "/simulations";

/** Nơi đặt shim, nằm trong cây simulations để đường dẫn tương đối ngắn gọn. */
const SHIM_DIR = "__shims__";

/**
 * Hai specifier không giải được trong dự án Sandpack, phải trỏ sang shim:
 *
 *   `@/components/layout/Sidebar` — alias `@/` là của tsconfig Next, bundler
 *     Sandpack không biết; mà kéo Sidebar thật vào thì lôi theo next/link,
 *     next/navigation, AuthContext và cả WebSocket thông báo.
 *   `next/dynamic` — không có Next.js trong dự án CRA; `ssr: false` cũng vô
 *     nghĩa vì không có server nào để tắt.
 *
 * Cả hai đều là hạ tầng của app, KHÔNG thuộc về thí nghiệm. Việc thay thế
 * diễn ra lúc phát sinh file (đọc → viết lại → gửi đi), không sửa file trên
 * đĩa và không lưu bản sao nào.
 */
const SPECIFIER_SHIMS: Record<string, string> = {
  "@/components/layout/Sidebar": SHIM_DIR + "/sidebar",
  "next/dynamic": SHIM_DIR + "/next-dynamic",
  "next/image": SHIM_DIR + "/next-image",
};

/**
 * Nội dung hai shim. Chúng chỉ tồn tại trong danh sách file gửi cho Sandpack,
 * KHÔNG được ghi ra đĩa và không có trong repo.
 */
const SHIM_FILES: Record<string, string> = {
  [`${SIM_PREFIX}/${SHIM_DIR}/sidebar.tsx`]: `// Thế chỗ @/components/layout/Sidebar.
//
// Sidebar thật là thanh điều hướng của app: nó kéo theo next/link,
// next/navigation, AuthContext (JWT) và WebSocket thông báo — không thứ nào
// chạy được, hay cần thiết, trong sandbox. Thí nghiệm nằm ở nhánh <div> bên
// cạnh nên bỏ thanh này đi không ảnh hưởng gì.
export function Sidebar(_props: { activeHref?: string }) {
  return null;
}
`,

  [`${SIM_PREFIX}/${SHIM_DIR}/next-dynamic.tsx`]: `// Thế chỗ next/dynamic.
//
// Trong app thật, dynamic(..., { ssr: false }) dùng để KHÔNG prerender các
// component canvas trên server (chúng đụng window/devicePixelRatio). Dự án
// Sandpack chạy hoàn toàn phía client nên mối lo đó không tồn tại; ở đây chỉ
// cần tải module rồi render.
import { lazy, Suspense, type ComponentType } from "react";

type Loader = () => Promise<unknown>;

export default function dynamic<P extends object>(
  loader: Loader,
  _options?: { ssr?: boolean; loading?: ComponentType },
) {
  const Lazy = lazy(async () => {
    const loaded = (await loader()) as
      | ComponentType<P>
      | { default: ComponentType<P> };
    // Các lời gọi trong repo trả về THẲNG component:
    //   dynamic(() => import("./x").then((m) => m.XCanvas), { ssr: false })
    // còn React.lazy đòi dạng { default: Component } — chuẩn hoá tại đây.
    return typeof loaded === "function" ? { default: loaded } : loaded;
  });

  return function DynamicComponent(props: P) {
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
`,

  [`${SIM_PREFIX}/${SHIM_DIR}/next-image.tsx`]: `// Thế chỗ next/image.
//
// next/image tối ưu ảnh qua server của Next (đổi kích thước, định dạng). Chỗ
// duy nhất dùng nó (buồng sương Blackett) truyền data URL kèm cờ \`unoptimized\`,
// tức đã tự tắt phần tối ưu — nên thẻ <img> thường cho kết quả y hệt.
type Props = {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  unoptimized?: boolean;
  priority?: boolean;
  fill?: boolean;
};

export default function Image({
  unoptimized: _unoptimized,
  priority: _priority,
  fill: _fill,
  alt = "",
  ...rest
}: Props) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} {...rest} />;
}
`,
};

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

/** Đổi một specifier tương đối thành file thật trên đĩa. */
function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null; // package npm — Sandpack tự cài
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => join(base, "index" + ext)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

// Bắt cả `from "x"`, `import "x"`, `export * from "x"`. Đủ dùng cho cây này
// (không có require động hay import() biến).
const IMPORT_RE = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

export type SandboxFileMap = Record<string, string>;

/**
 * Đường dẫn tương đối từ một file trong cây simulations tới thư mục shim.
 * `simulations/brownian/X.tsx` → `../__shims__/…`
 * `simulations/renderers/mechanics/X.tsx` → `../../__shims__/…`
 */
function shimPrefixFor(relativeFilePath: string): string {
  const depth = relativeFilePath.split("/").length - 1;
  return depth === 0 ? "./" : "../".repeat(depth);
}

/**
 * Trỏ các specifier không giải được sang shim tương ứng.
 * Chỉ đụng đúng những khoá liệt kê trong SPECIFIER_SHIMS; mọi import khác
 * giữ nguyên từng ký tự.
 */
function rewriteShimImports(code: string, relativeFilePath: string): string {
  let out = code;
  for (const [spec, target] of Object.entries(SPECIFIER_SHIMS)) {
    if (!out.includes(spec)) continue;
    const rel = shimPrefixFor(relativeFilePath) + target;
    // Thay cả "x" lẫn 'x', giữ nguyên loại dấu nháy của dòng gốc.
    out = out
      .split('"' + spec + '"')
      .join('"' + rel + '"')
      .split("'" + spec + "'")
      .join("'" + rel + "'");
  }
  return out;
}

/**
 * Đi từ các file gốc, gom toàn bộ bao đóng phụ thuộc tương đối.
 * Khoá trả về là đường dẫn trong Sandpack (`/simulations/...`).
 */
export function collectSimulationFiles(entries: string[]): SandboxFileMap {
  const out: SandboxFileMap = {};
  const seen = new Set<string>();
  const queue = entries.map((entry) => resolve(SIM_ROOT, entry));
  let needsShims = false;

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!existsSync(file)) continue;

    const code = readFileSync(file, "utf8");
    const rel = relative(SIM_ROOT, file).split("\\").join("/");
    if (Object.keys(SPECIFIER_SHIMS).some((spec) => code.includes(spec))) {
      needsShims = true;
    }
    out[SIM_PREFIX + "/" + rel] = rewriteShimImports(code, rel);

    for (const match of code.matchAll(IMPORT_RE)) {
      const dep = resolveImport(file, match[1]!);
      if (dep) queue.push(dep);
    }
  }

  // Chỉ kèm shim khi thật sự có file cần — thí nghiệm scene-based không đụng tới.
  if (needsShims) Object.assign(out, SHIM_FILES);

  return out;
}

/**
 * Tên biến được export từ một preset (vd `con-lac-don.ts` → `conLacDon`).
 * Đọc từ file thay vì hardcode, để đổi tên bên kia không làm sandbox vỡ ngầm.
 */
export function readPresetExportName(presetFile: string): string | null {
  const full = resolve(SIM_ROOT, presetFile);
  if (!existsSync(full)) return null;
  const code = readFileSync(full, "utf8");
  const match = code.match(/export\s+const\s+([A-Za-z0-9_$]+)\s*[:=]/);
  return match ? match[1]! : null;
}

/** Preset có tồn tại trên nhánh đang checkout không. */
export function simulationFileExists(relativePath: string): boolean {
  return existsSync(resolve(SIM_ROOT, relativePath));
}
