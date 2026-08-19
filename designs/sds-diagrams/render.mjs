/**
 * Render .puml trong designs/sds-diagrams voi DPI tinh rieng cho tung hinh.
 *
 * PlantUML mac dinh 96 DPI. Hinh it pixel bi keo rong het trang A3 (9.69") se tut xuong
 * ~96 DPI thuc -> chu mo khi zoom hoac khi in. Script render 2 luot:
 *   luot 1: 96 DPI de do kich thuoc that
 *   luot 2: dpi = 96 * TARGET_DPI / dpi_thuc, kep trong [96, 400] va gioi han be ngang MAX_PX
 *
 * Ten file ra:
 *   feat<NN>/feat<NN>_class.puml  -> feat<NN>-class-diagram.png     (muc 2.<N>.1)
 *   feat<NN>/uc<MM>_sequence.puml -> uc<MM>-sequence-diagram.png    (muc 2.<N>.2.<y>)
 *   uc<MM>/uc<MM>_*.puml          -> uc<MM>-class|sequence-diagram.png  (layout cu)
 *
 * Dung: node designs/sds-diagrams/render.mjs [feat12 uc84 overview ...]   (khong tham so = tat ca)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const JAR = process.env.PLANTUML_JAR
  || "C:/Users/KONAN_~1/AppData/Local/Temp/claude/D--desktop-data-Tai-Lieu-FPT-SU26-do-an-main-code/c5aa802f-1974-48ad-93f4-1bff1c1f59bb/scratchpad/puml/plantuml.jar";
const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const PAGE_W_IN = 13958 / 1440;   // be ngang vung in trang A3
const PAGE_H_IN = 18000 / 1440;   // chieu cao toi da cho 1 hinh
const TARGET_DPI = Number(process.env.TARGET_DPI || 96);   // 96 = DPI mac dinh cua PlantUML; dat TARGET_DPI=220 de render net hon
const MAX_PX = 3600;              // tran be ngang, tranh file qua nang
const MIN_DPI = 96, MAX_DPI = 400;

const pngSize = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const render = (puml, outDir, dpi) =>
  execFileSync("java", ["-jar", JAR, "-charset", "UTF-8", "-Sdpi=" + dpi, "-tpng", "-o", outDir, puml], { stdio: "pipe" });

/* feat12/feat12_class.puml -> feat12-class-diagram.png ; feat12/uc84_sequence.puml -> uc84-sequence-diagram.png */
const outName = base => {
  const cls = base.match(/^(.*)_class(?:_([a-z0-9]+))?$/);   // feat09_class_a -> feat09-class-diagram-a.png
  if (cls) return `${cls[1]}-class-diagram${cls[2] ? "-" + cls[2] : ""}.png`;
  return `${base.replace(/_sequence$/, "")}-sequence-diagram.png`;
};

const isDiagramDir = d => /^(feat\d+|uc\d+|overview)$/.test(d);
const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(ROOT).filter(d => isDiagramDir(d) && fs.statSync(path.join(ROOT, d)).isDirectory()).sort();

console.log("hinh".padEnd(30), "px sau render".padEnd(15), "hien thi".padEnd(10), "DPI");
for (const dir of targets) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) { console.log(`${dir}: khong co thu muc`); continue; }
  for (const puml of fs.readdirSync(abs).filter(f => f.endsWith(".puml")).sort()) {
    const base = puml.replace(/\.puml$/, "");
    const finalName = outName(base);
    const tmp = path.join(abs, "_probe");

    render(path.join(abs, puml), tmp, MIN_DPI);
    const probe = path.join(tmp, fs.readdirSync(tmp)[0]);
    const p = pngSize(probe);
    fs.rmSync(tmp, { recursive: true, force: true });

    /* kich thuoc hien thi sau khi vua khung trang */
    const scale = Math.min(PAGE_W_IN / (p.w / 96), PAGE_H_IN / (p.h / 96), 1);
    const shownW = (p.w / 96) * scale;
    let dpi = Math.round(MIN_DPI * (TARGET_DPI / (p.w / shownW)));
    dpi = Math.max(MIN_DPI, Math.min(MAX_DPI, dpi));
    if ((p.w / 96) * dpi > MAX_PX) dpi = Math.floor(MAX_PX / (p.w / 96));

    /* render ra thu muc tam roi doi ten -> khong phu thuoc vao ten PlantUML tu dat */
    const out = path.join(abs, "_out");
    render(path.join(abs, puml), out, dpi);
    const produced = fs.readdirSync(out).find(f => f.endsWith(".png"));
    fs.renameSync(path.join(out, produced), path.join(abs, finalName));
    fs.rmSync(out, { recursive: true, force: true });

    /* PlantUML khong ghi chunk pHYs nen luu kich thuoc goc 96 DPI ra file kem,
       de buoc chen anh biet phai hien thi o kho bao nhieu inch. */
    fs.writeFileSync(path.join(abs, finalName + ".json"),
      JSON.stringify({ baseW: p.w, baseH: p.h, renderDpi: dpi, widthIn: +(p.w / 96).toFixed(3), heightIn: +(p.h / 96).toFixed(3) }));

    const final = pngSize(path.join(abs, finalName));
    const eff = Math.round(final.w / shownW);
    console.log(finalName.padEnd(30), `${final.w}x${final.h}`.padEnd(15), shownW.toFixed(2).padEnd(10), eff);
  }
}
