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
 * Chạy được là nhờ `components/simulations/` tự chứa hoàn toàn: 0 file dùng
 * alias `@/`, và chỉ phụ thuộc 4 package ngoài (react, konva, lucide-react,
 * tweakpane) — tất cả đều khai báo cho Sandpack cài được.
 */

const SIM_ROOT = resolve(process.cwd(), "components/simulations");

/** Tiền tố đường dẫn trong Sandpack. Giữ nguyên cấu trúc thư mục thật để mọi
 *  import tương đối (`../../engines/...`) resolve y hệt như trong repo. */
export const SIM_PREFIX = "/simulations";

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
 * Đi từ các file gốc, gom toàn bộ bao đóng phụ thuộc tương đối.
 * Khoá trả về là đường dẫn trong Sandpack (`/simulations/...`).
 */
export function collectSimulationFiles(entries: string[]): SandboxFileMap {
  const out: SandboxFileMap = {};
  const seen = new Set<string>();
  const queue = entries.map((entry) => resolve(SIM_ROOT, entry));

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!existsSync(file)) continue;

    const code = readFileSync(file, "utf8");
    const key = SIM_PREFIX + "/" + relative(SIM_ROOT, file).split("\\").join("/");
    out[key] = code;

    for (const match of code.matchAll(IMPORT_RE)) {
      const dep = resolveImport(file, match[1]!);
      if (dep) queue.push(dep);
    }
  }

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
