/**
 * Chuan hoa 112 hinh sequence cho khop mau cua truong va bo quy uoc da chot:
 *   1. Loi goi        : "A -> B"   ->  "A ->> B"   (mui ten dau que, dung theo mau template)
 *   2. Tra ve         : "A --> B"  ->  "A -->> B"  (net dut + dau que, Gomaa muc 2.8.1)
 *   3. Kieu du lieu   : UUID->String, Instant->Date, Optional<X>->X, Page<X>->XPage, bo duoi Dto
 *   4. Tieu de hinh   : them so muc "2.<x>.2.<y>" lay tu features.json
 *
 * Dung: node normalize-sequences.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const dry = process.argv.includes("--dry");
const pad = n => String(n).padStart(2, "0");
const { features } = JSON.parse(fs.readFileSync(path.join(ROOT, "features.json"), "utf8"));

/* uc -> "2.<x>.2.<y>" */
const section = new Map();
features.forEach((f, i) => f.ucs.forEach((uc, y) => section.set(uc, `2.${i + 1}.2.${y + 1}`)));

function bookType(t) {
  return t
    .replace(/\bUUID\b/g, "String")
    .replace(/\bInstant\b/g, "Date")
    .replace(/Optional<([A-Za-z0-9_.]+)>/g, "$1")
    .replace(/(?:List|Set|Collection)<([A-Za-z0-9_.]+)>/g, "$1 [0..*]")
    .replace(/Page<([A-Za-z0-9_.]+)>/g, "$1Page")
    .replace(/\bpageable\b/g, "page, size")
    /* LibraryViews.Detail -> LibraryDetail, NotificationViews.NotificationCreated -> NotificationCreated */
    .replace(/([A-Za-z]+)Views\.([A-Za-z]+)/g, (_, owner, name) => (name.startsWith(owner) ? name : owner + name))
    .replace(/([A-Za-z]+)Dto\b/g, "$1");
}

let nFile = 0, nCall = 0, nRet = 0, nTitle = 0, nType = 0;
for (const dir of fs.readdirSync(ROOT).filter(d => /^uc\d+$/.test(d)).sort()) {
  const file = path.join(ROOT, dir, `${dir}_sequence.puml`);
  if (!fs.existsSync(file)) continue;
  const uc = Number(dir.slice(2));
  const before = fs.readFileSync(file, "utf8");

  const out = before.split(/\r?\n/).map(line => {     // file co the dang CRLF, phai cat \r truoc khi khop regex
    /* tieu de */
    if (/^title /.test(line)) {
      const sec = section.get(uc);
      if (!sec) return line;                                   // UC parked, khong co so muc
      const clean = line.replace(/^title\s+(?:\d+(?:\.\d+)*\s+)?/, "");
      const next = `title ${sec} ${bookType(clean)}`;
      if (next !== line) nTitle++;
      return next;
    }
    /* message: chi doi khi dong bat dau bang <alias> <mui ten> <alias> : */
    const m = line.match(/^(\s*)([A-Za-z_]\w*)\s*(->>?|-->>?)\s*([A-Za-z_]\w*)\s*:\s*(.*)$/);
    if (!m) return line;
    let [, indent, a, arrow, b, text] = m;
    if (arrow === "->") { arrow = "->>"; nCall++; }
    else if (arrow === "-->") { arrow = "-->>"; nRet++; }
    const t2 = bookType(text);
    if (t2 !== text) nType++;
    return `${indent}${a} ${arrow} ${b} : ${t2}`;
  }).join("\n");

  if (out !== before) {
    nFile++;
    if (!dry) fs.writeFileSync(file, out);
  }
}
console.log(`${dry ? "[DRY-RUN] " : ""}${nFile} file doi | ${nCall} loi goi -> mui ten que | ${nRet} return -> net dut dau que | ${nType} nhan doi kieu du lieu | ${nTitle} tieu de them so muc`);
