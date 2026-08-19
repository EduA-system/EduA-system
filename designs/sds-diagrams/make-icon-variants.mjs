/**
 * Sinh BAN THU HAI cua moi hinh sequence, dung ky phap ky hieu Jacobson/USDP
 * (Gomaa Hinh 2.14b) thay cho hop chu nhat.
 *
 *   uc<NN>/uc<NN>_sequence.puml        -> ban goc, hop chu nhat  (khong dung toi)
 *   uc<NN>/uc<NN>_sequence_icon.puml   -> ban ky hieu, sinh ra tu file tren
 *
 * Vai tro lay tu class diagram cua feature chua UC do, nen hai loai hinh luon khop nhau:
 *   «user interaction»                    -> boundary   (vong tron + gach dung)
 *   «coordinator» «business logic» «algorithm» -> control (vong tron + mui ten)
 *   «interface» «database wrapper» «proxy»     -> boundary (cong ra he ngoai / CSDL)
 *   «entity» «data abstraction»                -> entity  (vong tron + gach duoi)
 *   DB, actor, he thong ngoai                  -> giu nguyen
 *
 * Dung: node make-icon-variants.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const dry = process.argv.includes("--dry");
const pad = n => String(n).padStart(2, "0");
const { features } = JSON.parse(fs.readFileSync(path.join(ROOT, "features.json"), "utf8"));

/* ten class -> stereotype, doc tu 21 class diagram */
const stereo = new Map();
for (const f of features) {
  const p = path.join(ROOT, f.id, `${f.id}_class.puml`);
  if (!fs.existsSync(p)) continue;
  for (const m of fs.readFileSync(p, "utf8").matchAll(/^class (\w+) <<([^>]+)>>/gm)) stereo.set(m[1], m[2].trim());
}

const KEYWORD = {
  "user interaction": "boundary",
  "coordinator": "control",
  "business logic": "control",
  "algorithm": "control",
  "interface": "boundary",
  "database wrapper": "boundary",
  "proxy": "boundary",
  "entity": "entity",
  "data abstraction": "entity",
};

let nFile = 0, nLife = 0, unknown = new Map();
for (const dir of fs.readdirSync(ROOT).filter(d => /^uc\d+$/.test(d)).sort()) {
  const src = path.join(ROOT, dir, `${dir}_sequence.puml`);
  if (!fs.existsSync(src)) continue;

  const out = fs.readFileSync(src, "utf8").split(/\r?\n/).map(line => {
    const m = line.match(/^participant\s+"([^"]+)"(\s+as\s+\w+)?\s*$/);
    if (!m) return line;
    const name = m[1].replace(/^:\s*/, "").trim();
    const s = stereo.get(name);
    const kw = s && KEYWORD[s];
    if (!kw) { unknown.set(name, (unknown.get(name) || 0) + 1); return line; }
    nLife++;
    return `${kw} "${m[1]}"${m[2] || ""}`;
  }).join("\n");

  const dst = path.join(ROOT, dir, `${dir}_sequence_icon.puml`);
  const withTitle = out.replace(/^@startuml\s+(.*)$/m, "@startuml $1 (icon)");
  if (!dry) fs.writeFileSync(dst, withTitle);
  nFile++;
}
console.log(`${dry ? "[DRY-RUN] " : ""}${nFile} ban icon | ${nLife} lifeline doi sang ky hieu`);
if (unknown.size) {
  console.log("Giu nguyen hop chu nhat (khong co trong class diagram hoac la he thong ngoai):");
  for (const [k, v] of [...unknown].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
}
