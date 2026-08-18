#!/usr/bin/env node
/**
 * Patch a page inside a .drawio file (uncompressed XML) without going through
 * the draw.io app. Writes through Google Drive Desktop survive a reload; the
 * drawio MCP server's writes do not.
 *
 *   node drawio-page.mjs list    <file.drawio>
 *   node drawio-page.mjs extract <file.drawio> <page-id-or-name> [out.xml]
 *   node drawio-page.mjs patch   <file.drawio> <page-id-or-name> <model.xml>
 *
 * <model.xml> holds a standalone <mxGraphModel>…</mxGraphModel> block, i.e.
 * exactly what `extract` produces.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [, , cmd, file, page, arg] = process.argv;

const die = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

if (!cmd || !file) {
  die("usage: drawio-page.mjs <list|extract|patch> <file.drawio> [page] [xml]");
}
if (!fs.existsSync(file)) die(`file not found: ${file}`);

const source = fs.readFileSync(file, "utf8");
if (!source.trimStart().startsWith("<mxfile")) {
  die("not an .drawio/mxfile document");
}

const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
const countCells = (xml) => (xml.match(/<mxCell /g) || []).length;
const countImages = (xml) => (xml.match(/image=data:/g) || []).length;

/** Every <diagram> node with its byte range and body. */
const pages = [...source.matchAll(/<diagram\b[^>]*>/g)].map((m) => {
  const open = m[0];
  const start = m.index;
  const bodyStart = start + open.length;
  const bodyEnd = source.indexOf("</diagram>", bodyStart);
  if (bodyEnd < 0) die("unclosed <diagram> node");
  return {
    id: attr(open, "id"),
    name: attr(open, "name"),
    start,
    end: bodyEnd + "</diagram>".length,
    body: source.slice(bodyStart, bodyEnd),
  };
});
if (pages.length === 0) die("no <diagram> pages found");

const summarize = (list) =>
  list
    .map(
      (p, i) =>
        `  [${i}] id=${p.id} name=${JSON.stringify(p.name)} ` +
        `cells=${countCells(p.body)} images=${countImages(p.body)}` +
        (countCells(p.body) <= 2 ? "  (empty)" : ""),
    )
    .join("\n");

if (cmd === "list") {
  console.log(`${path.basename(file)} — ${pages.length} page(s), ${source.length} bytes`);
  console.log(summarize(pages));
  process.exit(0);
}

if (!page) die(`${cmd} needs a page id or name`);
const target = pages.find((p) => p.id === page || p.name === page);
if (!target) die(`page not found: ${page}\n${summarize(pages)}`);

// draw.io can store a page body as base64+deflate. Refuse rather than corrupt it.
if (!target.body.includes("<mxGraphModel")) {
  die(
    "page body is compressed — open the file in draw.io and turn off " +
      "Tập tin → Thuộc tính → Nén (File → Properties → Compressed), save, then retry",
  );
}

const modelStart = target.body.indexOf("<mxGraphModel");
const modelEnd = target.body.indexOf("</mxGraphModel>") + "</mxGraphModel>".length;
const model = target.body.slice(modelStart, modelEnd);

if (cmd === "extract") {
  if (arg) {
    fs.writeFileSync(arg, model, "utf8");
    console.log(`extracted ${countCells(model)} cells -> ${arg}`);
  } else {
    process.stdout.write(model);
  }
  process.exit(0);
}

if (cmd !== "patch") die(`unknown command: ${cmd}`);
if (!arg) die("patch needs a model xml file");
if (!fs.existsSync(arg)) die(`model file not found: ${arg}`);

const replacement = fs.readFileSync(arg, "utf8").trim();
if (!replacement.startsWith("<mxGraphModel") || !replacement.endsWith("</mxGraphModel>")) {
  die("model file must be a standalone <mxGraphModel>…</mxGraphModel> block");
}

const backupDir = path.join(os.tmpdir(), "drawio-backups");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = path.join(backupDir, `${path.basename(file, ".drawio")}.${stamp}.drawio`);
fs.writeFileSync(backup, source, "utf8");

const openTag = source.slice(target.start, source.indexOf(">", target.start) + 1);
const patched =
  source.slice(0, target.start) +
  openTag +
  replacement +
  "</diagram>" +
  source.slice(target.end);

fs.writeFileSync(file, patched, "utf8");

const after = [...patched.matchAll(/<diagram\b[^>]*>/g)].map((m) => {
  const start = m.index + m[0].length;
  const end = patched.indexOf("</diagram>", start);
  return { id: attr(m[0], "id"), name: attr(m[0], "name"), body: patched.slice(start, end) };
});

console.log(`backup   -> ${backup}`);
console.log(`patched  -> ${file} (${source.length} -> ${patched.length} bytes)`);
console.log("before:");
console.log(summarize(pages));
console.log("after:");
console.log(summarize(after));

const lost = pages.filter((before) => {
  const now = after.find((p) => p.id === before.id);
  return before.id !== target.id && now && countCells(now.body) !== countCells(before.body);
});
if (lost.length > 0) {
  die(`untouched pages changed — restore from ${backup}`);
}
