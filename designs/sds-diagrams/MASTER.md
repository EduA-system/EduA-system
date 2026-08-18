# SDS Diagram Master — danh sách hình phải vẽ

Nguồn duy nhất cho việc vẽ lại toàn bộ hình của Report 4. Số hiệu UC lấy từ bảng UC ở **mục 1.3** của Report 3 (SRS) sau khi đã đánh số lại và đóng băng — **không** lấy từ heading của Report 4 hiện tại (dãy số cũ, đã lệch).

## Tổng khối lượng

| Loại | Số hình |
|---|---:|
| Class diagram (1 hình / UC) | 112 |
| Sequence diagram (1 hình / UC) | 112 |
| Software Architecture (mục 1.1) | 1 |
| Package diagram — Backend + Frontend (mục 1.2) | 2 |
| Entity Relationship Diagram (mục 1.3) | 1 |
| **Tổng** | **228** |

Đã vẽ: **10** hình — mục 2.1 User Identity (UC-01…04) và UC-49 (bản mẫu). Còn lại: **218**.

Nếu bổ sung *View Other User Profile* (có code, `GET /api/users/{id}/profile` + route `/user-profile/[id]`, nhưng SRS chưa có) thì thành UC-113 → tổng **230** hình.

## Quy ước vẽ

**Class diagram** — chỉ vẽ các class nằm trên đường gọi của chính UC đó (8–13 hộp), không vẽ cả tầng kiến trúc:

| Trong code | Ký pháp |
|---|---|
| `private final X x;` (field, tiêm qua constructor) | association nét liền + bội số `1` (hoặc `0..*` nếu là collection) |
| X chỉ là tham số / kiểu trả về / biến cục bộ | dependency nét đứt, nhãn `uses` / `input` / `output` |
| class implements interface | realization nét đứt + tam giác rỗng, nhãn `implements`; interface để `«interface»` |
| entity ↔ entity theo quan hệ JPA | association hoặc composition, có bội số hai đầu |

Stereotype dùng thống nhất: `«client»` `«controller»` `«service»` `«dto»` `«interface»` `«adapter»` `«entity»`.

**Ngôn ngữ: toàn bộ chữ trong hình phải là tiếng Anh** — tên class, thuộc tính, phương thức, nhãn quan hệ, tên lifeline, nội dung message, guard của `alt`/`opt`, tiêu đề hình. Không để lẫn tiếng Việt kể cả ở bước thao tác của người dùng. Phần tiếng Việt chỉ nằm ở câu mô tả dưới heading trong Word, không nằm trong hình.

| Loại nhãn | Viết thế nào |
|---|---|
| Thao tác người dùng | cụm động từ tiếng Anh: `Enter answer text, attach files and click "Submit"` |
| Phản hồi cho người dùng | `Show ON_TIME / LATE status, attached files and submitted time` |
| Lời gọi hệ thống | tên phương thức thật trong code: `upsert(submission, files)` |
| Guard của `alt` | `[not a class member / class is INACTIVE / resource does not accept submissions]` |
| Nhãn quan hệ trong class diagram | `calls API`, `input`, `output`, `uses`, `implements`, `contains`, `has` |

**Sequence diagram** — 6–8 lifeline:

- Lifeline theo ký pháp object `:TênClass`, mỗi lifeline đúng **một** class có mặt trong class diagram cùng UC
- `DB` là lifeline riêng (hình trụ), message ghi câu SQL thật
- Message là **tên phương thức thật + tham số**; bước của người dùng mô tả bằng cụm động từ tiếng Anh (`Enter answer text, attach files and click "Submit"`)
- Đánh số **phẳng** 1…N, chỉ nhánh trong `alt` mới thụt (7.1, 7.2)
- Có activation bar, return message nét đứt, `alt`/`opt` có guard trong ngoặc vuông
- **Không dùng note** (theo mẫu tham khảo đã được duyệt)

**Bảy quy tắc bắt buộc — rút ra từ lỗi thật khi vẽ mẫu và từ chuẩn UML:**

1. **Chỉ vẽ actor chính của use case.** Người *nhận* thông báo (Teacher, Moderator, Principal…) không đưa vào làm actor — lifeline chỉ nhận một mũi tên rồi hết là cột thừa. Ngoại lệ: hệ thống ngoài trao đổi hai chiều và được SRS ghi là secondary actor, ví dụ `Google Identity Services` ở UC-02.
2. **Không vẽ bước gửi thông báo.** Đây là hành vi dùng chung, không thuộc nhiệm vụ chính của use case; chỉ vẽ đầy đủ tại UC-93 Create Notifications. Áp dụng cho cả 13 UC có gọi `publishNew` trong code (lớp học, weekly task, nộp bài).
3. **Lifeline phải có ít nhất 2 message.** Một nhịp gọi nội bộ thì dùng self-message thay vì thêm cột. Cột chỉ có 1 message để lại khoảng trắng dài, mà khung `alt` luôn kéo hết chiều ngang nên càng lộ.
4. **Không đặt alias trùng từ khoá PlantUML** (`header`, `footer`, `title`, `note`, `end`, `alt`, `else`, `opt`, `ref`, `box`, `legend`, `group`, `return`, `activate`…). PlantUML hiểu dòng đó là lệnh và **nuốt message mà không báo lỗi** — render vẫn thành công, chỉ mất nội dung. Đã dính thật với alias `HEADER` ở UC-01.
5. **Mỗi lifeline phải là object của một class có mặt trong class diagram cùng UC.** Người chấm đối chiếu chéo hai hình; lệch tên là lỗi. Ngoại lệ duy nhất: `DB` và hệ thống ngoài (`Google Identity Services`).
6. **Mỗi message dạng lời gọi phải ứng với một operation khai báo trên class nhận.** Không được ghi `sanitize(textContent)` lên lifeline `:SubmissionService` khi operation đó thuộc `BlogContentSanitizer`. Bước xử lý nội bộ thì viết thành **cụm động từ không có dấu ngoặc** (`sanitize the answer text`, `issue access and refresh tokens`) — vừa đúng, vừa đúng mức design.
7. **Lifeline mang tên interface khi hợp đồng nằm ở interface** (`: StorageClient`, `: GoogleIdentityVerifier`, `: SubmissionRepository`), adapter (`R2StorageAdapter`, `Jpa*Repository`) chỉ xuất hiện ở class diagram với mũi tên realization. Nếu để lifeline là adapter thì message sẽ trỏ vào operation mà class đó không khai báo — vi phạm quy tắc 6.

## Trần độ chi tiết

Tài liệu là **bản thiết kế**, không phải bản chép code. Mẫu tham khảo đã được duyệt có 8 hộp / 6 lifeline / 15 message / 1 fragment. Trần dưới đây là mức đã áp thử trên 5 UC đầu — nới hơn mẫu một chút vì hệ thống có thêm tầng gateway/adapter mà mẫu không có:

| | Trần |
|---|---|
| Class diagram | ≤ **12 hộp** |
| Sequence diagram | ≤ **8 lifeline**, ≈ **15–26 message**, ≤ **2 fragment**, **không lồng fragment** |

UC vượt trần vì bản chất phức tạp (Create Lesson Plan streaming AI) thì **tách hai hình**, không nhồi vào một.

**Không vẽ** những thứ đã tụt xuống mức code:

- wiring nội bộ (`currentUserProvider.requireUserId()`)
- validate của framework (bean validation, `@Valid`)
- chuẩn hoá từng field (`normalizeVietnamPhoneNumber`)
- liệt kê cột trong câu SQL — ghi `UPDATE app_users SET profile fields` là đủ
- DTO/adapter không mang thông tin thiết kế
- private helper (`issueTokens`, `sha256Hex`)

**Vẫn giữ** vì là thông tin thiết kế thật: một dòng SQL ở lifeline `DB` · method + path HTTP · interface ↔ adapter, bội số, composition · mã message của SRS (MSG02/MSG12/MSG13) để truy vết ngược.

## Quy trình và cửa kiểm bắt buộc

```bash
node designs/sds-diagrams/render.mjs uc49              # render PNG (96 DPI mac dinh)
node designs/sds-diagrams/check-consistency.mjs uc49   # kiem lifeline <-> class, message <-> operation
```

**UC nào `check-consistency` còn báo lỗi thì chưa được chèn vào Word.** Với 112 UC và khoảng 2.000 message, đây là thứ duy nhất giữ được quy tắc 5 và 6 — mắt người không rà nổi.

`render.mjs` render hai lượt: lượt đầu ở 96 DPI để đo khổ thật, rồi render lại ở DPI đã tính. **Mặc định giữ 96 DPI** — bản 220 DPI từng thử cho kết quả *xấu hơn* khi xem qua Google Docs vì Docs nén lại ảnh nhiều pixel. Cần bản nét cho in/PDF thì chạy `TARGET_DPI=220 node designs/sds-diagrams/render.mjs`. Vì PlantUML **không ghi chunk `pHYs`** vào PNG, script ghi kèm file `.json` lưu khổ gốc; bước chèn ảnh đọc file đó để đặt kích thước, nếu không Word hiểu nhầm là 96 DPI và phóng ảnh to gấp 2–3 lần.

Bước chèn ảnh khớp theo **tên heading** (`2.<N>.1 Class Diagram`), không theo thứ tự, nên chèn lại nhiều lần hoặc chèn bù một UC đều được. Sau khi chèn, script tự quyết định bố cục: hai hình cùng UC vượt **12,74 inch** (chiều cao vùng in A3 trừ heading và mô tả) thì co tối đa 10%, quá ngưỡng đó mới thêm ngắt trang trước heading `2.<N>.2` — để khoảng trắng là có chủ ý chứ không phải tai nạn.

## Ký pháp UML còn lại

- **Return message ghi giá trị trả về**, không để trống và không ghi chữ `return`: `Optional<AppUser>`, `HTTP 200 + UserDto`.
- Object được tạo giữa luồng thì dùng `«create»` trỏ vào đầu lifeline; bị huỷ thì đánh dấu `X` ở cuối. Chưa UC nào cần, nhưng các UC tạo mới sẽ cần.
- Thời gian chạy từ trên xuống, **không có mũi tên đi ngược lên**.
- **Một hệ đánh số duy nhất cho cả 112 hình**: phẳng `1…N`, chỉ nhánh trong `alt` mới thụt (`7.1`, `7.2`). Không trộn hai kiểu.
- Khung `sd` bao ngoài: PlantUML không vẽ, chấp nhận bỏ vì tiêu đề hình đã ghi rõ `UC-49 Submit Assignment — Sequence Diagram`; mẫu tham khảo cũng không có.

## Truy vết ngược về SRS

- Thứ tự bước trong sequence bám theo **Normal Flow** của use case trong mục 2 của SRS; nhánh `alt` bám theo **Alternative Flow**.
- Có mã message thì ghi vào nhãn (`MSG02`, `MSG12`, `MSG13`) — người chấm đối chiếu được ngay với mục 5.2 System Messages.
- Sequence chỉ vẽ luồng thành công gần như luôn bị trả về, vì Alternative Flow trong SRS không được hiện thực hoá.

## Nhất quán toàn tài liệu

- Đã vẽ lifeline `DB` với câu SQL ở UC này thì UC khác chạm DB cũng phải vẽ — không lúc có lúc không.
- Dùng đúng một bộ stereotype: `«client»` `«controller»` `«service»` `«dto»` `«interface»` `«adapter»` `«entity»`.
- Tên class trong sequence, trong class diagram và trong code phải trùng nhau từng ký tự.
- **Vẽ theo code thật**, không theo trí nhớ: mở controller → service → repository → entity của đúng UC đó rồi mới vẽ. Sai một tên method là hỏng quy tắc 6.

## Kích thước hình

Nội dung quyết định kích thước, **không cắt bớt lifeline hay rút nhãn chỉ để hình hẹp lại**. Script tự co hình vừa bề ngang trang (9,69") nên hình càng rộng thì chữ càng nhỏ khi in — hình nào chữ nhỏ quá thì phóng to trực tiếp trong Word, hoặc xoay ngang riêng trang đó (Layout → Orientation → Landscape cho section).

Tham khảo: bề ngang gốc **≤ 1300 px** thì chữ in ra khoảng 7 pt; 1900 px thì còn ~4,8 pt. Đây là số để cân nhắc, không phải luật.

## Kỷ luật khi ghi vào file trên Drive

- **Đóng Word / tab draw.io trước khi chạy script**, chọn *không lưu*. Autosave của tab đang mở đã từng đè mất toàn bộ thay đổi một lần.
- Luôn **backup ra scratchpad trước mỗi lần ghi đè**; chỉ ghi khi XML đã parse hợp lệ.
- Sau khi chèn ảnh, mở Word và **cập nhật mục lục**: `Ctrl+A` → `F9`.
- Script động vào `document.xml` **không được xoá đoạn văn nằm trong `<w:tbl>`** — mỗi ô bảng bắt buộc có ít nhất một đoạn văn, xoá là hỏng file. Đã suýt xoá nhầm 655 đoạn vì thiếu chốt này; nay script luôn loại trừ vùng bảng, bắt buộc xác định được cả hai biên của mục 2, và dừng nếu định xoá quá 20 đoạn.
- **Chỉ mục UC đã có hình mới được ngắt trang.** 106 mục chưa vẽ mà vẫn ngắt trang thì tạo ra 106 trang gần như trắng. Script tự bật lại ngắt trang cho UC nào vừa được chèn hình.

## Giới hạn của bộ kiểm

`check-consistency.mjs` chỉ kiểm được message có dạng lời gọi (`tenHam(...)`). Message viết bằng lời văn (`sanitize the answer text`) **không bị kiểm** — đó là lý do quy tắc 6 cho phép dùng lời văn cho bước nội bộ, nhưng cũng có nghĩa là **lời văn phải đúng nghiệp vụ**, không ai bắt lỗi hộ.

## Quy ước đặt tên file

```text
designs/sds-diagrams/
  MASTER.md                          file này
  overview/
    architecture.puml / .png         → Report 4 mục 1.1
    package-backend.puml / .png      → mục 1.2.1
    package-frontend.puml / .png     → mục 1.2.2
    erd.puml / .png                  → mục 1.3
  uc<NN>/                            NN = số hiệu UC, 2 chữ số (uc01 … uc112)
    uc<NN>_class.puml                source
    uc<NN>_sequence.puml             source
    uc<NN>-class-diagram.png         hình chèn vào Report 4
    uc<NN>-sequence-diagram.png
```

Render: `java -jar plantuml.jar -charset UTF-8 -tpng uc<NN>_*.puml`

Nếu vẽ bằng draw.io thì mỗi hình là một page trong `sds_sau_16_8.drawio`, tên page đặt trùng tiêu đề mục: `UC-<NN> <Tên use case> - Class Diagram` / `- Sequence Diagram`.

## Vị trí trong Report 4

Mỗi UC chiếm **một mục cấp 3 và hai mục cấp 4**. Số mục lấy thẳng theo số hiệu UC — mục `2.N` ứng với `UC-N`, nên không bao giờ phải dò lại thứ tự:

| Vị trí trong Report 4 | Nội dung | File hình |
|---|---|---|
| `2.<N>` | `UC-<NN> — <Tên use case>` (heading, không có hình) | — |
| `2.<N>.1` | Class Diagram | `uc<NN>/uc<NN>-class-diagram.png` |
| `2.<N>.2` | Sequence Diagram | `uc<NN>/uc<NN>-sequence-diagram.png` |

Ví dụ với UC-49:

```text
2.49    UC-49 — Submit Assignment
2.49.1  Class Diagram      ← uc49/uc49-class-diagram.png
2.49.2  Sequence Diagram   ← uc49/uc49-sequence-diagram.png
```

Hình tổng thể nằm ở mục 1: `1.1` Software Architecture · `1.2.1` Package Diagram Backend · `1.2.2` Package Diagram Frontend · `1.3` Entity Relationship Diagram (đặt ngay trước bảng mô tả 24 bảng dữ liệu).

Vì tên thư mục `uc01 … uc112` sắp xếp tăng dần trùng với thứ tự mục trong tài liệu, khi thay ảnh hàng loạt trong `word/media/` chỉ cần sắp theo tên là khớp đúng vị trí — không phải dò từng hình.

## Việc cần xử lý trước khi vẽ tới

| UC | Vấn đề |
|---|---|
| UC-110 Export School Performance Report | **Code chưa có** — trang `/statistics` không có nút xuất, FE không có thư viện xlsx/csv/print. Phải code bổ sung trước, nếu không sẽ vẽ hình cho chức năng không tồn tại |
| UC-112 Export Subject Performance Report | như trên |
| 5 UC thiếu spec ở mục 2 của SRS | UC-27, UC-95, UC-98, UC-106, UC-112 — cần Normal/Alternative Flow thì mới vẽ được nhánh `alt` |

Năm chức năng sau **có endpoint nhưng giao diện không gọi tới** (code chết) — đã loại khỏi danh sách, không vẽ: Report Hub Content · Customize Physics Simulation · Ban Moderator Account · Ban IT Support Account · Reactivate IT Support Account.

## Danh sách UC

`✔` = đã vẽ xong · `—` = chưa vẽ

### 2.1 User Identity  (4 UC → 8 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-01 | View Landing Page | ✔ | ✔ |  |
| UC-02 | Login | ✔ | ✔ |  |
| UC-03 | Logout | ✔ | ✔ |  |
| UC-04 | Update Profile Information | ✔ | ✔ |  |

### 2.2 Lesson Plan  (3 UC → 6 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-05 | Create Lesson Plan | — | — |  |
| UC-06 | Edit Lesson Plan | — | — |  |
| UC-07 | Export Lesson Plan | — | — |  |

### 2.3 Personal Library  (4 UC → 8 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-08 | View Personal Library | — | — |  |
| UC-09 | View Personal Content Detail | — | — |  |
| UC-10 | Update Content | — | — |  |
| UC-11 | Delete Content | — | — |  |

### 2.4 Presentation  (6 UC → 12 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-12 | Create Slide Outline | — | — |  |
| UC-13 | Edit Slide Outline | — | — |  |
| UC-14 | Create Slide Deck | — | — |  |
| UC-15 | Edit Slide Deck | — | — |  |
| UC-16 | Present Slide | — | — |  |
| UC-17 | Export Slide | — | — |  |

### 2.5 Test  (3 UC → 6 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-18 | Create Test | — | — |  |
| UC-19 | Edit Test | — | — |  |
| UC-20 | Export Test | — | — |  |

### 2.6 Blog  (11 UC → 22 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-21 | View Blog List | — | — |  |
| UC-22 | View Blog Post Detail | — | — |  |
| UC-23 | Create Blog Post | — | — |  |
| UC-24 | Edit Own Blog Post | — | — |  |
| UC-25 | Delete Own Blog Post | — | — |  |
| UC-26 | Comment on Blog Post | — | — |  |
| UC-27 | Reply to Blog Comment | — | — |  |
| UC-28 | Edit Own Blog Comment | — | — |  |
| UC-29 | Delete Own Blog Comment | — | — |  |
| UC-30 | Hide Comment on Own Blog Post | — | — |  |
| UC-96 | View Assigned Subject Blog List | — | — |  |

### 2.7 Class  (20 UC → 40 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-31 | View Class List | — | — |  |
| UC-32 | Create Class | — | — |  |
| UC-33 | Edit Class Information | — | — |  |
| UC-34 | Set Class Status | — | — |  |
| UC-35 | View Class Detail | — | — |  |
| UC-36 | View Class Members | — | — |  |
| UC-37 | View Enrolled Classes List | — | — |  |
| UC-38 | Add Student | — | — |  |
| UC-39 | Remove Student | — | — |  |
| UC-40 | Post Class Resource | — | — |  |
| UC-41 | Update Class Resource | — | — |  |
| UC-42 | Delete Class Resource | — | — |  |
| UC-43 | View Class Resources | — | — |  |
| UC-44 | View Class Resource Detail | — | — |  |
| UC-45 | Download Assigned Material | — | — |  |
| UC-46 | View Submissions List | — | — |  |
| UC-47 | View Submission Detail | — | — |  |
| UC-48 | Download Submission File | — | — |  |
| UC-49 | Submit Assignment | ✔ | ✔ |  |
| UC-50 | Unsubmit Assignment | — | — |  |

### 2.8 Physics Hub  (4 UC → 8 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-51 | View Physics Simulation Library | — | — |  |
| UC-52 | View Physics Simulation Detail | — | — |  |
| UC-53 | View Physics Simulation Analysis | — | — |  |
| UC-54 | Save Physics Simulation to Personal Library | — | — |  |

### 2.9 Chemistry Lab  (6 UC → 12 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-55 | Save Molecule Model to Personal Library | — | — |  |
| UC-56 | View Periodic Table | — | — |  |
| UC-57 | View Electron Model | — | — |  |
| UC-58 | View Element Detail | — | — |  |
| UC-59 | View Molecule Structure | — | — |  |
| UC-60 | Generate Molecule Structure | — | — |  |

### 2.10 Community Hub  (13 UC → 26 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-61 | View Community Hub | — | — |  |
| UC-62 | View Public Content Detail | — | — |  |
| UC-63 | Customize Public Content | — | — |  |
| UC-64 | View Own Content Detail | — | — |  |
| UC-65 | Delete Own Public Content | — | — |  |
| UC-66 | Publish Hub Content | — | — |  |
| UC-67 | Unpublish Hub Content | — | — |  |
| UC-68 | View Content Comments | — | — |  |
| UC-69 | Create Content Comment | — | — |  |
| UC-70 | Update Content Comment | — | — |  |
| UC-71 | Delete Content Comment | — | — |  |
| UC-72 | Hide Comment on Own Content | — | — |  |
| UC-111 | Edit Own Public Content | — | — |  |

### 2.11 Hub Moderation  (10 UC → 20 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-73 | View Content List | — | — |  |
| UC-74 | View Content Detail | — | — |  |
| UC-75 | Approve Content | — | — |  |
| UC-76 | Reject Content | — | — |  |
| UC-77 | View Teacher List | — | — |  |
| UC-78 | View Teacher Detail | — | — |  |
| UC-79 | Add Teacher | — | — |  |
| UC-80 | Update Teacher Account | — | — |  |
| UC-81 | Reactivate Teacher Account | — | — |  |
| UC-82 | Deactivate Teacher Account | — | — |  |

### 2.12 Weekly Task  (6 UC → 12 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-83 | View Weekly Schedule | — | — |  |
| UC-84 | Assign Weekly Task | — | — |  |
| UC-85 | Edit Weekly Task | — | — |  |
| UC-86 | View Assigned Task | — | — |  |
| UC-87 | Submit Lesson Plan for Weekly Task | — | — |  |
| UC-88 | Unsubmit Lesson Plan for Weekly Task | — | — |  |

### 2.13 Weekly Task Review  (4 UC → 8 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-89 | View Lesson Plan Approval List | — | — |  |
| UC-90 | View Lesson Plan Detail | — | — |  |
| UC-91 | Approve Lesson Plan | — | — |  |
| UC-92 | Reject Lesson Plan | — | — |  |

### 2.14 Notifications and Blog Moderation  (4 UC → 8 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-93 | Create Notifications | — | — |  |
| UC-94 | View Notifications | — | — |  |
| UC-95 | Manage Notification Read State | — | — |  |
| UC-97 | Remove Blog Post | — | — |  |

### 2.15 Administration  (3 UC → 6 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-99 | View & Filter Activity Log | — | — |  |
| UC-100 | View System Prompts | — | — |  |
| UC-101 | Update System Prompts | — | — |  |

### 2.16 Staff Management  (7 UC → 14 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-102 | View Staff List | — | — |  |
| UC-103 | View Staff Detail | — | — |  |
| UC-104 | Add Moderator Account | — | — |  |
| UC-105 | Replace Moderator Account | — | — |  |
| UC-106 | Reactivate Moderator Account | — | — |  |
| UC-107 | Add IT Support Account | — | — |  |
| UC-108 | Replace IT Support Account | — | — |  |

### 2.17 Reports  (4 UC → 8 hình)

| Mã | Use case | Class | Sequence | Ghi chú |
|---|---|:---:|:---:|---|
| UC-98 | View Subject Statistics Dashboard | — | — |  |
| UC-109 | View School-wide Statistics Dashboard | — | — |  |
| UC-110 | Export School Performance Report | — | — | code chưa có |
| UC-112 | Export Subject Performance Report | — | — | code chưa có |

## Hình tổng thể

| Mục | Hình | Trạng thái | Ghi chú |
|---|---|:---:|---|
| 1.1 | Software Architecture | — | Hội đồng đánh giá bản hiện tại **chưa đúng**: là tranh ghép logo, ô OpenAI/DeepSeek bị dán nhãn *Authentication Services*, mũi tên PostgreSQL ngược chiều, thiếu kênh WebSocket/STOMP, backend không thể hiện phân tầng |
| 1.2.1 | Package Diagram — Backend | — | Theo `be/src/main/java/com/edua/beeduasystem/` |
| 1.2.2 | Package Diagram — Frontend | — | Theo `fe/app/`, `fe/lib/`, `fe/components/` |
| 1.3 | Entity Relationship Diagram | — | 24 bảng, đã đối chiếu khớp `db/migration` V1–V50 |
