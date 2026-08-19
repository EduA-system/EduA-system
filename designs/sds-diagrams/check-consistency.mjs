/**
 * Kiem tra 2 rang buoc bat buoc cua SDS:
 *   (a) moi lifeline trong sequence phai la object cua mot class co trong class diagram CUA FEATURE chua UC do
 *   (b) moi message dang goi phuong thuc phai ung voi operation khai bao tren class nhan
 *
 * Layout v2 (theo features.json):
 *   feat<NN>/feat<NN>_class.puml            + feat<NN>/uc<MM>_sequence.puml
 *   feature lon co the tach class diagram:  feat<NN>_class_a.puml, feat<NN>_class_b.puml -> gop lai khi kiem
 * Layout v1 (cu, van kiem duoc trong luc chuyen doi):
 *   uc<MM>/uc<MM>_class.puml                + uc<MM>/uc<MM>_sequence.puml
 *
 * Dung:
 *   node designs/sds-diagrams/check-consistency.mjs                # tat ca feature trong features.json
 *   node designs/sds-diagrams/check-consistency.mjs feat09         # mot feature
 *   node designs/sds-diagrams/check-consistency.mjs uc49           # feature chua UC-49
 *   node designs/sds-diagrams/check-consistency.mjs --legacy       # cac thu muc uc<NN>/ kieu cu
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const EXTERNAL = [/^db$/i, /google identity/i, /file storage service/i];      // participant duoc phep khong co trong class diagram
const pad = n => String(n).padStart(2, "0");

const features = JSON.parse(fs.readFileSync(path.join(ROOT, "features.json"), "utf8")).features;

/* --- class diagram: ten class + operation --- */
function parseClasses(file) {
  const classes = new Map();
  let cur = null;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const open = line.match(/^\s*(?:abstract\s+)?(?:class|interface|enum)\s+(\w+)/);
    if (open) { cur = open[1]; classes.set(cur, new Set()); continue; }
    if (/^\s*}/.test(line)) { cur = null; continue; }
    if (cur) {
      const op = line.match(/^\s*[+\-#~]\s*(\w+)\s*\(/);
      if (op) classes.get(cur).add(op[1]);
    }
  }
  return classes;
}

/* gop nhieu file class diagram cua cung mot feature thanh 1 bang tra cuu */
function mergeClasses(files) {
  const all = new Map();
  for (const f of files) {
    for (const [name, ops] of parseClasses(f)) {
      if (!all.has(name)) all.set(name, new Set());
      ops.forEach(op => all.get(name).add(op));
    }
  }
  return all;
}

/* --- sequence: participant + message, doi chieu voi class diagram --- */
function checkSequence(file, classes) {
  const seq = fs.readFileSync(file, "utf8");
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

  return { nLife: alias.size, nMsg: msgs.length, errs };
}

const args = process.argv.slice(2);
const legacy = args.includes("--legacy");
let totalErr = 0;

if (legacy) {
  /* ----- layout v1: moi UC mot class diagram rieng ----- */
  const dirs = args.filter(a => /^uc\d+$/.test(a));
  const targets = dirs.length ? dirs : fs.readdirSync(ROOT).filter(d => /^uc\d+$/.test(d)).sort();
  for (const dir of targets) {
    const cf = path.join(ROOT, dir, `${dir}_class.puml`), sf = path.join(ROOT, dir, `${dir}_sequence.puml`);
    if (!fs.existsSync(cf) || !fs.existsSync(sf)) { console.log(`${dir}: thieu file .puml`); continue; }
    const classes = parseClasses(cf);
    const r = checkSequence(sf, classes);
    console.log(`${dir}: ${classes.size} class | ${r.nLife} lifeline | ${r.nMsg} message -> ${r.errs.length ? r.errs.length + " LOI" : "dat"}`);
    r.errs.forEach(e => console.log("    - " + e));
    totalErr += r.errs.length;
  }
} else {
  /* ----- layout v2: class diagram theo feature ----- */
  let targets = features;
  if (args.length) {
    const wanted = new Set();
    for (const a of args) {
      const byId = features.find(f => f.id === a || f.slug === a);
      if (byId) { wanted.add(byId.id); continue; }
      const uc = a.match(/^uc(\d+)$/);
      if (uc) {
        const owner = features.find(f => f.ucs.includes(Number(uc[1])));
        if (owner) wanted.add(owner.id);
        else console.log(`${a}: khong thuoc feature nao trong features.json (xem muc "parked")`);
        continue;
      }
      console.log(`${a}: khong nhan ra (dung feat<NN>, slug, hoac uc<MM>)`);
    }
    targets = features.filter(f => wanted.has(f.id));
  }

  for (const feat of targets) {
    const dir = path.join(ROOT, feat.id);
    const classFile = new RegExp("^" + feat.id + "_class(_[a-z0-9]+)?\\.puml$");
    const cfs = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => classFile.test(f)).sort() : [];
    if (!cfs.length) { console.log(`${feat.id} (${feat.title}): CHUA CO ${feat.id}_class.puml`); totalErr++; continue; }
    const classes = mergeClasses(cfs.map(f => path.join(dir, f)));
    console.log(`\n${feat.id} ${feat.title}: ${classes.size} class trong ${cfs.length} hinh (${cfs.join(", ")})`);

    for (const n of feat.ucs) {
      const name = `uc${pad(n)}_sequence.puml`;
      let sf = path.join(dir, name);
      let where = "";
      if (!fs.existsSync(sf)) {                       // chua di chuyen -> doc tam o thu muc cu
        const old = path.join(ROOT, `uc${pad(n)}`, name);
        if (!fs.existsSync(old)) { console.log(`  uc${pad(n)}: thieu ${name}`); totalErr++; continue; }
        sf = old; where = "  (con o uc" + pad(n) + "/)";
      }
      const r = checkSequence(sf, classes);
      console.log(`  uc${pad(n)}: ${r.nLife} lifeline | ${r.nMsg} message -> ${r.errs.length ? r.errs.length + " LOI" : "dat"}${where}`);
      r.errs.forEach(e => console.log("      - " + e));
      totalErr += r.errs.length;
    }
  }
}

console.log(`\nTong so loi: ${totalErr}`);
