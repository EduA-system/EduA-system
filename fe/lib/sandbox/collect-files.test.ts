import { describe, expect, it } from "vitest";
import { getExperiment, listExperiments } from "@/lib/sandbox/react-experiments";
import { SANDPACK_DEPENDENCIES } from "@/lib/sandbox/sandpack-project";

/**
 * Lưới an toàn cho `/sandbox`.
 *
 * Cây `components/simulations/` không có ràng buộc nào ép nó tự chứa: thêm một
 * import alias `@/` vào renderer vẫn lint/typecheck/build sạch trong Next,
 * nhưng bundler Sandpack không biết alias nên iframe chết bằng
 * ModuleNotFoundError — chỉ hiện lúc chạy, không ai thấy lúc review.
 *
 * Test này dựng đúng danh sách file mà `/sandbox` gửi cho Sandpack rồi kiểm
 * mọi import trong đó có giải được không, cho TẤT CẢ thí nghiệm.
 */

/** Package thật sự có trong dự án Sandpack (xem SANDPACK_DEPENDENCIES + template CRA). */
const ALLOWED_PACKAGES = [...Object.keys(SANDPACK_DEPENDENCIES), "react", "react-dom"];

const SOURCE_EXT = /\.(t|j)sx?$/;
const IMPORT_RE = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
/** Cách CRA/webpack dò file khi specifier không có đuôi. */
const RESOLUTION_SUFFIXES = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];

function isPackage(spec: string): boolean {
  return ALLOWED_PACKAGES.some((name) => spec === name || spec.startsWith(name + "/"));
}

/**
 * Ghép specifier với thư mục của file gọi, theo kiểu đường dẫn Sandpack.
 * `/App.tsx` do sandbox tự sinh dùng đường dẫn tuyệt đối (`/simulations/...`),
 * còn mã trong cây simulations dùng tương đối — xử lý cả hai.
 */
function resolveInProject(fromPath: string, spec: string): string {
  const segments = spec.startsWith("/") ? [] : fromPath.split("/").slice(0, -1).filter(Boolean);
  for (const part of spec.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }
  return "/" + segments.join("/");
}

/**
 * Bỏ chú thích trước khi dò import — vài file (shim next/dynamic) có ví dụ
 * `import("./x")` nằm trong comment, không phải phụ thuộc thật.
 */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

type Unresolved = { experiment: string; file: string; spec: string };

function unresolvedImports(files: Record<string, string>, experiment: string): Unresolved[] {
  const out: Unresolved[] = [];
  for (const [path, code] of Object.entries(files)) {
    if (!SOURCE_EXT.test(path)) continue;
    for (const match of stripComments(code).matchAll(IMPORT_RE)) {
      const spec = match[1]!;
      if (isPackage(spec)) continue;
      if (!spec.startsWith(".") && !spec.startsWith("/")) {
        out.push({ experiment, file: path, spec });
        continue;
      }
      const target = resolveInProject(path, spec);
      if (!RESOLUTION_SUFFIXES.some((suffix) => files[target + suffix] !== undefined)) {
        out.push({ experiment, file: path, spec });
      }
    }
  }
  return out;
}

describe("collectSimulationFiles", () => {
  const experiments = listExperiments();

  it("quét được ít nhất một thí nghiệm", () => {
    expect(experiments.length).toBeGreaterThan(0);
  });

  it("mọi import trong mọi thí nghiệm đều resolve được trong dự án Sandpack", () => {
    const broken: Unresolved[] = [];
    for (const summary of experiments) {
      const experiment = getExperiment(summary.id);
      expect(experiment, summary.id).not.toBeNull();
      broken.push(...unresolvedImports(experiment!.files, summary.id));
    }
    // In ra đủ để biết sửa ở đâu, thay vì chỉ "expected 12 to be 0".
    expect(broken.map((b) => `${b.experiment}: ${b.file} → ${b.spec}`)).toEqual([]);
  });

  it("không còn alias @/ trong mã gửi cho Sandpack", () => {
    const leaked: string[] = [];
    for (const summary of experiments) {
      for (const [path, code] of Object.entries(getExperiment(summary.id)!.files)) {
        if (code.includes('"@/') || code.includes("'@/")) leaked.push(`${summary.id}: ${path}`);
      }
    }
    expect(leaked).toEqual([]);
  });

  it("kéo theo file mà alias @/components/simulations/ trỏ tới", () => {
    // Coulomb import `@/components/simulations/shared/typography` — chính ca đã
    // làm iframe chết. File đích phải có mặt và import phải thành tương đối.
    const coulomb = getExperiment("can-xoan-coulomb");
    expect(coulomb, "preset can-xoan-coulomb").not.toBeNull();
    expect(coulomb!.files["/simulations/shared/typography.ts"]).toBeDefined();
    expect(coulomb!.files["/simulations/renderers/coulomb-torsion-balance/coulomb-torsion-balance-scene.tsx"])
      .toContain('from "../../shared/typography"');
  });
});
