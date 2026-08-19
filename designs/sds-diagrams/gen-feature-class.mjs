/**
 * Sinh class diagram cho tung feature tu 107 hinh cu.
 *   - lay class = moi lifeline xuat hien trong sequence cua feature (dam bao quy tac 5)
 *   - operation = moi operation duoc goi trong sequence (dam bao quy tac 6), lay chu ky tu hinh cu
 *   - bo sung adapter hien thuc interface + entity ma adapter/repo anh xa
 *   - ap stereotype Gomaa, kieu du lieu theo sach, cat bot noi dung
 * Dung: node gen-feature-class.mjs feat01 feat02 ...   (khong tham so = tat ca feature chua co hinh)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "D:/desktop_data/Tai_Lieu_FPT/SU26/do_an/main_code/designs/sds-diagrams";
const pad = n => String(n).padStart(2, "0");
const { features } = JSON.parse(fs.readFileSync(path.join(ROOT, "features.json"), "utf8"));

/* ---------- doc kho hinh cu ---------- */
const store = new Map();      // ten class -> {stereo, attrs:Map(name->line), ops:Map(name->line)}
const relsAll = [];           // {a, b, raw}
for (const dir of fs.readdirSync(ROOT).filter(d => /^uc\d+$/.test(d))) {
  const f = path.join(ROOT, dir, `${dir}_class.puml`);
  if (!fs.existsSync(f)) continue;
  let cur = null;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const open = line.match(/^\s*(?:class|interface)\s+"?([A-Za-z0-9_.]+)"?(?:\s+as\s+(\w+))?\s*(?:<<\s*([a-z0-9 ]+)\s*>>)?/);
    if (open) {
      const name = open[2] || open[1];
      const stereo = open[3] || (line.trim().startsWith("interface") ? "interface" : "other");
      cur = name;
      if (!store.has(cur)) store.set(cur, { stereo, attrs: new Map(), ops: new Map() });
      else if (store.get(cur).stereo === "other" && stereo !== "other") store.get(cur).stereo = stereo;
      continue;
    }
    if (/^\s*}/.test(line)) { cur = null; continue; }
    if (cur) {
      const m = line.match(/^\s*([+\-#~])\s*(\w+)\s*(\()?/);
      if (!m) continue;
      const rec = store.get(cur);
      if (m[3]) { if (!rec.ops.has(m[2])) rec.ops.set(m[2], line.trim()); }
      else if (!rec.attrs.has(m[2])) rec.attrs.set(m[2], line.trim());
      continue;
    }
    const rel = line.match(/^([A-Za-z0-9_.]+)\s+(?:"[^"]*"\s+)?(\.\.\|>|\*--|o--|--|\.\.>)\s*(?:"[^"]*"\s+)?([A-Za-z0-9_.]+)(?:\s*:\s*(.*))?$/);
    if (rel) relsAll.push({ a: rel[1], kind: rel[2], b: rel[3], label: (rel[4] || "").trim() });
  }
}

/* ---------- doc sequence ---------- */
function seqInfo(ucs) {
  const life = new Set(), calls = new Map(), edges = new Set();
  for (const n of ucs) {
    const f = path.join(ROOT, `uc${pad(n)}`, `uc${pad(n)}_sequence.puml`);
    if (!fs.existsSync(f)) continue;
    const s = fs.readFileSync(f, "utf8");
    const alias = new Map();
    for (const m of s.matchAll(/^\s*(participant|actor|database|collections)\s+(?:"([^"]+)"|(\w+))(?:\s+as\s+(\w+))?/gm)) {
      const label = (m[2] || m[3]).trim().replace(/^:\s*/, "");
      alias.set(m[4] || m[3] || label, label);
      if (m[1] !== "actor" && !/^db$/i.test(label) && !/google identity/i.test(label) && !/file storage service/i.test(label)) life.add(label);
    }
    for (const m of s.matchAll(/^\s*(\w+)\s*(->>?|-->>?)\s*(\w+)\s*:\s*(.+)$/gm)) {
      if (m[2].startsWith("--")) continue;
      const call = m[4].match(/(?:^|[\s.>])([a-z]\w*)\((?!\s)[^)]*\)/);
      if (!call) continue;
      const t = alias.get(m[3]), src = alias.get(m[1]);
      if (!t) continue;
      if (!calls.has(t)) calls.set(t, new Set());
      calls.get(t).add(call[1]);
      if (src && src !== t) edges.add(`${src}|${t}`);   // do thi goi trong sequence, dung de noi hop bi treo
    }
  }
  return { life: [...life], calls, edges };
}

/* ---------- chuyen kieu sang tu vung sach ---------- */
function bookType(line) {
  return line
    .replace(/\bUUID\b/g, "String").replace(/\bInstant\b/g, "Date").replace(/\bLocalDate\b/g, "Date")
    .replace(/\blong\b|\bLong\b/g, "Integer").replace(/\bint\b/g, "Integer").replace(/\bdouble\b|\bfloat\b/g, "Real")
    .replace(/\bboolean\b/g, "Boolean").replace(/\bString\[\]/g, "String [0..*]")
    .replace(/Optional<([A-Za-z0-9_.]+)>/g, "$1")
    .replace(/(?:List|Set|Collection)<([A-Za-z0-9_.]+)>/g, "$1 [0..*]")
    .replace(/Map<[^>]*>/g, "Map")
    .replace(/Page<([A-Za-z0-9_.]+)>/g, "$1Page")
    .replace(/\bPageable\b/g, "page : Integer, size : Integer")
    .replace(/[A-Za-z]+Views\./g, "").replace(/([A-Za-z]+)Dto\b/g, "$1");
}

const STEREO = { client: "user interaction", controller: "coordinator", service: "business logic", interface: "interface", adapter: "database wrapper", entity: "entity", dto: "dto", other: "other" };
const WIRING = /^(CurrentUserProvider)$/;

function labelFor(a, b, sa, sb) {
  if (sa === "user interaction" && sb === "coordinator") return "Sends requests to >";
  if (sa === "user interaction" && sb === "entity") return "Displays >";
  if (sa === "coordinator" && sb === "business logic") return "Delegates to >";
  if (sa === "business logic" && sb === "interface") {
    if (/StreamPort$/.test(b)) return "Publishes progress through >";
    if (/StorageClient$/.test(b)) return "Stores files through >";
    if (/AiClient|ImageGeneration/.test(b)) return "Generates content through >";
    if (/Renderer$/.test(b)) return "Renders documents through >";
    if (/Verifier$/.test(b) || /TokenService$/.test(b)) return "Verifies identity through >";
    return "Accesses data through >";
  }
  if (sa === "business logic" && sb === "business logic") return "Uses >";
  return "Uses >";
}

function build(feat) {
  const { life, calls, edges } = seqInfo(feat.ucs);
  const members = new Map();     // ten -> stereo
  for (const n of life) {
    const rec = store.get(n);
    if (!rec) { console.log(`  ! ${feat.id}: khong tim thay dinh nghia class ${n}`); continue; }
    if (WIRING.test(n)) continue;
    members.set(n, STEREO[rec.stereo] || "other");
  }
  /* them adapter hien thuc interface, va entity ma chung anh xa */
  for (const [n, s] of [...members]) {
    if (s !== "interface") continue;
    for (const r of relsAll) {
      if (r.kind === "..|>" && r.b === n && store.has(r.a) && !members.has(r.a)) {
        members.set(r.a, /^Jpa/.test(r.a) ? "database wrapper" : "proxy");
      }
    }
  }
  for (const [n, s] of [...members]) {
    if (s !== "interface" && s !== "database wrapper") continue;
    for (const r of relsAll) {
      const other = r.a === n ? r.b : r.b === n ? r.a : null;
      if (!other || members.has(other)) continue;
      const rec = store.get(other);
      if (rec && rec.stereo === "entity" && !/Entity$/.test(other)) members.set(other, "entity");
    }
  }
  /* bo cap X / XEntity trung khai niem */
  for (const n of [...members.keys()]) {
    if (/Entity$/.test(n) && members.has(n.replace(/Entity$/, ""))) members.delete(n);
  }
  /* lifeline la DTO/khong stereotype: doi sang tu vung sach thay vi bo (Physics/Chemistry can cac hop nay) */
  for (const [n, s] of [...members]) {
    if (s !== "dto" && s !== "other") continue;
    members.set(n, /(Kernel|Engine|Solver)$/.test(n) ? "algorithm" : "data abstraction");
  }

  /* ---- dung hop ---- */
  const boxes = [];
  for (const [n, stereo] of members) {
    const rec = store.get(n) || { attrs: new Map(), ops: new Map() };
    let attrs = [...rec.attrs.values()];
    if (stereo === "entity") attrs = attrs.slice(0, 5);
    else if (stereo === "coordinator" || stereo === "business logic") attrs = attrs.filter(a => [...members.keys()].some(m => a.includes(": " + m)));
    else attrs = attrs.slice(0, 3);

    const used = calls.get(n) || new Set();
    let ops = [...used].map(o => rec.ops.get(o) || `+ ${o}()`);
    if (stereo === "coordinator") ops = ops.map(o => o.replace(/\(([^)]*)\)/, "()"));
    if (!ops.length && rec.ops.size && stereo !== "database wrapper") ops = [...rec.ops.values()].slice(0, 5);

    const body = [...attrs, ...(stereo === "interface" ? [] : []), ...ops].map(bookType).map(l => "  " + l.replace(/\s*:\s*void\s*$/, ""));
    const head = stereo === "interface" ? `class ${n} <<interface>> {\n  {field}\n  --` : `class ${n} <<${stereo}>> {`;
    boxes.push(`${head}\n${body.join("\n")}\n}`);
  }

  /* ---- quan he ---- */
  const rels = new Set();
  const st = n => members.get(n);
  for (const [a, sa] of members) {
    const rec = store.get(a);
    if (!rec) continue;
    for (const attr of rec.attrs.values()) {
      const m = attr.match(/:\s*([A-Za-z0-9_.]+)/);
      if (!m) continue;
      const b = m[1];
      if (!members.has(b) || b === a) continue;
      rels.add(`${a} "1" -- "1" ${b} : ${labelFor(a, b, sa, st(b))}`);
    }
  }
  for (const [a, sa] of members) {
    if (sa === "user interaction") {
      const ctl = [...members].find(([, s]) => s === "coordinator");
      if (ctl) rels.add(`${a} "1" -- "1" ${ctl[0]} : Sends requests to >`);
    }
  }
  for (const r of relsAll) {
    if (!members.has(r.a) || !members.has(r.b)) continue;
    if (r.kind === "..|>") rels.add(`${r.a} ..|> ${r.b}`);
    else if (r.kind === "*--" || r.kind === "o--") rels.add(`${r.a} "1" ${r.kind} "0..*" ${r.b} : ${r.label || "Contains >"}`);
    else if (r.kind === "--" && st(r.a) === "entity" && st(r.b) === "entity") rels.add(`${r.a} "1" -- "0..*" ${r.b} : ${r.label || "Has >"}`);
  }
  for (const [a, sa] of members) {
    if (sa !== "database wrapper" && sa !== "proxy") continue;
    const core = a.replace(/^Jpa/, "").replace(/Repository$/, "");
    let target = [...members].find(([b, sb]) => sb === "entity" && (b === core || b === core + "Entity" || b.startsWith(core) || core.startsWith(b)));
    if (!target) {
      for (const r of relsAll) {
        if (r.a !== a) continue;
        if (members.get(r.b) === "entity") { target = [r.b]; break; }
      }
    }
    if (target) rels.add(`${a} "1" -- "0..*" ${target[0] || target} : Maps >`);
  }

  /* hop nao chua dinh vao quan he nao thi noi theo do thi goi trong sequence */
  const linked = new Set();
  for (const r of rels) {
    const m = r.match(/^([A-Za-z0-9_]+)\s+(?:"[^"]*"\s+)?(?:--|\*--|o--|\.\.\|>)\s*(?:"[^"]*"\s+)?([A-Za-z0-9_]+)/);
    if (m) { linked.add(m[1]); linked.add(m[2]); }
  }
  for (const [a, sa] of members) {
    if (linked.has(a)) continue;
    for (const e of edges) {
      const [x, y] = e.split("|");
      const other = x === a ? y : y === a ? x : null;
      if (!other || !members.has(other) || other === a) continue;
      const [from, to] = x === a ? [a, other] : [other, a];
      rels.add(`${from} "1" -- "1" ${to} : ${labelFor(from, to, st(from), st(to))}`);
      linked.add(a);
      break;
    }
    if (linked.has(a)) continue;
    /* van treo: entity thi cho business logic sinh ra, coordinator thi cho man hinh goi toi */
    if (sa === "entity") {
      const svc = [...members].find(([, s]) => s === "business logic");
      if (svc) { rels.add(`${svc[0]} "1" -- "0..*" ${a} : Produces >`); linked.add(a); }
    } else if (sa === "coordinator") {
      const ui = [...members].find(([, s]) => s === "user interaction");
      if (ui) { rels.add(`${ui[0]} "1" -- "1" ${a} : Sends requests to >`); linked.add(a); }
    }
  }

  const idx = features.findIndex(f => f.id === feat.id) + 1;
  const head = [
    `@startuml ${feat.id} ${feat.title} - Class Diagram`,
    'skinparam defaultFontName "Segoe UI"',
    "skinparam shadowing false",
    "skinparam wrapWidth 320",
    "skinparam classBackgroundColor #FFFFFF",
    "skinparam classBorderColor #000000",
    "skinparam ArrowColor #000000",
    "skinparam classAttributeIconSize 0",
    "skinparam linetype ortho",
    "hide circle",
    `title 2.${idx}.1 ${feat.title} — Class Diagram`,
    "",
  ].join("\n");

  const dir = path.join(ROOT, feat.id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, `${feat.id}_class.puml`), `${head}${boxes.join("\n\n")}\n\n${[...rels].join("\n")}\n\n@enduml\n`);
  console.log(`${feat.id} ${feat.title}: ${members.size} hop, ${rels.size} quan he`);
}

const args = process.argv.slice(2);
const targets = args.length ? features.filter(f => args.includes(f.id)) : features.filter(f => !fs.existsSync(path.join(ROOT, f.id, `${f.id}_class.puml`)));
for (const f of targets) build(f);
