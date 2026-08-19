/**
 * Chuyen tu layout v1 (uc<NN>/) sang layout v2 (feat<NN>/) theo features.json.
 *
 * Chuyen: uc<MM>/uc<MM>_sequence.puml, uc<MM>-sequence-diagram.png (+ .json)  ->  feat<NN>/
 * GIU NGUYEN: uc<MM>/uc<MM>_class.puml va uc<MM>-class-diagram.png — day la nguyen lieu
 *             de gop thanh feat<NN>_class.puml; chi xoa thu muc uc<MM>/ sau khi da gop xong.
 *
 * Dung:
 *   node designs/sds-diagrams/migrate-layout.mjs            # dry-run, chi in ra se lam gi
 *   node designs/sds-diagrams/migrate-layout.mjs --apply    # thuc su di chuyen
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const apply = process.argv.includes("--apply");
const pad = n => String(n).padStart(2, "0");

const { features, parked } = JSON.parse(fs.readFileSync(path.join(ROOT, "features.json"), "utf8"));

let moved = 0, missing = 0, already = 0;
for (const feat of features) {
  const dest = path.join(ROOT, feat.id);
  if (!fs.existsSync(dest)) {
    console.log(`mkdir ${feat.id}/   (${feat.title})`);
    if (apply) fs.mkdirSync(dest);
  }
  for (const n of feat.ucs) {
    const src = path.join(ROOT, `uc${pad(n)}`);
    const files = [
      `uc${pad(n)}_sequence.puml`,
      `uc${pad(n)}-sequence-diagram.png`,
      `uc${pad(n)}-sequence-diagram.png.json`,
    ];
    for (const f of files) {
      const from = path.join(src, f), to = path.join(dest, f);
      if (fs.existsSync(to)) { already++; continue; }
      if (!fs.existsSync(from)) { console.log(`  THIEU  ${path.relative(ROOT, from)}`); missing++; continue; }
      console.log(`  mv ${path.relative(ROOT, from)} -> ${feat.id}/${f}`);
      if (apply) fs.renameSync(from, to);
      moved++;
    }
  }
}

console.log(`\n${apply ? "DA CHUYEN" : "DRY-RUN"}: ${moved} file | da nam dung cho: ${already} | thieu: ${missing}`);
if (parked?.length) {
  console.log("\nTam de ngoai (khong chuyen):");
  for (const p of parked) console.log(`  UC ${p.ucs.map(pad).join(", ")} — ${p.reason}`);
}
if (!apply) console.log("\nChay lai voi --apply de thuc su di chuyen.");
