#!/usr/bin/env python3
"""Patch cells in an .xlsx by editing the sheet XML inside the zip.

Why not openpyxl: these Report5.x workbooks carry charts, comments, vml drawings
and images. openpyxl's load/save round-trip silently drops them. This script
rewrites only the targeted sheet XML and copies every other zip entry byte-for-byte.

Usage:
    py patch_xlsx.py spec.json

spec.json:
{
  "src": "ut.xlsx",
  "out": "ut.new.xlsx",                     # omit to patch in place
  "sheets": {
    "deleteTeacher": {
      "clear": ["B9:Z30", "F43:Z44"],       # ranges emptied, style kept
      "set": {"F7": "UTC-DT-01", "A5": 7}   # str -> inline string, int/float -> number
    }
  }
}

Values that are None or "" clear the cell. Cells must already exist in the sheet
(these templates have every column materialised); a missing cell is reported and
inserted in column order inside its row, and a missing row is an error.
"""
import json
import re
import sys
import zipfile

NS_R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def col_to_num(col):
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n


def num_to_col(n):
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def split_ref(ref):
    m = re.match(r"([A-Z]+)(\d+)$", ref)
    if not m:
        raise ValueError("bad cell ref: %s" % ref)
    return m.group(1), int(m.group(2))


def expand_range(rng):
    if ":" not in rng:
        return [rng]
    a, b = rng.split(":")
    c1, r1 = split_ref(a)
    c2, r2 = split_ref(b)
    n1, n2 = sorted((col_to_num(c1), col_to_num(c2)))
    r1, r2 = sorted((r1, r2))
    return ["%s%d" % (num_to_col(c), r) for r in range(r1, r2 + 1) for c in range(n1, n2 + 1)]


def esc(text):
    return (str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def sheet_targets(zf):
    """Map sheet display name -> zip entry path."""
    wb = zf.read("xl/workbook.xml").decode("utf-8")
    rels = zf.read("xl/_rels/workbook.xml.rels").decode("utf-8")
    rid_to_target = dict(
        re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels)
    )
    out = {}
    for tag in re.findall(r"<sheet [^>]*/>", wb):
        name = re.search(r'name="([^"]+)"', tag).group(1)
        rid = re.search(r'r:id="([^"]+)"', tag).group(1)
        target = rid_to_target[rid]
        out[name] = "xl/" + target.lstrip("/").replace("xl/", "", 1) if target.startswith("xl/") else "xl/" + target
    return out


CELL_RE_TMPL = r'<c r="%s"(?P<attrs>[^>]*?)(?:/>|>(?P<body>.*?)</c>)'


def find_cell(xml, ref):
    return re.search(CELL_RE_TMPL % ref, xml, re.S)


def build_cell(ref, style_attr, value):
    if value is None or value == "":
        return '<c r="%s"%s/>' % (ref, style_attr)
    if isinstance(value, bool):
        raise ValueError("bool not supported: %s" % ref)
    if isinstance(value, (int, float)):
        return '<c r="%s"%s><v>%s</v></c>' % (ref, style_attr, value)
    return '<c r="%s"%s t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>' % (
        ref, style_attr, esc(value))


def style_of(attrs):
    m = re.search(r'\ss="\d+"', attrs or "")
    return m.group(0) if m else ""


def insert_cell(xml, ref, cell_xml, report):
    col, row = split_ref(ref)
    m = re.search(r'<row r="%d"[^>]*>(.*?)</row>' % row, xml, re.S)
    if not m:
        raise ValueError("row %d missing in sheet, cannot insert %s" % (row, ref))
    body = m.group(1)
    target_n = col_to_num(col)
    pos = len(body)
    for cm in re.finditer(r'<c r="([A-Z]+)\d+"', body):
        if col_to_num(cm.group(1)) > target_n:
            pos = cm.start()
            break
    new_body = body[:pos] + cell_xml + body[pos:]
    report.append("inserted %s" % ref)
    return xml[: m.start(1)] + new_body + xml[m.end(1):]


def shift_ref(ref, at, count):
    col, row = split_ref(ref)
    return "%s%d" % (col, row + count) if row >= at else ref


def insert_rows(xml, at, count, report):
    """Push rows >= `at` down by `count`, then clone the style row into the gap.

    The Confirm block in these templates only leaves four exception rows, which is what
    forces the original document to cram several different exceptions into one cell.
    """
    def bump_row(m):
        r = int(m.group(1))
        return '<row r="%d"' % (r + count if r >= at else r)

    def bump_cell(m):
        return '<c r="%s"' % shift_ref(m.group(1), at, count)

    xml = re.sub(r'<row r="(\d+)"', bump_row, xml)
    xml = re.sub(r'<c r="([A-Z]+\d+)"', bump_cell, xml)

    for tag, attr in (("mergeCell", "ref"), ("dataValidation", "sqref"), ("dimension", "ref")):
        def bump_range(m, attr=attr):
            parts = []
            for token in m.group(2).split():
                parts.append(":".join(shift_ref(p, at, count) for p in token.split(":")))
            return '%s%s="%s"' % (m.group(1), attr, " ".join(parts))
        xml = re.sub(r'(<%s[^>]*?\s)%s="([^"]+)"' % (tag, attr), bump_range, xml)

    template = re.search(r'<row r="%d"[^>]*>.*?</row>' % (at + count), xml, re.S)
    if template:
        blank = re.sub(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>.*?</c>)',
                       lambda m: '<c r="%s%%d"%s/>' % (m.group(1), style_of(m.group(2))),
                       template.group(0), flags=re.S)
        head = re.match(r'<row r="\d+"([^>]*)>', blank).group(1)
        new_rows = ""
        for i in range(count):
            body = blank.split(">", 1)[1].rsplit("</row>", 1)[0] % tuple([at + i] * blank.count("%d"))
            new_rows += '<row r="%d"%s>%s</row>' % (at + i, head, body)
        xml = xml[: template.start()] + new_rows + xml[template.start():]
    report.append("inserted %d row(s) at %d" % (count, at))
    return xml


def clone_column_style(xml, src_col, dst_cols, row_from, row_to, report):
    """Copy a column's per-row style into other columns so the printed grid keeps its borders.

    The template only styles ~14 case columns; a sheet with more cases spills outside the
    form (no header fill, no borders). Clone the style of an existing case column into the
    extra ones, and move the closing-edge columns further right, before writing content.
    """
    for row in range(row_from, row_to + 1):
        m = re.search(r'<row r="%d"[^>]*>(.*?)</row>' % row, xml, re.S)
        if not m:
            continue
        body = m.group(1)
        src = re.search(CELL_RE_TMPL % ("%s%d" % (src_col, row)), body, re.S)
        if not src:
            continue
        style = style_of(src.group("attrs"))
        for dst in dst_cols:
            ref = "%s%d" % (dst, row)
            cm = re.search(CELL_RE_TMPL % ref, body, re.S)
            if cm:
                keep = cm.group("body") or ""
                attrs = cm.group("attrs") or ""
                t = re.search(r'\st="[^"]+"', attrs)
                new = '<c r="%s"%s%s>%s</c>' % (ref, style, t.group(0) if t else "", keep) \
                    if keep else '<c r="%s"%s/>' % (ref, style)
                body = body[: cm.start()] + new + body[cm.end():]
            else:
                target_n = col_to_num(dst)
                pos = len(body)
                for cm2 in re.finditer(r'<c r="([A-Z]+)\d+"', body):
                    if col_to_num(cm2.group(1)) > target_n:
                        pos = cm2.start()
                        break
                body = body[:pos] + '<c r="%s"%s/>' % (ref, style) + body[pos:]
        xml = xml[: m.start(1)] + body + xml[m.end(1):]
    report.append("cloned style %s -> %s (rows %d-%d)" % (src_col, ",".join(dst_cols), row_from, row_to))
    return xml


def patch_sheet(xml, ops, report):
    for copy in ops.get("copy_style", []):
        src = find_cell(xml, copy["from"])
        if not src:
            raise ValueError("copy_style source missing: %s" % copy["from"])
        style = style_of(src.group("attrs"))
        for ref in copy["to"]:
            m = find_cell(xml, ref)
            if not m:
                continue
            keep = m.group("body") or ""
            attrs = m.group("attrs") or ""
            t = re.search(r'\st="[^"]+"', attrs)
            new = '<c r="%s"%s%s>%s</c>' % (ref, style, t.group(0) if t else "", keep) \
                if keep else '<c r="%s"%s/>' % (ref, style)
            xml = xml[: m.start()] + new + xml[m.end():]
            report.append("copied style %s -> %s" % (copy["from"], ref))

    for clone in ops.get("clone_styles", []):
        xml = clone_column_style(xml, clone["from"], clone["to"],
                                 int(clone.get("rows", [1, 70])[0]),
                                 int(clone.get("rows", [1, 70])[1]), report)

    if ops.get("insert_rows"):
        spec = ops["insert_rows"]
        xml = insert_rows(xml, int(spec["at"]), int(spec.get("count", 1)), report)

    changes = {}
    for rng in ops.get("clear", []):
        for ref in expand_range(rng):
            changes[ref] = None
    for ref, value in ops.get("set", {}).items():
        changes[ref] = value

    for ref, value in changes.items():
        m = find_cell(xml, ref)
        if m:
            if value is None and m.group(0).endswith("/>") and not m.group("body"):
                continue  # already empty
            new = build_cell(ref, style_of(m.group("attrs")), value)
            if new != m.group(0):
                xml = xml[: m.start()] + new + xml[m.end():]
                report.append(("cleared " if value in (None, "") else "set ") + ref)
        elif value not in (None, ""):
            xml = insert_cell(xml, ref, build_cell(ref, "", value), report)
    return xml


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    src = spec["src"]
    out = spec.get("out", src)

    zin = zipfile.ZipFile(src)
    names = zin.namelist()
    data = {n: zin.read(n) for n in names}
    infos = {n: zin.getinfo(n) for n in names}
    targets = sheet_targets(zin)
    zin.close()

    report = []
    for sheet, ops in spec["sheets"].items():
        if sheet not in targets:
            raise SystemExit("sheet not found: %s (have: %s)" % (sheet, ", ".join(sorted(targets))))
        path = targets[sheet]
        report.append("--- %s -> %s" % (sheet, path))
        xml = data[path].decode("utf-8")
        data[path] = patch_sheet(xml, ops, report).encode("utf-8")

    zout = zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED)
    for n in names:
        zout.writestr(infos[n], data[n])
    zout.close()

    after = zipfile.ZipFile(out).namelist()
    assert after == names, "zip entry list changed - aborting"
    print("\n".join(report))
    print("OK: %d entries preserved -> %s" % (len(after), out))


if __name__ == "__main__":
    main()
