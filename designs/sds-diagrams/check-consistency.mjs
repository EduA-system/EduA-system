/**
 * Kiem tra 2 rang buoc bat buoc cua SDS cho tung UC:
 *   (a) moi lifeline trong sequence phai la object cua mot class co trong class diagram cung UC
 *   (b) moi message dang goi phuong thuc phai ung voi operation khai bao tren class nhan
 *
 * Dung: node designs/sds-diagrams/check-consistency.mjs [uc01 ...]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const EXTERNAL = [/^db$/i, /google identity/i];      // participant duoc phep khong co trong class diagram

const dirs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(ROOT).filter(d => /^uc\d+$/.test(d)).sort();

let totalErr = 0;
for (const dir of dirs) {
  const abs = path.join(ROOT, dir);
  const cf = path.join(abs, `${dir}_class.puml`), sf = path.join(abs, `${dir}_sequence.puml`);
  if (!fs.existsSync(cf) || !fs.existsSync(sf)) { console.log(`${dir}: thieu file .puml`); continue; }
  const cls = fs.readFileSync(cf, "utf8"), seq = fs.readFileSync(sf, "utf8");

  /* --- class diagram: ten class + operation --- */
  const classes = new Map();
  let cur = null;
  for (const line of cls.split(/\r?\n/)) {
    const open = line.match(/^\s*(?:abstract\s+)?(?:class|interface|enum)\s+(\w+)/);
    if (open) { cur = open[1]; classes.set(cur, new Set()); continue; }
    if (/^\s*}/.test(line)) { cur = null; continue; }
    if (cur) {
      const op = line.match(/^\s*[+\-#~]\s*(\w+)\s*\(/);
      if (op) classes.get(cur).add(op[1]);
    }
  }

  /* --- sequence: participant + message --- */
  const alias = new Map(), actors = new Set();
  for (const m of seq.matchAll(/^\s*(participant|actor|database|collections|boundary|control|entity)\s+(?:"([^"]+)"|(\w+))(?:\s+as\s+(\w+))?/gm)) {
    const kind = m[1], label = (m[2] || m[3]).trim(), key = m[4] || m[3] || label;
    alias.set(key, label);
    if (kind === "actor") actors.add(key);
  }
  const msgs = [...seq.matchAll(/^\s*(\w+)\s*(->>?|-->>?)\s*(\w+)\s*:\s*(.+)$/gm)]
    .map(m => ({ from: m[1], to: m[3], isReturn: m[2].startsWith("--"), text: m[4].trim() }));

  const errs = [];

  /* (a) lifeline <-> class diagram */
  for (const [key, label] of alias) {
    if (actors.has(key)) continue;
    if (EXTERNAL.some(re => re.test(label))) continue;
    const name = label.replace(/^:\s*/, "").trim();
    if (!classes.has(name)) errs.push(`lifeline "${label}" khong co trong class diagram`);
  }

  /* (b) message <-> operation */
  for (const msg of msgs) {
    if (msg.isReturn) continue;
    /* chi coi la loi goi khi dau ngoac dinh lien sau ten ham, va ten ham dung camelCase/1 tu
       -> tranh bat nham cum chu nhu "and size (max 10 MB)" hay "date of birth (read-only)" */
    const call = msg.text.match(/(?:^|[\s.>])([a-z]\w*)\((?!\s)[^)]*\)/);
    if (!call) continue;                                  // message mo ta bang loi van, khong bat buoc
    const target = (alias.get(msg.to) || "").replace(/^:\s*/, "").trim();
    if (!classes.has(target)) continue;                   // da bao o (a)
    if (!classes.get(target).has(call[1]))
      errs.push(`message "${call[1]}(...)" gui toi ${target} nhung class do khong khai bao operation nay`);
  }

  const nLife = [...alias.keys()].length;
  console.log(`${dir}: ${classes.size} class | ${nLife} lifeline | ${msgs.length} message -> ${errs.length ? errs.length + " LOI" : "dat"}`);
  errs.forEach(e => console.log("    - " + e));
  totalErr += errs.length;
}
console.log(`\nTong so loi: ${totalErr}`);
