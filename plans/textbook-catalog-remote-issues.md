# Textbook Catalog Remote Cleanup Issues

Checked against the remote PostgreSQL catalog before migration `V8__clean_textbook_catalog_duplicates.sql`.

## Fixed by V8

- `LI10`: duplicated chapter display name `CHUONG I`.
  - `CH0` was imported as a heading-only chapter.
  - `CH0/B0` was imported as a heading-only lesson with the same name.
  - Kept the real chapter `CH1`.
- `HOA_12/CH0`: front matter imported as lessons.
  - Rows included title/cover, usage guide, and foreword content.
  - Removed the whole metadata chapter.
- `HOA_12/END`: empty end-of-book metadata chapter.
- `TOAN12_T1/CH0`: empty opening metadata chapter.

## Reviewed, Not Removed

- `LI11/CH0` and `LI12/CH0`: opening chapters with one lesson each.
  - They are not duplicates in the current catalog.
- `TOAN11_T2/CH0`: opening chapter with one lesson named `CHUONG VI`.
  - Suspicious importer output, but not a duplicate; needs source-book validation before deletion.
- `HOA_10/CH0/BAI_0`: lesson name equals chapter name `Mo dau`.
  - This may be valid opening content.
- `TOAN12_T2/PRACTICE/HDTH`: lesson name equals chapter name.
  - This may be valid experiential-practice content.

## Remote Duplicate Scan Summary

- Duplicate chapter names per book: 1 group, fixed (`LI10`: `CH0`, `CH1`).
- Duplicate chapter codes per book: 0.
- Duplicate lesson codes per chapter: 0.
- Duplicate textbook display rows in `textbook_names`: 0.
