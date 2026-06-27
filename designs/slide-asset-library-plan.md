# Slide Asset Library — Plan (visual quality)

## Context
Slide sinh ra hiện trông generic & nửa trống: ô "Ảnh minh hoạ" là placeholder xám
không bao giờ được lấp, nền trơn một màu. Nguyên nhân gốc (đã phân tích): pipeline
sinh HTML tự do bằng model nhỏ (`deepseek-v4-flash`) không tạo nổi phong cách
template kiểu Canva/SlidesGo "doodle chemistry" (nền thiết kế + illustration phẳng
nhiều màu). Editor THỰC RA đã đủ sức render kiểu đó: `ImageElement.src` nhận URL bất
kỳ, có thể đặt 1 image phủ toàn canvas làm nền. Thiếu **duy nhất**: thư viện tài sản
đồ hoạ + cơ chế đặt chúng vào slide.

Mục tiêu (demo): ô xám → illustration hoá học thật; nền trơn → nền pattern có thiết kế.
Phạm vi: **chỉ frontend** (BE đã phát ra `data-image-prompt` tiếng Anh sẵn).

## Quyết định kiến trúc
- "Mốc 1 thủ sẵn cho mở rộng": bytes để trong `fe/public/slide-assets/`, metadata +
  matching tập trung tại `fe/lib/slide-assets/` → sau này lên Cloudflare R2 + Postgres
  chỉ sửa một chỗ (`resolve.ts`). Slide tham chiếu bằng URL `/slide-assets/...`.
- Demo: ~40–50 icon (mở tới ~200 sau), 4–6 nền.

## Nguồn tài sản
- **Icon:** OpenMoji (CC BY-SA 4.0) — flat, viền đen, nhiều màu, có sẵn bộ khoa học/
  giáo dục. Tải theo codepoint từ jsDelivr `openmoji@15.0.0/color/svg/<CP>.svg`
  (fallback raw.githubusercontent hfg-gmuend/openmoji). Ghi credit ở CREDITS.md.
- **Nền:** tự viết SVG pattern (giấy ô ly, chấm bi, lưới chéo…) → không vướng license,
  recolor được. (Hero Patterns CC BY là phương án thay thế nếu cần.)

## Cấu trúc file
```
fe/public/slide-assets/
  backgrounds/*.svg        # nền pattern tự viết
  icons/*.svg              # OpenMoji, lưu tên mô tả (test-tube.svg…)
  CREDITS.md               # nguồn + license
fe/lib/slide-assets/
  manifest.json            # { icons:[{file,tags[]}], backgrounds:[{file}] } (script sinh)
  resolve.ts               # resolveUrl / matchIcon / pickBackground (CHỖ DUY NHẤT map id→URL)
scripts/fetch-slide-assets.mjs   # tải icon + sinh manifest.json + CREDITS.md
```

## Các bước
1. **Scaffold + nền:** tạo thư mục; tự viết 4–6 SVG pattern vào `backgrounds/`.
2. **Tải icon + manifest:** `scripts/fetch-slide-assets.mjs` chứa danh sách
   `{cp, name, tags(en+vi)}`, tải SVG → `icons/<name>.svg`, ghi `manifest.json` +
   `CREDITS.md`. Chạy script.
3. **resolve.ts:**
   - `iconUrl/backgroundUrl(file)` → `/slide-assets/...`.
   - `matchIcon(prompt)`: tách từ khoá từ `data-image-prompt` (EN) → chấm điểm trùng
     tag (tags chứa cả EN + VI) → URL tốt nhất hoặc `null`.
   - `matchIconOrDefault(prompt, seed)`: không khớp → 1 icon chung (theo hash seed) để
     demo không còn ô xám.
   - `pickBackground(seed)`: chọn nền ổn định theo deck (hash).
4. **Ghép icon:** `fe/components/slide-editor/lib/html-to-slide.ts` — nhánh image của
   zone: thay `PLACEHOLDER_IMAGE` bằng `matchIconOrDefault(prompt, deckSeed)`; image
   illustration dùng `fit:"contain"`.
5. **Ghép nền:** `htmlToSlideElements(html, opts?)` nhận `bgImageUrl` → unshift 1
   ImageElement phủ 960×540, z=0, locked. `run-design-pipeline.ts` gọi
   `pickBackground(topic)` một lần, truyền vào lần convert skin + từng slide.

## Kiểm thử
- `cd fe && npm run lint && npm run typecheck && npm run build`.
- `/slide-create` → outline → generate deck Hoá: (1) ô xám → icon hoá học,
  (2) nền có pattern, (3) layout không vỡ. Thử `matchIcon` với vài prompt mẫu
  ("test tube with gas", "molecule structure", "lab flask reaction").

## Ngoài phạm vi (Mốc 2–3 sau)
Đụng BE, sinh ảnh AI, R2 + Postgres + API match, recolor icon theo mood, semantic
search bằng embedding.
