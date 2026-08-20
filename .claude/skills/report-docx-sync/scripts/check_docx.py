#!/usr/bin/env python3
"""Validate a .docx the way Word does — catches the failures that leave XML well-formed.

Word says "file appears to be corrupted" / "unreadable content" for five unrelated causes,
all with the same message. This runs every check at once so you stop guessing.

    py check_docx.py "H:/.../Report7_Final Project Report.docx"
    py check_docx.py file.docx --repack out.docx    # rebuild the zip container

Checks
  1. zip general-purpose flag bit 3 set without a data descriptor  -> Word refuses to open
  2. r:id / r:embed referenced by a part but missing from its .rels
  3. w:numId used in the document but undefined in numbering.xml
  4. w:tblStyle referenced but undefined in styles.xml
  5. file extensions inside word/media not declared in [Content_Types].xml

Exit code is the number of problems found, so it can gate a publish step.
"""
import re
import sys
import zipfile

R_REF = re.compile(r'r:(?:id|embed)="([^"]+)"')
REL_ID = re.compile(r'Id="([^"]+)"')
NUM_USE = re.compile(r'<w:numId w:val="(\d+)"')
NUM_DEF = re.compile(r'<w:num w:numId="(\d+)"')
TBL_USE = re.compile(r'<w:tblStyle w:val="([^"]+)"')
STYLE_DEF = re.compile(r'w:styleId="([^"]+)"')
CT_DEFAULT = re.compile(r'Extension="([^"]+)"')


def parts_with_rels(names):
    for name in names:
        if not name.startswith("word/") or not name.endswith(".xml"):
            continue
        if "/_rels/" in name:
            continue
        base = name.rsplit("/", 1)
        rels = "%s/_rels/%s.rels" % (base[0], base[1])
        yield name, (rels if rels in names else None)


def check_zip_flags(path):
    """Flag bit 3 promises a data descriptor after the data; Google Drive exports lie."""
    bad = []
    with open(path, "rb") as fh:
        raw = fh.read()
    zf = zipfile.ZipFile(path)
    for info in zf.infolist():
        if not info.flag_bits & 0x08:
            continue
        lho = info.header_offset
        if raw[lho:lho + 4] != b"PK\x03\x04":
            bad.append((info.filename, "local header not found"))
            continue
        name_len = int.from_bytes(raw[lho + 26:lho + 28], "little")
        extra_len = int.from_bytes(raw[lho + 28:lho + 30], "little")
        data_start = lho + 30 + name_len + extra_len
        tail = raw[data_start + info.compress_size: data_start + info.compress_size + 4]
        if tail != b"PK\x07\x08":
            bad.append((info.filename, "bit 3 set but no data descriptor"))
    zf.close()
    return bad


def main():
    path = sys.argv[1]
    repack_to = None
    if "--repack" in sys.argv:
        repack_to = sys.argv[sys.argv.index("--repack") + 1]

    zf = zipfile.ZipFile(path)
    names = set(zf.namelist())
    problems = []

    for name, why in check_zip_flags(path):
        problems.append("[zip] %s: %s" % (name, why))

    for part, rels_path in parts_with_rels(names):
        xml = zf.read(part).decode("utf-8", "replace")
        used = set(R_REF.findall(xml))
        if not used:
            continue
        declared = set(REL_ID.findall(zf.read(rels_path).decode("utf-8", "replace"))) if rels_path else set()
        for rid in sorted(used - declared):
            problems.append("[rels] %s references %s, not declared in %s" % (part, rid, rels_path or "(no .rels)"))

    doc_parts = [n for n in names if re.match(r"word/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$", n)]
    doc_xml = "".join(zf.read(n).decode("utf-8", "replace") for n in doc_parts)

    if "word/numbering.xml" in names:
        defined = set(NUM_DEF.findall(zf.read("word/numbering.xml").decode("utf-8", "replace")))
    else:
        defined = set()
    for num in sorted(set(NUM_USE.findall(doc_xml)) - defined - {"0"}):
        problems.append("[numbering] w:numId %s used but not defined" % num)

    styles = set()
    if "word/styles.xml" in names:
        styles = set(STYLE_DEF.findall(zf.read("word/styles.xml").decode("utf-8", "replace")))
    for st in sorted(set(TBL_USE.findall(doc_xml)) - styles):
        problems.append("[styles] w:tblStyle %s referenced but not defined" % st)

    ct = zf.read("[Content_Types].xml").decode("utf-8", "replace")
    declared_ext = {e.lower() for e in CT_DEFAULT.findall(ct)}
    media_ext = {n.rsplit(".", 1)[-1].lower() for n in names if n.startswith("word/media/") and "." in n}
    for ext in sorted(media_ext - declared_ext):
        problems.append("[content-types] .%s in word/media not declared" % ext)

    if repack_to:
        infos = {n: zf.getinfo(n) for n in zf.namelist()}
        data = {n: zf.read(n) for n in zf.namelist()}
        out = zipfile.ZipFile(repack_to, "w", zipfile.ZIP_DEFLATED)
        for n in zf.namelist():
            info = zipfile.ZipInfo(n, date_time=infos[n].date_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = infos[n].external_attr
            out.writestr(info, data[n])
        out.close()
        print("repacked -> %s (flags cleared)" % repack_to)

    zf.close()
    print("\n".join(problems) if problems else "clean: no container or resource problems found")
    print("%d problem(s), %d zip entries" % (len(problems), len(names)))
    sys.exit(len(problems))


if __name__ == "__main__":
    main()
