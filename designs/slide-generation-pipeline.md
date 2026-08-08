# Slide Generation Pipeline (HTML skin 3 bước) — Thiết kế chuẩn

> Đây là pipeline **chuẩn** để sinh slide từ AI cho EDUA. Thay vì để AI tự bịa
> toạ độ `x/y/w/h` cho từng element (mô hình cũ — xem
> [`API_designs/slide-generation.md`](./API_designs/slide-generation.md)),
> pipeline này cho AI sinh **HTML có layout thật** theo 3 bước tách biệt
> (nền → khung/zone → nội dung), render đo bằng trình duyệt, rồi mới convert
> sang element editor. Cách này chống tràn (overflow) và đè (overlap) tốt hơn
> hẳn vì mỗi bước có ràng buộc rõ và bước sau không được sửa kết quả bước trước.
>
> Tham chiếu nghiên cứu gốc: `research/slide-bai-hoc-chong-tran-tu-oss.md`,
> `research/convert-slide-html-sang-editor.md`,
> `research/slide-quy-tac-lop-validator.md` (project `edua-system` cũ).

---

## 1. Vì sao chọn pipeline này

Mô hình cũ (AI emit JSON element với toạ độ tuyệt đối) gặp 3 bug khó dứt:

1. **Tràn:** AI khai `width=500, height=120` nhưng text render thật wrap dài hơn → vượt khung.
2. **Đè:** AI đặt 2 element cùng tầng giẫm chân nhau.
3. **Thiếu / sai ảnh minh hoạ.**

Gốc rễ: AI **đoán** layout chứ không **đo** layout. Pipeline HTML giải quyết bằng:

- AI sinh **HTML + CSS thật** → trình duyệt tính layout thật (`getBoundingClientRect`),
  không còn cảnh AI đoán sai kích thước.
- Tách thành **3 call độc lập**, mỗi call một nhiệm vụ hẹp → dễ ràng buộc, dễ
  debug, dễ retry từng bước mà không phải sinh lại toàn bộ.
- **Hợp đồng bảo toàn (preservation contract):** bước sau bắt buộc giữ nguyên
  từng byte output của bước trước, chỉ được *append*. Nhờ vậy nền/khung không
  bao giờ bị xê dịch khi đổ nội dung.
- **Zone có cap số** (`data-max-chars`, `data-max-lines`) → ràng buộc lượng chữ
  *trước* khi đổ nội dung, thay vì kiểm tra tràn *sau*.

Trade-off chấp nhận: tốn 3 lượt gọi AI cho mỗi slide (có thể cache bước 1 ở mức
deck), đổi lại layout ổn định và editor-friendly.

---

## 2. Mô hình layer (khái niệm cốt lõi)

Một slide là 1 canvas cố định **960×540 px**. Mọi thứ được phân thành các tầng,
mỗi tầng do một bước sinh ra và **không bị bước sau sửa**:

| Tầng | Tên | Sinh ở bước | Đánh dấu | Vai trò |
|------|-----|-------------|----------|---------|
| L0 | Background | Step 1 | `data-layer="bg"` (trên root) | Nền của cả deck |
| L1 | Decoration | Step 1 | `data-layer="deco"` | Trang trí phi nội dung (watermark số, hình khối mờ, divider) |
| L2 | Header | Step 1 | `data-region="header"` | Masthead dùng chung mọi slide, có `data-body-top` |
| L2 | Body struct | Step 2 | `data-layer="struct" data-region="body"` | Khung chứa (sidebar / card / divider) trong vùng body |
| L2 | Body zones | Step 2 | `data-layer="zone"` | Ô trống định vị sẵn (hero/body/aside/caption/formula) kèm bbox + cap |
| L3 | Content | Step 3 | `data-layer="content"` | Nội dung thật, *append* vào trong từng zone/header |

**Ý tưởng chính:** L0–L2 là "sân khấu trống đã thiết kế"; L3 chỉ là diễn viên
bước lên sân khấu. Header dùng chung cả deck (sinh 1 lần), body khác nhau mỗi slide.

---

## 3. Kiến trúc thành phần

### Backend (theo layered architecture của dự án)

```
presentation/controller/SlideDesignController        POST /api/slide-design/generate-html
service (use-case)/GenerateSlideHtmlDesignUseCase     điều phối theo `step`, gọi AI, trích HTML, validate
service/slidedesign/SlideDesignPromptBuilder          dựng prompt cho từng bước
service/slidedesign/SlideHtmlExtractor                bóc HTML sạch khỏi output AI
presentation/dto/slidedesign/SlideHtmlDesignRequest   { topic, outline, styleHint, subject, step, priorHtml }
presentation/dto/slidedesign/SlideHtmlDesignResponse  { html, latencyMs, modelUsed, warning }
repository/gateways/AiClient                           gọi LLM (OpenAI primary → DeepSeek fallback)
```

> **Lưu ý:** chỉ có **một endpoint** `POST /api/slide-design/generate-html`.
> Bước nào được quyết bằng field `step` trong body. Đây là API **đồng bộ** —
> mỗi call trả HTML của đúng một bước. Không dùng STOMP/WebSocket như pipeline cũ.

### Frontend

```
lib/api/slide-design.ts          client gọi generateSlideHtmlDesign(req)
app/<route>/page.tsx             màn điều phối 3 bước tuần tự + preview iframe
app/.../lib/html-to-slide.ts     convert HTML cuối → CE[] (element model của editor)
```

---

## 4. Hợp đồng API

`POST /api/slide-design/generate-html`

**Request:**

```jsonc
{
  "subject": "Vật lý",                  // mặc định "Vật lý" nếu rỗng
  "topic": "Định luật II Newton",       // chủ đề slide
  "outline": "- Phát biểu: F = ma\n- ...", // dàn ý (text/markdown tự do)
  "styleHint": "Light mode, navy",      // optional — gợi ý phong cách của GV
  "step": "bg_deco",                    // "bg_deco" | "structural" | "content_fill" | (rỗng = full 1-call)
  "priorHtml": "<div data-layer=\"bg\" ...></div>" // BẮT BUỘC cho structural & content_fill
}
```

**Response:**

```jsonc
{
  "html": "<div data-layer=\"bg\" ...>...</div>", // fragment HTML của bước
  "latencyMs": 8421,
  "modelUsed": "openai/gpt-...",
  "warning": "Step 2: AI không khai báo zone nào (data-zone)" // null nếu ok
}
```

`step` quyết định prompt:

| `step` | Prompt | Cần `priorHtml`? |
|--------|--------|------------------|
| `bg_deco` | Step 1 — nền + trang trí + header placeholder | Không |
| `structural` | Step 2 — body struct + body zones | **Có** (HTML step 1) |
| `content_fill` | Step 3 — đổ nội dung vào zone/header | **Có** (HTML step 2) |
| (rỗng/khác) | Full — sinh nguyên slide trong 1 call (legacy/nhanh) | Không |

Nếu `structural`/`content_fill` mà thiếu `priorHtml` → trả `html=""` + warning, không gọi AI.

---

## 5. Step 1 — Background + Decoration + Header

**Mục tiêu:** sinh "skin" của deck — nền (L0), 1–3 trang trí (L1), và **placeholder
header** (L2). Header này sẽ xuất hiện **y hệt trên mọi slide**, nên phải thiết kế
như masthead tái dùng, *không* gắn nội dung slide cụ thể.

**Root bắt buộc:**

```html
<div data-layer="bg" style="position:relative; width:960px; height:540px;
     overflow:hidden; font-family:Inter,sans-serif; background:[nền theo mood]">
  ...children...
</div>
```

**Decoration (L1) — 1 đến 3 phần tử**, mỗi phần tử:
- `data-layer="deco"`, `data-slide-el="text"` (số/chữ cỡ lớn) hoặc `"shape"` (hình khối)
- `position:absolute` với `left/top/width/height` theo **px**, `z-index` 1–30
- Phi nội dung: watermark số (font 200–400px, opacity 0.05–0.15), hình khối mờ
  (opacity 0.08–0.30), hairline divider, off-canvas bleed. **Cấm** chữ tiếng Việt
  thành câu, ảnh, SVG, `data-zone`.

**Header (L2) — đúng MỘT placeholder**, inset khỏi mép canvas:
- Thuộc tính: `data-layer="struct"`, `data-region="header"`, `data-slide-el="shape"`,
  `data-body-top="<BT>"` (**bắt buộc**), `z-index` 31–40.
- Vị trí: `top ∈ [12,24]`, `left ∈ [16,32]`, `width = 960 − 2×left`, `height ∈ [40,64]`.
- Sau header chừa gap `∈ [12,24]`. **`data-body-top = top + height + gap`** — đây là
  toạ độ y mà vùng body bắt đầu; Step 2 dùng giá trị này để ép mọi element body
  `y ≥ data-body-top`. Ví dụ: `top=16, height=48, gap=16 → data-body-top="80"`.
- Render dạng **debug overlay**: outline gạch đứt + nền rgba mờ + 2 dòng legend
  (`struct: header` và `WxH · deck masthead (filled later)`). **Chưa** điền text thật.
- Mood tối (B/E) đổi màu rgba sang sáng để legend còn đọc được.

**Output:** bắt đầu đúng `<div data-layer="bg" style="position:relative; width:960px;`,
kết thúc `</div>`. Không preamble, không markdown fence.

**Validate (BE):**
- thiếu `data-layer="bg"` trên root → warning
- thiếu `data-region="header"` → warning
- thiếu `data-body-top=` → warning (Step 2 sẽ fallback 80px)

---

## 6. Step 2 — Body structural + Body zones

**Input:** `priorHtml` = HTML Step 1. BE đọc `data-body-top` từ đó
(`extractBodyTop`, clamp về [40,160], mặc định 80) và truyền `BODY_TOP` vào prompt.

**Hợp đồng bảo toàn (hard rule):** giữ **byte-identical** toàn bộ Step 1 (root tag,
mọi `deco`, mọi `header`, thứ tự DOM, `</div>` cuối). Chỉ được *append* sibling mới.
Sửa 1 ký tự của element cũ → output bị từ chối.

**Body struct (L2) — 0 đến 3 phần tử:**
- `data-layer="struct"`, `data-region="body"`, `data-slide-el="shape"`, `z-index` 41–60
- `position:absolute` px, `top ≥ BODY_TOP` và `top+height ≤ 540`
- Loại cho phép: sidebar stripe (rộng 60–140px), card bo góc + shadow nhẹ, column
  divider (hairline 1–2px). Các struct **không đè nhau** — chúng định nghĩa vùng
  cho zone nằm vào.

**Body zones (L2) — 2 đến 4 ô (ưu tiên 3):** mỗi ô là `<div>` rỗng định vị sẵn:
- `data-layer="zone"`, `data-region="body"`, `data-zone="<id>"`
- `id ∈ { hero, body, aside, caption, formula }` (**`label` dành riêng cho header**, cấm dùng làm zone body)
- bbox: `data-bbox-x/y/w/h` (số nguyên, px) **khớp** với `left/top/width/height` inline
- cap: `data-max-chars` (int), `data-max-lines` (1–6)
- `data-content-hint` (tiếng **Anh**) mô tả nội dung tương lai
- `z-index` 41–60, nằm hẳn trong body: `x≥0, x+w≤960, y≥BODY_TOP, y+h≤540`
- **Không đè nhau** (được phép nằm trong card struct)
- Render **debug overlay** giống header: outline gạch đứt + 2 legend span
  (`zone: <id>` và `<w>×<h> · max <N> chars · <L> lines`).

**Ý nghĩa zone id → loại nội dung (dùng ở Step 3):**

| `data-zone` | Step 3 đổ vào | Element editor |
|-------------|---------------|----------------|
| `hero` | tiêu đề lớn / headline | text (h1) |
| `body` | đoạn văn hoặc bullet | text (ul/p) |
| `aside` | placeholder ảnh (`data-image-prompt`) | image |
| `caption` | chú thích ngắn | text (small) |
| `formula` | công thức LaTeX `\( … \)` | latex |

**Validate (BE):** không có `data-zone=` → warning; decoration Step 1 bị đổi → warning;
header Step 1 bị xoá → warning.

---

## 7. Step 3 — Content fill (L3)

**Input:** `priorHtml` = HTML Step 2 (skin + header placeholder + body struct +
zone rỗng có overlay debug).

**Hợp đồng bảo toàn:** giữ nguyên byte mọi thứ. Chỉ *append* **children mới bên
trong** header placeholder và từng zone div, **sau** 2 legend span đang có. Không
sửa opening tag / inline style / legend của zone.

**Header content:** append 1 `<span data-layer="content">[SUBJECT] · [TOPIC]</span>`
(nhãn deck-level duy nhất, không số trang). Màu chữ chọn cho đọc được trên nền debug.

**Zone content:** trong mỗi zone, append child `data-layer="content"` (z-index 61–99),
inline style ghi đè màu debug cho dễ đọc, map theo `data-zone`:

```
hero    → <h1> font 40–72px, weight 800, letter-spacing -0.02em
body    → <ul><li>…</li></ul> hoặc <p>… ; tôn trọng data-max-lines / data-max-chars
aside   → <div data-slide-el="image" data-image-prompt="<english, rất cụ thể>">
          [Sơ đồ: chú thích tiếng Việt] </div>   ← KHÔNG phải <img> src thật
caption → <small> 12–14px
formula → <span>\( F = m·a \)</span>  (iframe có KaTeX auto-render)
```

Quy tắc: text tiếng **Việt** (chỉ `data-image-prompt` và design token là tiếng Anh);
tôn trọng cap mỗi zone; không thêm top-level element mới; không SVG/script/animation/
`<img>` thật/iframe/font lạ; không màu nguyên bão hoà (#ff0000…).

**Hậu xử lý (BE) — quan trọng:** sau khi AI trả về, BE dùng Jsoup
(`stripDebugLegends`) **xoá 2 legend span debug** trong mỗi `[data-region=header]`
và `[data-layer=zone]` (nhận diện theo *text* của span: khớp regex `^(zone|struct):`
hoặc `^\d+×\d+ ·`), giữ lại outline gạch đứt (vẫn hữu ích làm tham chiếu layout) và
toàn bộ content thật. Nhờ vậy slide cuối chỉ còn nội dung trong khung.

**Validate (BE):** header/zone bị xoá → warning; số zone giảm so với Step 2 → warning;
thiếu `data-layer="content"` → warning; overlay dashed bị xoá → warning.

---

## 8. Bóc HTML khỏi output AI — `SlideHtmlExtractor`

LLM hay kèm preamble ("Dưới đây là slide…") dù prompt cấm. Extractor xử lý bền:

1. Xoá block `<think>…</think>` (model reasoning).
2. Nếu có ```` ```html … ``` ```` ở bất kỳ đâu → lấy nội dung trong fence.
3. Nếu không → tìm mốc mở HTML đầu tiên (`<!doctype`, `<html`, `<div`), lấy từ đó
   tới hết, cắt fence/text thừa ở đuôi.
4. Fallback: trả input đã trim.

UseCase còn đặt cờ `strippedPreamble` khi `raw` dài hơn `html` đáng kể để cảnh báo.

---

## 9. Điều phối phía Frontend

Màn FE chạy **3 bước tuần tự**, mỗi bước là 1 lần gọi `generateSlideHtmlDesign`:

```
Step 1 (bg_deco)        → lưu html1
Step 2 (structural)     → gửi priorHtml = html1 → lưu html2
Step 3 (content_fill)   → gửi priorHtml = html2 → lưu html3 (slide hoàn chỉnh)
```

Nguyên tắc UX:
- **Chạy lại bước trên làm vô hiệu bước dưới** (rerun Step 1 → xoá Step 2 & 3).
  Đảm bảo `priorHtml` luôn nhất quán.
- Toàn bộ state (`topic/subject/outline/styleHint` + html từng bước) **persist
  localStorage** để reload không mất.
- **Preview** bằng `<iframe>` 960×540 (scale theo bề rộng container qua
  `ResizeObserver`), document wrap kèm Tailwind CDN + Google Fonts (Inter/
  Newsreader/Roboto/JetBrains Mono) + **KaTeX auto-render** để công thức hiển thị.
- Cho xem code HTML thô + copy, và switch xem preview Step 1/2/3.

---

## 10. Convert HTML → element editor — `html-to-slide.ts`

Sau khi có HTML cuối (Step 3), convert sang model phẳng `CE[]` của editor:

**Chiến lược "đo thật":** mount HTML vào **iframe ẩn 960×540**, chờ layout + Tailwind
CDN + webfont settle (`fonts.ready` + delay ~400ms), rồi duyệt node lấy
`getBoundingClientRect()` (toạ độ tuyệt đối) + `getComputedStyle()`.

**Node được lấy (bỏ qua debug chrome):**

| Nguồn | Selector | Convert thành |
|-------|----------|---------------|
| L1 decoration | `[data-layer="deco"]` | `text` (nếu `data-slide-el=text`) hoặc `rect`/`ellipse` |
| L2 body struct | `[data-layer="struct"][data-region="body"]` | `rect`/`ellipse` (bỏ header band debug) |
| Header label | `[data-region="header"] [data-layer="content"]` | `text` |
| L3 zone content | `[data-layer="zone"] [data-layer="content"]` | text / image / (latex skip) |

**Quy tắc chi tiết:**
- Hình: phân biệt `ellipse` khi `border-radius:50%` hoặc bo gần tròn; đọc fill
  (gồm cả gradient string), stroke, strokeW, opacity.
- Text: đọc fontSize, bold (`font-weight ≥ 600`), italic, color, align.
- `<ul>/<ol>` → gộp các `<li>` thành text nhiều dòng có bullet `•`.
- `aside`/`data-image-prompt` → tạo box `image` placeholder (fill xám), prompt được
  log vào `skipped` (chưa sinh ảnh thật ở bước convert).
- LaTeX → **skip** (log vào `skipped`) — tạm thời chưa render thành element.
- Box `< 2px` bị bỏ. zIndex cấp tăng dần theo thứ tự duyệt.

Trả về `{ bg, elems, skipped }`.

---

## 11. Bảng tra thuộc tính dữ liệu (data contract)

| Thuộc tính | Trên | Ý nghĩa |
|------------|------|---------|
| `data-layer="bg"` | root div | tầng L0, gốc canvas |
| `data-layer="deco"` | child | trang trí L1 |
| `data-layer="struct"` | child | khung cấu trúc (header hoặc body struct) |
| `data-layer="zone"` | child | ô nội dung L2 |
| `data-layer="content"` | child trong zone/header | nội dung thật L3 |
| `data-region="header"` \| `"body"` | struct/zone | phân vùng header vs body |
| `data-slide-el="text\|image\|shape\|latex\|embed"` | child | loại element khi parse |
| `data-image-prompt` | div ảnh | mô tả tiếng Anh cho pipeline sinh ảnh |
| `data-body-top="N"` | header | y bắt đầu vùng body (Step 2 ép `y ≥ N`) |
| `data-zone="hero\|body\|aside\|caption\|formula"` | zone | vai trò ô |
| `data-bbox-x/y/w/h` | zone | bbox số (khớp inline pos) |
| `data-max-chars`, `data-max-lines` | zone | cap nội dung |
| `data-content-hint` | zone | gợi ý nội dung (tiếng Anh) |

---

## 12. Ràng buộc chung gửi cho AI (mọi bước)

- Canvas **960×540 px**, root `position:relative; overflow:hidden`.
- Mọi child `position:absolute` với `left/top/width/height` **px tuyệt đối** —
  cấm `%`, `vw/vh`, `calc()`, flex/grid ở cấp root (flex chỉ trong card nhỏ).
- Typography 3 cấp (display 64–120px / body 16–22px / label 11–13px UPPERCASE);
  palette 3 màu (1 chủ đạo + 1 accent + 1 trung tính); chừa 30–45% khoảng trống.
- **Cấm tuyệt đối:** `<svg>` (kể cả icon/mũi tên), sơ đồ tự ghép bằng `<div>`,
  `<script>`/event handler, `<iframe>/<video>/<audio>`, CSS animation/transition/
  3D transform, `::before/::after`, `conic/radial-gradient`, `<img>` src thật,
  font ngoài {Inter, Roboto, Newsreader, JetBrains Mono}, màu nguyên bão hoà.
- **Hình minh hoạ chỉ qua placeholder** `data-image-prompt` (tiếng Anh, rất cụ thể)
  — backend mới sinh/đổ ảnh thật sau.
- Text trong slide bằng **tiếng Việt**; chỉ design token + `data-image-prompt`
  dùng tiếng Anh.
- 5 "mood" gợi ý: A. Editorial Academic, B. Neo-Physics Blueprint, C. Modern Swiss,
  D. Warm Gradient, E. Dark Mode Data (mỗi mood = 3 màu × bộ chữ riêng).

---

## 13. Phần chưa làm / hướng phát triển

Pipeline hiện ở mức **R&D một slide** (route test). Cần bổ sung để thành production:

1. **Render LaTeX thành element:** hiện `html-to-slide` skip latex; cần convert
   `\( … \)` thành element `latex` của editor.
2. **Validator deterministic + retry:** thêm Rule zone-caps (đếm char/line so với
   `data-max-chars/lines`), overlap check, bbox-trong-canvas → feedback số cụ thể
   để retry đúng bước bị lỗi (xem `research/slide-quy-tac-lop-validator.md`).
3. **Đo render thật để shrink-to-fit:** dùng headless browser đo overflow, ép
   retry rút gọn nếu vượt ngưỡng (chỉ shrink ≤ ~1.5×, **không** cho scroll slide).
4. **Mở rộng từ 1 slide → cả deck:** sinh outline nhiều slide (tái dùng bước
   outline của pipeline cũ), cache **skin Step 1 ở mức deck**, chạy Step 2+3 song
   song từng slide, lưu `SlideDeckRecord` + stream tiến trình.
5. **Bỏ debug overlay ở chế độ production:** hiện giữ outline gạch đứt làm tham
   chiếu; bản giao cho GV cần ẩn hẳn.

> **Đã làm (trước là mục 1 "Pipeline ảnh thật"):** `FillSlideContentUseCase`
> (BE) giờ gọi OpenAI Images API (`ImageGenerationClient`/`OpenAiImageAdapter`,
> model `gpt-image-1` mặc định qua `app.ai.openai.image-model` — dòng
> `dall-e-*` đã bị OpenAI gỡ khỏi API, không set `response_format` được nữa)
> cho mỗi slot
> `kind="image"`, upload PNG lên R2 (`StorageClient`, prefix `slide-images/`)
> và trả `imageUrl` trong `SlideContentFillSlotResponse`. Chạy song song qua
> `slideSessionExecutor` (virtual threads) khi có nhiều slot ảnh trong 1 slide.
> Lỗi sinh/upload ảnh chỉ log + rơi về `imageUrl=null` (giữ placeholder xám ở
> FE), không chặn cả slide. FE (`apply-content-slots.ts`) set `src` từ
> `imageUrl` nếu có, fallback `PLACEHOLDER_IMAGE` nếu không. Chưa có: fallback
> search ảnh có sẵn khi OpenAI lỗi, cache ảnh theo prompt trùng lặp, retry
> riêng cho ảnh lỗi.
