/**
 * Sinh BAN THU BA cua moi hinh sequence: van la hop chu nhat, nhung ghi them
 * stereotype «...» lay dung tu class diagram cua feature chua UC do.
 *
 *   uc<NN>/uc<NN>_sequence.puml          -> ban goc, hop chu nhat, khong stereotype
 *   uc<NN>/uc<NN>_sequence_icon.puml     -> ban ky hieu Jacobson (vong tron)
 *   uc<NN>/uc<NN>_sequence_stereo.puml   -> ban nay: hop chu nhat + «stereotype»
 *
 * Khac ban icon o cho: icon gom 9 stereotype ve 3 hinh (boundary/control/entity),
 * ban nay giu nguyen ca 9 nhan goc nen sequence khop 1-1 voi class diagram cung muc 2.x.
 *
 * Cu phap PlantUML: stereotype phai dung SAU alias
 *   participant ":LessonPlanService" as SVC <<business logic>>
 * dat truoc alias se loi cu phap.
 *
 * Dong `title ...` bi xoa — tieu de hinh da co san o heading cua tai lieu.
 *
 * Dung: node make-stereo-variants.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const dry = process.argv.includes("--dry");
const { features } = JSON.parse(fs.readFileSync(path.join(ROOT, "features.json"), "utf8"));

/* ten class -> stereotype, doc tu 21 class diagram */
const stereo = new Map();
for (const f of features) {
  const p = path.join(ROOT, f.id, `${f.id}_class.puml`);
  if (!fs.existsSync(p)) continue;
  for (const m of fs.readFileSync(p, "utf8").matchAll(/^class (\w+) <<([^>]+)>>/gm)) stereo.set(m[1], m[2].trim());
}

let nFile = 0, nLife = 0, nTitle = 0;
const unknown = new Map();
for (const dir of fs.readdirSync(ROOT).filter(d => /^uc\d+$/.test(d)).sort()) {
  const src = path.join(ROOT, dir, `${dir}_sequence.puml`);
  if (!fs.existsSync(src)) continue;

  const out = fs.readFileSync(src, "utf8").split(/\r?\n/).flatMap(line => {
    /* bo tieu de hinh */
    if (/^title /.test(line)) { nTitle++; return []; }

    const m = line.match(/^participant\s+"([^"]+)"(\s+as\s+\w+)?\s*$/);
    if (!m) return [line];
    const name = m[1].replace(/^:\s*/, "").trim();
    const s = stereo.get(name);
    if (!s) { unknown.set(name, (unknown.get(name) || 0) + 1); return [line]; }
    nLife++;
    return [`participant "${m[1]}"${m[2] || ""} <<${s}>>`];
  }).join("\n");

  const dst = path.join(ROOT, dir, `${dir}_sequence_stereo.puml`);
  const named = out.replace(/^@startuml\s+(.*)$/m, "@startuml $1 (stereo)");
  if (!dry) fs.writeFileSync(dst, named);
  nFile++;
}
console.log(`${dry ? "[DRY-RUN] " : ""}${nFile} ban stereo | ${nLife} lifeline gan stereotype | ${nTitle} title da xoa`);
if (unknown.size) {
  console.log("Giu nguyen hop tron (khong co trong class diagram hoac la he thong ngoai):");
  for (const [k, v] of [...unknown].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
}
