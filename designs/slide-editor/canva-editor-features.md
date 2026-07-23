# Canva Editor Features — Khảo sát chức năng

Tài liệu này tổng hợp các chức năng mà editor của **Canva** (đặc biệt là editor cho Presentation) cung cấp tính đến giữa năm 2026. Mục đích: làm tham khảo để team `edua-system` quyết định chức năng nào nên copy / chức năng nào bỏ qua khi thiết kế lại luồng chỉnh sửa slide nội bộ (canvas 960×540, dùng cho giáo viên soạn slide bài giảng vật lý).

## Phương pháp khảo sát

Đã đọc và đối chiếu các trang sau (Canva trực tiếp + blog/tutorial bên thứ ba để bổ sung chi tiết UI mà help center không nói rõ):

- Canva Help Center: `canva.com/help/canva-keyboard-shortcuts`, `canva.com/help/text-effects`, `canva.com/help/presenting-designs`, `canva.com/help/animate-designs`, `canva.com/help/page-transitions`, `canva.com/help/layer-group-align`, `canva.com/help/manage-pages`, `canva.com/help/format-text`, `canva.com/help/charts`, `canva.com/help/download-file-types`, `canva.com/help/using-design-accessibility`, `canva.com/help/connect-lines-to-elements`, `canva.com/help/background-remover`, `canva.com/help/using-magic-grab`, `canva.com/help/manage-folder-contents`
- Canva Design School & feature pages: `canva.com/canva-ai/`, `canva.com/magic-design/`, `canva.com/features/background-remover/`, `canva.com/features/magic-eraser/`, `canva.com/pro/magic-resize/`, `canva.com/design-school/resources/magic-guide-magic-switch`
- Canva Newsroom (release notes): `canva.com/newsroom/news/magic-studio/`, `canva.com/newsroom/news/whats-new-february/`, `canva.com/newsroom/news/whats-new-july-2025/`, `canva.com/newsroom/news/new-canva-presentations-features/`, `canva.com/newsroom/news/canva-ai-launches/`
- Blog/tutorial bên thứ ba: Design Bundles, Brenda Cadman, Fallon Travels, My Social Designer, Just Click Here, Made by Melody, Skywork.ai (Canva Presentation Animation Guide), Pixelhaze Mainframe, La Isla Designs, Rishfield Designs

Lưu ý: Canva block WebFetch (HTTP 403) nhưng metadata + snippet trả về qua search engine vẫn đủ chi tiết để trích xuất. Một số chi tiết UI lấy từ blog bên thứ ba sẽ được đánh dấu `(theo blog X)` nếu help chính chủ không xác nhận.

---

## 1. Element types (các loại đối tượng có thể đặt lên canvas)

Truy cập qua tab **Elements** ở sidebar trái. Bao gồm:

- **Text** — heading, subheading, body. Có thể chọn từ thư viện "Font combinations" để lấy cặp font đã pair sẵn.
- **Shapes** — hình cơ bản (rectangle, circle, triangle, polygon, star…) + flowchart shapes riêng (rectangle process, decision diamond, oval start/end, parallelogram I/O…).
- **Lines & arrows** — straight line, arrow, elbowed connector, dashed/dotted. Có "Quick Flow" — right-click shape → enable Quick Flow để arrow tự xuất hiện quanh shape giúp nối nhanh.
- **Photos** — thư viện ảnh stock + upload riêng.
- **Videos** — clip có thể trim, set volume, thumbnail; upload hoặc stock.
- **Audio** — nhạc nền, voiceover; có timeline trim.
- **Graphics / Illustrations** — vector illustrations, scenes.
- **Icons** — vector icon library.
- **Stickers** — graphic động (animated GIF/Lottie); chỉ giữ animation khi export MP4/GIF/share link, mất khi export PNG/JPG.
- **Charts** — bar, line, pie, donut, scatter, bubble, dot plot, treemap, radar, pictogram, organizational chart, mindmap (30+ loại). Chart builder có data editor riêng.
- **Tables** — bảng có thể add/delete row/column; format từng cell.
- **Frames** — placeholder hình dạng (tròn, polygon, device mockup, text-shaped...). Drag ảnh/video vào frame để crop tự động theo hình.
- **Grids** — chia canvas thành các slot ảnh để layout collage.
- **Embeds** — paste link YouTube, Vimeo, Spotify, Google Maps, Twitter, Figma, code playgrounds, v.v. Embed tương tác được khi share link, không khi export tĩnh.
- **LaTeX / equation** — không có native, phải dùng Canva App (KaTeX-style) từ marketplace.

## 2. Text editing

Toolbar trên cùng khi select text:

- **Font family** — search trong dropdown; có cả font upload riêng (Pro). "Font combinations" panel hiển thị các cặp heading/body đã pair sẵn.
- **Font size** — input số hoặc preset; có "Auto size" toggle.
- **Color** — picker với recent colors, document colors, brand colors, photo colors (extract từ ảnh trên trang).
- **Bold / Italic / Underline / Strikethrough**.
- **Alignment** — left/center/right/justify.
- **List** — bullet và numbered list.
- **Hyperlink** — `Ctrl+K`; gán URL cho bất kỳ text/element nào.
- **Letter spacing & line height** — slider trong panel "Spacing".
- **Kerning** — bật trong "Advanced text formatting" (toolbar có icon "T" với mũi tên hai đầu). Default on cho design mới.
- **Ligatures** — bật/tắt trong Advanced text formatting (nếu font hỗ trợ).
- **Uppercase toggle** — chuyển nhanh sang ALL CAPS.
- **Anchor / vertical align trong text box** — top/middle/bottom.
- **Text Effects** (panel "Effects"):
  - **Shadow** — chỉnh offset, direction, blur, transparency, color.
  - **Lift** — đổ bóng nhẹ kiểu floating.
  - **Hollow** — chữ rỗng (chỉ outline), chỉnh độ dày.
  - **Splice** — vừa fill vừa outline lệch nhau; chỉnh thickness, offset, direction, color.
  - **Echo** — clone chữ nhiều lớp lệch màu.
  - **Glitch** — hiệu ứng RGB shift kiểu glitch.
  - **Neon** — phát sáng kiểu đèn neon; slider chỉnh intensity.
  - **Background** — gắn block màu sau chữ; chỉnh roundness, spread, transparency, color.
  - **Glow** — viền sáng (theo blog Design Bundles; không phải mục riêng trong help center mà thường được tạo bằng Shadow hoặc Neon biến thể).
- **Text shape**:
  - **Curve** — uốn chữ theo cung; slider chỉnh độ cong (âm/dương, full circle).
- **Animate** — animate riêng text (xem section 7).

## 3. Image editing

Khi select ảnh, toolbar và panel "Edit photo" cung cấp:

- **Crop** — kéo handle hoặc nhập số; có "Smart crop" tự đề xuất khung.
- **Flip horizontal/vertical**.
- **Filters** — preset filter (Street, Drama, Festive, Summer, Retro, Bloom, Epic…) + slider intensity.
- **Adjust** — brightness, contrast, saturation, tint, blur, X-process, vignette, warmth, fade, highlights, shadows, sharpen, clarity. Một panel toàn slider.
- **Background Remover** — 1-click xóa background; có brush erase/restore để tinh chỉnh edge (Pro feature).
- **Magic Eraser** — brush over vật thể cần xóa, AI fill phần bị xóa. Cũng có "one-click" để chọn object detect sẵn (Pro).
- **Magic Edit** — brush vùng + nhập prompt → AI replace vùng đó (powered by Google Nano Banana model). Free tier có giới hạn.
- **Magic Expand** — mở rộng ảnh ra ngoài khung gốc, AI fill nội dung tiếp diễn.
- **Magic Grab** — tách subject thành object có thể move/resize/edit độc lập (giống Photoshop's Select Subject + lift).
- **Auto Focus** — AI re-focus điểm chính.
- **Duotone** — đổi ảnh sang 2 tông màu chỉ định.
- **Photo background changer** — đổi background sang ảnh khác.
- **Transparency** — slider 0–100%.
- **Position / size** — nhập số trực tiếp (X, Y, W, H, rotation).
- **Shadow** — outline/glow/drop/blur cho ảnh.
- **Border / corner radius** — bo góc, viền màu.

Khi click vào ảnh đang nằm trong frame, "Detach image from frame" để gỡ.

## 4. Layout & positioning

- **Smart Guides** — auto xuất hiện khi drag (align với element khác, center của trang, equal spacing). Snap to guide click vào perfect.
- **Rulers & guides** — bật qua **View → Show rulers and guides**. Drag từ ruler để tạo guide tùy chỉnh; có thể lock guide.
- **Grid** — bật grid view; có thể custom spacing (theo blog Made by Melody).
- **Snap** — Snap to Grid, Snap to Element. Có thể tắt trong settings (theo MagicSlides blog).
- **Position panel** (toolbar → **Position**):
  - Tab **Arrange** — Bring forward / Bring to front / Send backward / Send to back; Align to page (left/center/right/top/middle/bottom); Center horizontally / Center vertically.
  - Tab **Layers** — danh sách tất cả layer trên page; drag để reorder; click eye/lock icon để ẩn/khóa.
  - Tab **Advanced** — input số: X, Y, Width, Height, Rotation. Có toggle "Lock aspect ratio".
- **Align elements** (khi multi-select) — right-click → Align elements → Left/Center/Right/Top/Middle/Bottom.
- **Distribute** — right-click → **Space evenly → Horizontally / Vertically**. "Tidy up" tự normalize gap.
- **Group / Ungroup** — `Ctrl+G` / `Ctrl+Shift+G`. Group có thể group lồng nhau.
- **Lock / Unlock** — `Alt+Shift+L`. Lock element không cho move/edit; có **Lock content** (chỉ lock vị trí, vẫn edit content) — toggle trong context menu.
- **Layers panel** — riêng tab "Layers" trong Position panel, có icon eye (hide), lock, và drag-to-reorder. Mỗi layer hiển thị thumbnail nhỏ.

## 5. Multi-select & grouping

- **Select all on page** — `Ctrl+A`.
- **Multi-select** — `Shift+click` hoặc drag-select (lasso).
- **Tab cycling** — `Tab` để chuyển focus qua các layer (theo MySocialDesigner blog).
- **Group** — `Ctrl+G`; có thể nested group.
- **Multi-element edit** — đổi màu, font, transparency cùng lúc khi multi-select cùng loại.

## 6. Templates

- **Template library** — hàng trăm nghìn template categorize theo loại design (Presentation, Instagram Post, Resume, Flyer…).
- **Swap template** — apply template khác mà giữ nguyên content text/image; auto map field tương ứng (qua **Design → Layouts** tab khi đang edit).
- **Brand Templates** (Pro/Teams) — publish template riêng cho team; ai trong team cũng tạo từ template đó.
- **Style** menu — đổi color palette toàn deck với 1 click (apply brand kit color hoặc palette suggest).

## 7. Animation & transitions

**Page Animations** (animate toàn page):

- Apply qua toolbar → **Animate** (khi không select element nào, áp cho cả page).
- Free animations: **block, typewriter, ascend, bounce, burst, roll, shift, skate, breathe, fade, pan, rise, tumble**.
- Pro animations: **drift, stomp, tectonic, baseline, pop, neon, scrapbook**.
- Có thể chọn loại apply: Enter only, Exit only, hoặc Both.

**Element Animations** (per-element):

- Khi select element → toolbar **Animate** → cùng list animation nhưng áp riêng cho element đó.
- **On-Click Animations** (mới, mid-2025) — control timing: element nào xuất hiện khi nào trong present mode (giống PowerPoint click-trigger).

**Page Transitions** (transition giữa các page):

- Toolbar khi ở page thumbnail → **Transition**.
- Loại: Dissolve, Slide, Circle wipe, Line wipe, Stack, Flow, Color wipe.
- Chỉnh duration và direction.

**Magic Animate** — AI auto chọn animation phù hợp cho cả deck dựa trên style.

## 8. Pages / Slides management

- **Add page** — nút "+" sau page cuối hoặc giữa các page (cả scrolling và grid view).
- **Duplicate page** — toolbar trên page (icon copy) hoặc `Ctrl+D`.
- **Delete page** — `Ctrl+Delete` hoặc trash icon trên page.
- **Reorder** — drag thumbnail trong page manager (toggle qua icon Pages ở thanh dưới).
- **Page views** — scrolling view (vertical scroll qua các page) và grid view (lưới thumbnail).
- **Notes per page** — click "Notes" góc dưới trái editor; mở presenter notes editor riêng.
- **Page numbers** — toggle qua Settings (theo Skywork blog).
- **Background color/image** — riêng cho từng page, set qua color picker khi không select gì.
- **Copy/paste page** — `Ctrl+C` / `Ctrl+V` ở page level.

**Present mode** (`Ctrl+Alt+P`):

- **Standard present** — full screen, click/arrow/space để next.
- **Presenter view** — màn hình riêng cho presenter, có notes + timer + preview slide tiếp theo.
- **Autoplay** — slideshow tự chạy với timing đặt sẵn.
- **Talking Presentation** — record video presentation từ đầu đến cuối, share link.
- **Remote Control** — multiple presenter connect qua link để cùng điều khiển slide từ device khác.
- **Draw on slide khi present** — annotate live (highlight, underline, sketch). Mới 2025.
- **Magic Shortcuts™ trong Present mode** (`Shift+/` để mở menu):
  - `B` — blur slide / unblur (soft focus).
  - `C` — confetti.
  - `D` — drumroll animation + sound.
  - `U` — open/close curtain (kèm tiếng đám đông cheer khi mở).
  - `Q` — quiet/mute mic emoji.
  - `O` — bubble emoji.
  - `M` — mic drop.
  - Số `1–9` — timer (1 = 1 phút, 2 = 2 phút…).
  - `X` — close timer.
  - `ESC` — exit present mode.

## 9. Collaboration

- **Share link permissions** — Can view / Can comment / Can edit; share theo email cụ thể hoặc public link.
- **Real-time co-editing** — multiple cursor, multi-user simultaneously edit (theo Tella blog & Canva for Teams docs).
- **Comments** — pin comment trên element cụ thể; mention `@user`; reply threads; resolve.
- **Assigned tasks** — tag comment thành task cho user.
- **Version history** — list version with timestamp + user; revert. Pro/Teams có history sâu hơn Free.
- **Edit history** — xem ai edit element nào (theo Fmyly blog, có hạn chế ở free tier).
- **Brand templates** — team-only template với lock layout, chỉ cho phép edit field.
- **Approval workflows** — Pro/Teams; reviewer approve trước khi public (theo Canva for Teams docs).

## 10. AI features (Magic Studio)

- **Canva AI / Guided Presentations** — chat prompt → AI tạo full deck (text + chọn ảnh + layout).
- **Magic Design** — gen design từ prompt (presentation, poster, card, flyer, business card, social post, video).
- **Magic Write** — AI writing assistant trong text box: reword, summarize, expand, change tone, brand voice, brainstorm. Inline trong editor.
- **Magic Edit** — replace vùng ảnh bằng AI (xem section 3).
- **Magic Eraser** — xóa object khỏi ảnh, AI fill (xem section 3).
- **Magic Expand** — extend ảnh ngoài crop gốc (xem section 3).
- **Magic Grab** — tách subject thành object editable (xem section 3).
- **Magic Switch** — chuyển design sang dimension khác (Instagram post → Story → Ad) hoặc chuyển sang format khác (slide → blog post / summary / email / poem). Tự dịch sang ngôn ngữ khác.
- **Magic Animate** — AI auto chọn animation phù hợp cho cả deck.
- **Magic Media** — text-to-image, text-to-video, image-to-video (short clip).
- **Magic Morph** — re-style element (theo blog; có vẻ thay đổi style của shape/text bằng prompt).
- **Magic Insights** — AI phân tích data trong sheet/chart, gen insights & key takeaways.
- **Magic Charts** — highlight data trong Canva Sheets → "Magic Charts" → AI chọn loại chart phù hợp (25+ loại).
- **Translate** — dịch toàn deck sang 100+ ngôn ngữ, giữ layout.
- **Presenter notes generator** — AI gen presenter notes từ content slide.
- **Brand Voice** (Pro) — AI write theo tone đã train với brand kit.
- **AI access controls** (IT Staff) — bật/tắt từng AI feature ở mức team.

## 11. Brand Kit

- **Logos** — upload nhiều logo variant; quick insert.
- **Colors** — palette nhiều bộ; auto apply qua "Styles" panel.
- **Fonts** — upload font riêng (TTF, OTF); set heading/body/subheading defaults.
- **Brand Voice** — define tone cho Magic Write.
- **Brand templates** — publish template với element nào lock.
- **Multiple brand kits** — switch giữa nhiều client/brand (Pro/Teams).

## 12. Apps / Integrations (Canva Apps Marketplace)

- **300+ apps** trong Apps Marketplace (sidebar trái → Apps).
- Đáng chú ý:
  - **ChatGPT** — generate design / search content; integration mới làm Canva nằm trong ChatGPT (gen design từ ChatGPT chat).
  - **D-ID** — text-to-AI-avatar-video (theo blog Jotform best apps).
  - **HeyGen, Sketchful, Mockups** — render mockup device.
  - **Bitmoji**.
  - **YouTube, Google Maps, Google Drive, Dropbox, OneDrive, Google Photos** — import asset.
  - **Pixabay, Pexels, Giphy** — stock content.
  - **Emojis**, **QR Code**.
  - **Equation editor** (KaTeX-style; bên thứ ba).
- **Connect APIs / data connectors** — Google Sheets, Salesforce, Google Analytics, HubSpot, World Bank (chart data source).

## 13. Export

Format hỗ trợ qua nút **Share → Download**:

- **PNG** — hỗ trợ transparent background (Pro).
- **JPG** — chỉnh chất lượng (Pro).
- **PDF Standard** — 96 dpi, illustration/text.
- **PDF Print** — 300 dpi, có crop marks & bleed (Pro).
- **SVG** — vector, transparent, infinite scale (Pro).
- **MP4 Video** — animation + audio.
- **GIF** — animation, không audio.
- **PPTX** — Microsoft PowerPoint format; animation & embedded video không support đầy đủ (warning trong UI).
- **Google Slides** — export sang Google Slides.
- **Canva website** — publish thành website tĩnh.

Options bổ sung:

- **Page selection** — All pages / This page / Custom (chọn thumbnail nhiều page).
- **Compress file size** (Pro) — giảm dpi.
- **Flatten PDF** (Pro) — convert text thành vector.
- **Bulk Create** (Pro) — gen nhiều variant từ data spreadsheet.
- **Bulk download** (PDF/JPG/PNG/MP4/GIF) — export riêng từng page thành file riêng.
- **Schedule download / share** — schedule social post (Canva Content Planner).

## 14. Keyboard shortcuts

Reference: `canva.com/help/canva-keyboard-shortcuts`. Quan trọng:

**Editor general**:

- `Ctrl+Z` / `Ctrl+Shift+Z` — undo / redo.
- `Ctrl+S` — save (Canva auto-save; shortcut này force save).
- `Ctrl+C` / `Ctrl+V` / `Ctrl+X` — copy/paste/cut.
- `Ctrl+D` — duplicate element/page.
- `Ctrl+A` — select all.
- `Delete` / `Backspace` — xóa element.
- `Ctrl+/` — mở keyboard shortcut help.
- `Ctrl+E` — edit photo (mở panel).
- `Ctrl+Enter` — add page mới sau page hiện tại.
- `Ctrl+K` — add hyperlink.

**Text**:

- `Ctrl+B` / `Ctrl+I` / `Ctrl+U` — bold / italic / underline.
- `Ctrl+Shift+K` — UPPERCASE toggle.
- `Ctrl+Shift+L` / `E` / `R` / `J` — align left/center/right/justify.
- `Ctrl+Shift+>` / `<` — tăng/giảm font size.
- `Ctrl+T` — focus text tool / add text.
- `Shift+T` — add heading text (theo Fallon Travels).
- `Shift+S` — add subheading.
- `Shift+L` — add line.
- `Shift+R` — add rectangle.
- `Shift+C` — add circle.

**Layer / arrange**:

- `Ctrl+G` / `Ctrl+Shift+G` — group / ungroup.
- `Alt+Shift+L` — lock / unlock.
- `Ctrl+]` / `Ctrl+[` — bring forward / send backward.
- `Ctrl+Alt+]` / `Ctrl+Alt+[` — bring to front / send to back.
- `Arrow keys` — nudge 1px.
- `Shift+Arrow` — nudge larger step.

**View / zoom**:

- `Ctrl++` / `Ctrl+-` — zoom in/out.
- `Ctrl+0` — fit to screen.
- `Ctrl+1` — 100% zoom.
- `Tab` — cycle focus qua layer.
- `R` — bật ruler.

**Pages**:

- `Page Up` / `Page Down` — next/prev page.
- `Ctrl+Enter` — new page.

**Present mode**:

- `Ctrl+Alt+P` — enter present mode.
- `Shift+/` (hoặc `?`) — open Magic Shortcuts menu.
- `B`, `C`, `D`, `U`, `Q`, `O`, `M` — present mode effects (xem section 8).
- `1-9` — timer 1-9 phút.
- `X` — close timer.
- `ESC` — exit present.

## 15. Accessibility

Truy cập qua **File → Accessibility → Check design accessibility**. Sidebar mở ra hiển thị các issue:

- **Color Contrast** — flag text/background contrast thấp (theo WCAG); suggest màu thay thế.
- **Typography** — flag font quá nhỏ, font khó đọc.
- **Alt text** — flag ảnh thiếu alt; có thể nhập manual hoặc click "AI suggest" để generate alt; mark as decorative để skip.
- **Heading order** — kiểm tra hierarchy (H1, H2, H3) đúng thứ tự.
- **Captions** — Canva hỗ trợ closed captions cho video (auto-gen + edit).

Hạn chế: Canva nói rõ "Design Accessibility isn't a compliance tool" — chỉ check basic, vẫn cần manual test.

## 16. Charts, tables, data

- **Chart builder** — sidebar mở chart editor; nhập số trực tiếp vào table grid; hoặc paste từ Excel/CSV.
- **Chart types** — bar (stacked/grouped/proportional), line, pie, donut, scatter, bubble, dot plot, treemap, radar, pictogram, org chart, mindmap, area, waterfall, gantt — 30+ loại.
- **Customize**: color per series, label position, axis range, gridlines, legend position, font, animation.
- **Import data**:
  - Upload **CSV / TSV / XLSX**, up to 1000 rows × 100 columns.
  - Live connectors: **Google Sheets, Salesforce, Google Analytics, HubSpot, World Bank** (data refresh on demand).
- **Canva Sheets** — Canva's spreadsheet product; data link bidirectional, chart update khi data đổi.
- **Magic Charts** — highlight data → "Actions → Magic Charts" → AI propose chart type.
- **Tables** — add/delete row/column; cell color, border, text format; resize per column.

## 17. Workspace organization

- **Home** — recent designs.
- **Projects** — toàn bộ design, folder, brand template, image, video.
- **Folders / subfolders** — tạo, share với team (Pro/Teams).
- **Starred** — đánh dấu favorite; xuất hiện ở sidebar.
- **Trash** — deleted file giữ 30 ngày, restore được.
- **Search** — global search qua tên design, folder, asset.
- **Storage** — 5GB free, 1TB Pro, 1TB/member Teams.
- **Bulk actions** — select multiple design để move/star/rename/delete cùng lúc.
- **Content Planner** — schedule design post lên social media.

---

## Nguồn tham khảo

Canva chính chủ:

- https://www.canva.com/help/canva-keyboard-shortcuts/
- https://www.canva.com/help/text-effects/
- https://www.canva.com/help/presenting-designs/
- https://www.canva.com/help/animate-designs/
- https://www.canva.com/help/page-transitions/
- https://www.canva.com/help/layer-group-align/
- https://www.canva.com/help/manage-pages/
- https://www.canva.com/help/format-text/
- https://www.canva.com/help/charts/
- https://www.canva.com/help/set-up-chart-data/
- https://www.canva.com/help/import-to-charts/
- https://www.canva.com/help/download-file-types/
- https://www.canva.com/help/download-or-purchase/
- https://www.canva.com/help/using-design-accessibility/
- https://www.canva.com/help/canva-accessibility-features/
- https://www.canva.com/help/connect-lines-to-elements/
- https://www.canva.com/help/create-flowcharts-quick-flow/
- https://www.canva.com/help/background-remover/
- https://www.canva.com/help/using-magic-grab/
- https://www.canva.com/help/manage-folder-contents/
- https://www.canva.com/help/kerning-ligatures/
- https://www.canva.com/help/use-magic-design/
- https://www.canva.com/canva-ai/
- https://www.canva.com/magic-design/
- https://www.canva.com/features/background-remover/
- https://www.canva.com/features/magic-eraser/
- https://www.canva.com/features/ai-photo-editing/
- https://www.canva.com/pro/magic-resize/
- https://www.canva.com/design-school/resources/magic-guide-magic-switch
- https://www.canva.com/design-school/resources/harness-power-ai-canva-magic-studio-business-workflows
- https://www.canva.com/newsroom/news/magic-studio/
- https://www.canva.com/newsroom/news/whats-new-february/
- https://www.canva.com/newsroom/news/whats-new-july-2025/
- https://www.canva.com/newsroom/news/new-canva-presentations-features/
- https://www.canva.com/newsroom/news/canva-ai-launches/
- https://www.canva.com/newsroom/news/creative-operating-system/
- https://www.canva.com/presentations/
- https://www.canva.com/apps/
- https://www.canva.com/sheets/
- https://www.canva.com/graphs/

Bên thứ ba (bổ sung chi tiết UI):

- https://designbundles.net/design-school/how-to-use-canva-text-effects
- https://designbundles.net/design-school/how-to-create-a-glow-effect-in-canva
- https://brendacadman.com/how-to-use-magic-shortcuts-in-canva-presentations/
- https://brendacadman.com/how-to-use-canvas-design-elements/
- https://fallontravels.com/blog/canva-keyboard-shortcuts
- https://fallontravels.com/blog/how-to-animate-text-in-canva
- https://www.mysocialdesigner.com/blog/keyboard-shortcuts-for-canva
- https://justclickhere.co.uk/canva-keyboard-shortcuts-presentation/
- https://madebymelody.co/canva-rulers-and-guides/
- https://madebymelody.co/ligatures-and-kerning-in-canva/
- https://skywork.ai/blog/slide/canva-presentation-animation-guide/
- https://skywork.ai/blog/slide/canva-presentation-team-collaboration/
- https://mainframe.pixelhaze.academy/maximizing-canva-pro-with-magic-resize-and-layout-features/
- https://www.laisladesigns.com/2025/08/12/canva-basics-part-1/
- https://www.rishfelddesigns.com/how-to-kern-text-in-canva-a-step-by-step-guide-for-better-typography/
- https://www.magicslides.app/blog/how-to-change-snap-options-on-canva
- https://www.jotform.com/blog/best-canva-apps/

---

## Quan sát quan trọng cho dự án edua-system

Context: editor slide bài giảng vật lý cho giáo viên, canvas 960×540, hiện có element types `text/image/shape/embed/latex`, đã có snap + undo/redo + AI edit slide. Không cần video editor phức tạp, không cần team branding.

**Đáng ưu tiên copy** (impact cao, effort hợp lý):

- **Text effects panel** — ít nhất Shadow + Outline (Hollow) + Background block. Đây là thứ giáo viên dùng để highlight keyword (định nghĩa, công thức). Curve text bỏ qua được.
- **Smart Guides + Position panel với X/Y/W/H/Rotation input số** — giáo viên hay cần align chính xác mấy box công thức. Hiện có snap nhưng panel số chính xác sẽ giảm friction.
- **Align/Distribute multi-select** — right-click menu với 6 align + 2 distribute. Code đơn giản, value lớn cho việc layout slide nhiều element (ví dụ 3 cột so sánh).
- **Layers panel** với eye/lock icon — đã có `locked` trong `SlideElement`, chỉ cần thêm UI hiển thị danh sách layer + toggle visibility. Giúp giáo viên debug khi element bị chồng.
- **Page Animations / Element Animations đơn giản** — chỉ cần 5-6 preset (fade, rise, pan, typewriter cho text, bounce). On-Click animation kiểu PowerPoint click-trigger rất giá trị cho dạy học (giáo viên click → đáp án xuất hiện). Đây là feature có ROI cao nhất.
- **Presenter Notes per slide** — đã có model `RenderedSlide` nhưng chưa thấy notes field. Giáo viên cần script.
- **Present mode với draw-on-slide** — annotate live khi giảng (highlight công thức, vẽ vector). Có thể implement bằng overlay canvas đơn giản trên reveal.js.
- **Magic Shortcuts đơn giản** trong present mode — ít nhất `B` (blur/black screen) và timer số. Rất hữu dụng khi giảng bài.
- **Group/Ungroup** với `Ctrl+G` — kèm align/distribute trở thành combo cần thiết.
- **Hyperlink trên element** (`Ctrl+K`) — link sang slide khác hoặc external (PhET simulation, video YouTube). Đơn giản nhưng giá trị giáo dục cao.

**Có thể copy nếu có budget**:

- **Frames** — đặt ảnh trong placeholder hình tròn / device mockup. Nice-to-have cho aesthetic, không critical.
- **Background Remover** — call vào API tier như remove.bg hoặc Replicate; giáo viên hay cần xóa background ảnh chụp sách giáo khoa.
- **Magic Edit (inpaint)** trên ảnh — call Stable Diffusion API. Giá trị cao nếu tích hợp với pipeline AI sẵn có (Anthropic + OpenAI).
- **Chart builder native** — hiện chưa thấy, nhưng vật lý nhiều bài cần đồ thị (v-t, p-V…). Có thể dùng Chart.js wrap thành SlideElement type mới.
- **Accessibility checker** — alt text auto-gen từ AI (đã có pipeline). Color contrast checker dễ implement.

**Bỏ qua / Out of scope**:

- **Video / Audio editing** — out of scope.
- **Brand Kit / Brand Voice** — không có nhu cầu team branding.
- **Real-time co-editing** — high effort (CRDT/OT), không phải core value.
- **Apps Marketplace** — over-engineering cho single-purpose tool.
- **Bulk Create / Magic Switch resize** — out of scope (slide canvas fix 960×540).
- **Content Planner / social media schedule** — không liên quan.
- **Talking Presentation record** — out of scope, đã có Zoom/Meet.
- **Curve text, Glitch text, Neon text** — không phù hợp tone bài giảng vật lý nghiêm túc.
- **30+ chart types** — chỉ cần 4-5 loại cơ bản (bar, line, pie, scatter).
