// Tải bộ icon OpenMoji (CC BY-SA 4.0) cho thư viện slide-assets và sinh manifest.
// Chạy: node scripts/fetch-slide-assets.mjs
// Bytes -> fe/public/slide-assets/icons ; metadata -> fe/lib/slide-assets/manifest.json
import { writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(ROOT, "fe");
const ICON_DIR = join(FE, "public", "slide-assets", "icons");
const BG_DIR = join(FE, "public", "slide-assets", "backgrounds");
const MANIFEST = join(FE, "lib", "slide-assets", "manifest.json");
const CREDITS = join(FE, "public", "slide-assets", "CREDITS.md");
const VER = "15.0.0";

// codepoint OpenMoji -> tên file mô tả + tags (EN + VI) cho matchIcon.
const ICONS = [
  { cp: "1F9EA", name: "test-tube", tags: ["test tube", "tube", "ong nghiem", "reaction", "sample", "liquid", "chemistry"] },
  { cp: "2697", name: "alembic", tags: ["alembic", "distillation", "chung cat", "apparatus", "flask", "chemistry"] },
  { cp: "1F9EB", name: "petri-dish", tags: ["petri dish", "culture", "bacteria", "dia petri", "sample", "biology"] },
  { cp: "1F52C", name: "microscope", tags: ["microscope", "kinh hien vi", "lab", "observe", "magnify", "biology"] },
  { cp: "1F52D", name: "telescope", tags: ["telescope", "kinh thien van", "astronomy", "observe", "space"] },
  { cp: "1F9F2", name: "magnet", tags: ["magnet", "nam cham", "magnetic", "force", "field", "physics"] },
  { cp: "269B", name: "atom", tags: ["atom", "nguyen tu", "nucleus", "physics", "particle", "molecule", "electron"] },
  { cp: "1F9EC", name: "dna", tags: ["dna", "gene", "biology", "di truyen", "helix", "molecule"] },
  { cp: "1F4A7", name: "droplet", tags: ["droplet", "water", "drop", "giot nuoc", "liquid", "solution"] },
  { cp: "1F525", name: "fire", tags: ["fire", "flame", "heat", "lua", "burn", "combustion", "reaction", "nhiet"] },
  { cp: "1F321", name: "thermometer", tags: ["thermometer", "temperature", "nhiet ke", "heat", "nhiet do"] },
  { cp: "1F50B", name: "battery", tags: ["battery", "pin", "energy", "charge", "electric", "dien"] },
  { cp: "1F4A1", name: "light-bulb", tags: ["light bulb", "bong den", "idea", "electricity", "light", "dien"] },
  { cp: "2699", name: "gear", tags: ["gear", "cog", "banh rang", "machine", "mechanics", "co hoc"] },
  { cp: "1F4CF", name: "ruler", tags: ["ruler", "thuoc", "measure", "length", "do", "scale"] },
  { cp: "1F4D0", name: "triangle-ruler", tags: ["triangle ruler", "thuoc", "geometry", "angle", "goc", "do"] },
  { cp: "1F4DA", name: "books", tags: ["books", "sach", "study", "knowledge", "library", "hoc"] },
  { cp: "1F393", name: "graduation-cap", tags: ["graduation", "hoc", "education", "student", "mu tot nghiep"] },
  { cp: "1F9EE", name: "abacus", tags: ["abacus", "ban tinh", "math", "calculate", "toan"] },
  { cp: "1F4CA", name: "bar-chart", tags: ["bar chart", "bieu do", "data", "statistics", "graph", "thong ke"] },
  { cp: "1F4C8", name: "chart-up", tags: ["chart", "graph", "trend", "tang", "growth", "data", "rate", "toc do"] },
  { cp: "2696", name: "balance-scale", tags: ["balance", "scale", "can", "equilibrium", "can bang", "weight"] },
  { cp: "1F50D", name: "magnifying-glass", tags: ["magnifying glass", "kinh lup", "search", "zoom", "observe", "quan sat"] },
  { cp: "270F", name: "pencil", tags: ["pencil", "but chi", "write", "draw", "note", "viet"] },
  { cp: "1F4DD", name: "memo", tags: ["memo", "note", "ghi chu", "write", "document", "phieu"] },
  { cp: "1F9F0", name: "toolbox", tags: ["toolbox", "hop dung cu", "tools", "repair", "dung cu"] },
  { cp: "26A1", name: "high-voltage", tags: ["electricity", "dien", "voltage", "energy", "lightning", "power", "dien the"] },
  { cp: "1F31E", name: "sun", tags: ["sun", "mat troi", "light", "solar", "energy", "heat", "anh sang"] },
  { cp: "1F319", name: "moon", tags: ["moon", "mat trang", "night", "lunar", "space"] },
  { cp: "1F30D", name: "globe", tags: ["globe", "earth", "trai dat", "world", "geography", "dia ly"] },
  { cp: "1FAA8", name: "rock", tags: ["rock", "da", "mineral", "stone", "geology", "khoang"] },
  { cp: "1F343", name: "leaf", tags: ["leaf", "la", "plant", "nature", "photosynthesis", "quang hop"] },
  { cp: "1F331", name: "seedling", tags: ["seedling", "cay con", "plant", "grow", "sprout", "nature"] },
  { cp: "1F4A8", name: "gas", tags: ["gas", "wind", "khi", "air", "blow", "smoke", "khi thoat"] },
  { cp: "2728", name: "sparkles", tags: ["sparkles", "lap lanh", "shine", "clean", "reaction", "phan ung"] },
  { cp: "1F517", name: "link", tags: ["link", "lien ket", "chain", "bond", "connection", "lien ket hoa hoc"] },
  { cp: "1F9F4", name: "bottle", tags: ["bottle", "chai", "liquid", "chemical", "solution", "dung dich"] },
  { cp: "23F1", name: "stopwatch", tags: ["stopwatch", "dong ho", "time", "measure", "thoi gian", "timer", "toc do"] },
  { cp: "1F50C", name: "electric-plug", tags: ["plug", "o cam", "electric", "power", "dien"] },
  { cp: "1F526", name: "flashlight", tags: ["flashlight", "den pin", "light", "beam", "anh sang"] },
  { cp: "1F6E0", name: "tools", tags: ["tools", "dung cu", "repair", "build", "hammer", "wrench"] },
  { cp: "1F4D3", name: "notebook", tags: ["notebook", "vo", "note", "write", "ghi"] },
  { cp: "1F9EF", name: "fire-extinguisher", tags: ["fire extinguisher", "binh chua chay", "safety", "an toan"] },
  { cp: "1F4CC", name: "pushpin", tags: ["pin", "ghim", "mark", "note"] },
];

async function dl(cp) {
  const urls = [
    `https://cdn.jsdelivr.net/npm/openmoji@${VER}/color/svg/${cp}.svg`,
    `https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/${cp}.svg`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (r.ok) {
        const t = await r.text();
        if (t.includes("<svg")) return t;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

async function main() {
  await mkdir(ICON_DIR, { recursive: true });
  await mkdir(dirname(MANIFEST), { recursive: true });

  const iconEntries = [];
  let ok = 0;
  let fail = 0;
  for (const ic of ICONS) {
    const svg = await dl(ic.cp);
    if (!svg) {
      console.warn(`  SKIP ${ic.cp} ${ic.name} (download failed)`);
      fail++;
      continue;
    }
    const file = `${ic.name}.svg`;
    await writeFile(join(ICON_DIR, file), svg, "utf8");
    iconEntries.push({ file, tags: ic.tags, source: `OpenMoji ${ic.cp}` });
    ok++;
  }

  // Nền: tự viết tay, chỉ cần quét thư mục.
  let bgFiles = [];
  try {
    bgFiles = (await readdir(BG_DIR)).filter((f) => f.endsWith(".svg")).sort();
  } catch {
    /* no backgrounds yet */
  }
  const bgEntries = bgFiles.map((file) => ({ file }));

  const manifest = {
    note: "Auto-generated by scripts/fetch-slide-assets.mjs. Bytes live in fe/public/slide-assets.",
    icons: iconEntries,
    backgrounds: bgEntries,
  };
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const credits = `# Slide assets — credits & licenses

## Icons
Bộ icon trong \`icons/\` lấy từ **OpenMoji** — https://openmoji.org
Giấy phép: **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/).
Yêu cầu: ghi credit "OpenMoji" và giữ cùng giấy phép khi phát hành phái sinh.
Số icon: ${ok}.

## Backgrounds
Các file trong \`backgrounds/\` do dự án tự viết (SVG pattern) — không ràng buộc license.
`;
  await writeFile(CREDITS, credits, "utf8");

  console.log(`Icons: ${ok} ok, ${fail} fail. Backgrounds: ${bgFiles.length}.`);
  console.log(`Manifest -> ${MANIFEST}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
