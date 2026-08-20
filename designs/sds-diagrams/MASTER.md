# SDS Diagram Master — danh sách hình phải vẽ

Nguồn duy nhất cho việc vẽ lại toàn bộ hình của Report 4. Số hiệu UC lấy từ bảng UC ở **mục 1.3** của Report 3 (SRS) sau khi đã đánh số lại và đóng băng — **không** lấy từ heading của Report 4 hiện tại (dãy số cũ, đã lệch).

> **Bản v2 — đổi cấu trúc mục 2.** Trước đây mỗi UC là một mục và có riêng một class diagram (112 class + 112 sequence). Nay **mục 2 chia theo feature**: mỗi feature một class diagram dùng chung cho mọi UC trong feature, sequence vẫn một hình một UC. Danh sách feature ↔ UC nằm ở `features.json` — file đó là nguồn máy đọc được, bảng trong tài liệu này chỉ để người đọc.

## Cấu trúc mục 2 của Report 4

```text
2. Detailed Design
  2.x          <Feature>                       mục cấp 3, không có hình
  2.x.1        Class Diagram                   1 hình / feature
  2.x.2        Sequence Diagram                mục chung, không có hình
  2.x.2.y      UC-<NN> <Tên use case>          1 hình / UC
```

Ví dụ feature 10 (Weekly Task):

```text
2.10       Weekly Task
2.10.1     Class Diagram                       ← feat10/feat10-class-diagram.png
2.10.2     Sequence Diagram
2.10.2.1   UC-83 View Weekly Schedule          ← feat10/uc83-sequence-diagram.png
2.10.2.2   UC-84 Assign Weekly Task            ← feat10/uc84-sequence-diagram.png
...
```

Thứ tự `2.x.2.y` bám theo thứ tự UC khai trong `features.json`, không phải theo số UC tăng dần (feature Blog có UC-96, UC-97 nằm cuối).

## Tổng khối lượng

| Loại | Số hình |
|---|---:|
| Class diagram (1 hình / feature) | 21 |
| Sequence diagram (1 hình / UC) | 107 |
| Software Architecture (mục 1.1) | 1 |
| Package diagram — Backend + Frontend (mục 1.2) | 2 |
| Entity Relationship Diagram (mục 1.3) | 1 |
| **Tổng** | **132** |

Bản v1 là 228 hình. 107 sequence đã vẽ xong dùng lại nguyên; **21 class diagram** (đã vẽ xong) bằng cách gộp từ 107 class diagram cũ (nguyên liệu còn nguyên trong `uc<NN>/uc<NN>_class.puml`), cộng **4 hình tổng thể** chưa vẽ.

## Danh sách feature

21 feature. Thứ tự mục 2 xếp theo **chức năng dạy học chính trước, nền tảng sau**: tạo nội dung (kế hoạch bài dạy → slide → đề kiểm tra → mô phỏng) → chia sẻ nội dung (thư viện → Community Hub → blog) → lớp học (lớp → weekly task → thông báo) → nền tảng (đăng nhập → tài khoản → quản trị → báo cáo).

Cột `Hộp` là số hộp thật trong hình đã vẽ; `Chữ in` là cỡ chữ khi ảnh được ép vừa vùng in — hình nào cột *ngang* mới đạt ≥6 pt thì trang đó phải xoay ngang.

| Mục | Feature | UC | Số UC | Hộp | Ảnh (px) | Chữ in dọc / ngang (pt) |
|---|---|---|---:|---:|---:|---:|
| 2.1 | Lesson Plan Management | 5, 6, 7 | 3 | 16 | 2206×1275 | 5.1 / 6.7 |
| 2.2 | Slide Outline | 12, 13 | 2 | 13 | 2092×1079 | 5.3 / 7.0 |
| 2.3 | Slide Deck Generation | 14 | 1 | 7 | 1016×986 | 11.0 / 11.3 |
| 2.4 | Slide Editing and Presentation | 15, 16, 17 | 3 | 13 | 2209×987 | 5.1 / 6.6 |
| 2.5 | Practice Exam Management | 18, 19, 20 | 3 | 15 | 1611×1490 | 6.9 / 7.5 |
| 2.6 | Physics Simulation Library | 51, 52, 53, 54 | 4 | 17 | 2258×1219 | 4.9 / 6.5 |
| 2.7 | Periodic Table | 56, 57, 58 | 3 | 12 | 1211×1126 | 9.2 / 9.9 |
| 2.8 | Molecule Modeling | 55, 59, 60 | 3 | 15 | 1647×1377 | 6.8 / 8.1 |
| 2.9 | Personal Library Management | 8, 9, 10, 11, 66, 67, 111 | 7 | 7 | 886×1192 | 12.3 / 9.4 |
| 2.10 | Community Hub | 61, 62, 63, 64, 65, 68, 69, 70, 71, 72 | 10 | 15 | 1885×1423 | 5.9 / 7.8 |
| 2.11 | Community Blog | 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 96, 97 | 12 | 17 | 1702×1535 | 6.6 / 7.3 |
| 2.12 | Classroom Management | 31, 32, 33, 34, 35, 36, 37, 38, 39 | 9 | 19 | 1981×1321 | 5.6 / 7.4 |
| 2.13 | Class Resources | 40, 41, 42, 43, 44, 45 | 6 | 20 | 2318×1442 | 4.8 / 6.3 |
| 2.14 | Assignment Submissions | 46, 47, 48, 49, 50 | 5 | 15 | 1607×1388 | 6.9 / 8.0 |
| 2.15 | Weekly Task Management | 83, 84, 85, 86, 87, 88, 89, 90, 91, 92 | 10 | 15 | 1409×1527 | 7.9 / 7.3 |
| 2.16 | Notification Management | 93, 94, 95 | 3 | 11 | 1303×1191 | 8.6 / 9.4 |
| 2.17 | Authentication and Profile Management | 2, 3, 4 | 3 | 16 | 1457×912 | 7.7 / 10.1 |
| 2.18 | Teacher Account Management | 77, 78, 79, 80, 81, 82 | 6 | 15 | 1928×1285 | 5.8 / 7.6 |
| 2.19 | Staff Account Management | 102, 103, 104, 105, 106, 107, 108 | 7 | 14 | 1680×1516 | 6.6 / 7.4 |
| 2.20 | System Administration | 99, 100, 101 | 3 | 17 | 1791×1238 | 6.2 / 8.2 |
| 2.21 | Statistics and Reporting | 98, 109, 110, 112 | 4 | 17 | 1755×1350 | 6.4 / 8.3 |
| | **Tổng** | | **107** | | | **21/21 đã vẽ** |

Trung bình ~14 hộp/hình. **Trần thật không phải số hộp mà là bề ngang ảnh**: PlantUML xếp hộp theo hàng ngang nên 17 hộp đã cho ra ảnh 2100 px, in ra chữ 4,6 pt. Ngưỡng làm việc: **bề ngang gốc ≤ 1500 px** (≈ 6,5–7 pt khi in). Vượt thì **tách thành nhiều hình con** `2.x.1 (a)(b)(c)`, đừng cố ép layout — thử `-[hidden]-` để dồn hộp xuống hàng dưới chỉ làm hình cao thêm mà không hẹp lại.

Ba feature bị **tách nhỏ vì hình không đọc nổi**, không phải vì nghiệp vụ: Class 20 UC (34 class → 3956 px, chữ 2,8 pt) tách thành `2.11 Classroom Management` + `2.12 Class Resources` + `2.13 Assignment Submissions`; Slide 6 UC (31 class) tách thành `2.2 Slide Outline` + `2.3 Slide Deck Generation` + `2.4 Slide Editing and Presentation`; Chemistry Lab tách thành `2.7 Periodic Table` + `2.8 Molecule Modeling`; Account Management tách thành `2.18 Teacher Account Management` + `2.19 Staff Account Management`. Sau khi tách, **mọi feature đúng một class diagram**, không hình nào phải chia (a)(b).

Hai hình FE-nặng: `2.4 Physics Simulation` (lõi backend chỉ 5 hộp) và `2.5 Chemistry Lab` (9 hộp) — giữ 3 hộp `«user interaction»` thay vì 1–2, nếu không hình gần như trống.

Ranh giới feature chia theo **controller/service thật trong code**, không theo tên màn hình:

- `2.6 Library Content` ôm cả vòng đời một content (`PRIVATE → SUBMITTED → APPROVED/REJECTED`) vì UC-66, UC-67, UC-111 đi qua `LibraryContentController` chứ không phải `HubContentController`.
- `2.7 Community Hub` chỉ còn phần đọc content đã APPROVED và bình luận (`HubContentController`, `HubContentService`, `HubCommentService`).
- `2.13 Account Management` gộp quản lý Teacher (`ModeratorController`) và quản lý Moderator/IT Staff (`PrincipalController`) vì cùng chuỗi `AppUserRepository` + `UserRoleRepository` + `AppUser`.

### Tạm để ngoài

| UC | Lý do |
|---|---|
| UC-01 View Landing Page | Bỏ khỏi mục 2. Nếu chốt bỏ hẳn thì phải xoá khỏi bảng UC mục 1.3 của SRS, nếu không hai tài liệu lệch nhau |
| UC-73 → UC-76 Hub Moderation | Tạm hoãn. Khi làm tiếp thì **nhập vào 2.6 Library Content** (gộp = 22 hộp, chung 6 class) chứ không nhập vào Community Hub (gộp = 40 hộp, **chung 0 class**) — code đi qua `LibraryContentController` (`/api/library/contents/moderation-queue`, `/{id}/approval`, `/{id}/rejection`) |

Nếu bổ sung *View Other User Profile* (có code, `GET /api/users/{id}/profile` + route `/user-profile/[id]`, nhưng SRS chưa có) thì thành UC-113, xếp vào `2.1 Authentication & Profile`.

## Quy ước vẽ

**Class diagram — một hình cho cả feature.** Vẽ trọn đường gọi của **mọi** UC trong feature, không vẽ cả tầng kiến trúc:

| Trong code | Ký pháp |
|---|---|
| `private final X x;` (field, tiêm qua constructor) | association nét liền + bội số `1` (hoặc `0..*` nếu là collection) |
| X chỉ là tham số / kiểu trả về / biến cục bộ | **không vẽ** — §2.7 của sách chỉ dùng dependency cho package |
| class implements interface | realization nét đứt + tam giác rỗng, **không cần nhãn**; hộp interface để `«interface»`, **ngăn giữa bỏ trống** (§12.5) |
| entity ↔ entity theo quan hệ JPA | association hoặc composition (thoi đặc chạm lớp "whole"), bội số hai đầu |
| ràng buộc nghiệp vụ | `{...}` cạnh thuộc tính hoặc cạnh bội số (§7.4): `readAt : Date {readAt >= createdAt}`, `0..* {ordered by createdAt desc}` |

**Stereotype dùng đúng từ vựng của Gomaa** (đã đối chiếu 1.472 lần xuất hiện trong sách; `«controller»` `«dto»` `«adapter»` **không tồn tại** trong sách nên đã bỏ). Ánh xạ theo §15.5.2 — service subsystem xếp tầng coordinator → business logic → database wrapper → entity:

| Trong code | Stereotype |
|---|---|
| page/component Next.js | `«user interaction»` |
| REST controller (façade nhận request) | `«coordinator»` |
| service (nghiệp vụ) | `«business logic»` |
| interface trong `repository/` | `«interface»` |
| `Jpa*Repository` | `«database wrapper»` |
| adapter tới hệ ngoài (R2, STOMP, AI) | `«proxy»` |
| domain model / JPA entity | `«entity»` |

**Kiểu dữ liệu viết theo sách** (§2.11): `String` `Integer` `Real` `Boolean` `Date` — `UUID` → `String`, `Instant` → `Date`, `Long` → `Integer`, enum → `String`, `Pageable` → `page : Integer, size : Integer`. **Tên interface giữ nguyên như code**, không thêm tiền tố `I` (cố ý lệch sách để trùng repo). Hộp `«database wrapper»` giữ field JPA, operation nằm ở hộp `«interface»` mà nó hiện thực.

Bốn dòng `skinparam` bắt buộc, thiếu là sai ký pháp:

```text
skinparam classAttributeIconSize 0   → hiện dấu + / - thay vì icon màu (§2.4.4)
hide circle                          → bỏ icon chữ C của PlantUML
{field} + -- trong hộp «interface»    → chừa ngăn giữa trống (§12.5)
"1" -- "0..*" X : Verb phrase >       → association tron + tam giác đen chỉ chiều đọc tên
```

### Cắt thế nào để không mất ý nghĩa thiết kế

Đo trên feature Classroom (34 hộp) cho ra ba kết luận, áp cho mọi hình:

1. **Bề ngang do số hộp quyết định, không phải độ dài chữ.** Cắt hết nội dung bên trong 34 hộp chỉ giảm 3956 → 3802 px (chiều cao thì giảm mạnh, 2251 → 1806).
2. **Không bao giờ bỏ cả một vai trò kiến trúc.** Bỏ 4 `«database wrapper»` chỉ được 3956 → 3528 px nhưng mất toàn bộ mũi tên realization — lỗ vốn. Tương tự với hộp giao diện (3956 → 3600 px).
3. **Cắt nội dung trong hộp, rồi mới tách hình.** Thứ tự:

| Cắt | Vì sao không mất ý nghĩa |
|---|---|
| operation của `«coordinator»` bỏ tham số (`+ create() : ClassDetail`) | thiết kế là *có endpoint nào*, chữ ký đầy đủ là mức code — đã có ở sequence |
| `«entity»` giữ tối đa 5 thuộc tính định danh/nghiệp vụ | phần còn lại đã có đủ trong bảng CSDL mục 1.3 |
| `«database wrapper»` chỉ giữ field trỏ tới Spring Data repository | operation nằm ở hộp `«interface»` mà nó hiện thực |
| DTO bỏ hẳn | không có trong bộ stereotype của sách |

Còn vượt thì **tách hình con theo luồng nghiệp vụ, mỗi hình giữ trọn chuỗi** `«user interaction»` → `«coordinator»` → `«business logic»` → `«interface»` → `«database wrapper»` → `«entity»`. Tách kiểu này không mất gì, chỉ phân bổ lại. **Không** tách theo tầng (một hình toàn service, một hình toàn entity) — kiểu đó mới là mất ý nghĩa.

Ngưỡng thực tế đo được: **≤ 12 hộp** in khổ dọc (~8 pt) · **13–20 hộp** phải xoay ngang trang (~6,5 pt) · **> 20 hộp** thì tách.

Vì gộp nhiều UC nên **cắt bớt theo thứ tự ưu tiên** cho tới khi vừa trần:

1. **Bỏ hết DTO** request/response — sách không có khái niệm này; nếu bắt buộc phải nêu thì để ở chữ ký operation, không thành hộp.
2. Gộp các `«user interaction»` cùng màn hình thành một hộp (`ClassDetailPage` thay cho 5 component con).
3. Bỏ enum trạng thái nếu đã ghi trong thuộc tính entity.
4. Gộp cặp domain model + JPA entity cùng khái niệm thành **một** hộp `«entity»` (`Classroom`/`ClassEntity` → một hộp) — sách: entity class ánh xạ xuống bảng quan hệ **qua database wrapper**, không vẽ hai class.
5. Giữ nguyên: coordinator, business logic, interface, database wrapper, proxy, entity. Đây là phần mang thông tin thiết kế.

Ngoại lệ: `2.4 Physics Simulation` và `2.5 Chemistry Lab` gần như không có backend (lõi chỉ 5 và 9 hộp) — hai hình này **được giữ `«client»`**, nếu không hình sẽ trống. Ghi rõ ngoại lệ đó trong chú thích hình.

**Ngôn ngữ: toàn bộ chữ trong hình phải là tiếng Anh** — tên class, thuộc tính, phương thức, nhãn quan hệ, tên lifeline, nội dung message, guard của `alt`/`opt`, tiêu đề hình. Không để lẫn tiếng Việt kể cả ở bước thao tác của người dùng. Phần tiếng Việt chỉ nằm ở câu mô tả dưới heading trong Word, không nằm trong hình.

| Loại nhãn | Viết thế nào |
|---|---|
| Thao tác người dùng | cụm động từ tiếng Anh: `Enter answer text, attach files and click "Submit"` |
| Phản hồi cho người dùng | `Show ON_TIME / LATE status, attached files and submitted time` |
| Lời gọi hệ thống | tên phương thức thật trong code: `upsert(submission, files)` |
| Guard của `alt` | `[not a class member / class is INACTIVE / resource does not accept submissions]` |
| Nhãn quan hệ trong class diagram | **cụm động từ** đọc được thành câu: `Sends requests to`, `Delegates to`, `Stores notifications through`, `Maps`, `Is delivered to` (§7.1) |

**Sequence diagram — một hình một UC**, 6–8 lifeline:

- Lifeline theo ký pháp object `:TênClass`, mỗi lifeline đúng **một** class có mặt trong class diagram của **feature chứa UC đó**
- `DB` là lifeline riêng (hình trụ), message ghi câu SQL thật
- Message là **tên phương thức thật + tham số**; bước của người dùng mô tả bằng cụm động từ tiếng Anh
- Đánh số **phẳng** 1…N, chỉ nhánh trong `alt` mới thụt (7.1, 7.2)
- Có activation bar, return message nét đứt, `alt`/`opt` có guard trong ngoặc vuông
- **Không dùng note** (theo mẫu tham khảo đã được duyệt)

**Bảy quy tắc bắt buộc — rút ra từ lỗi thật khi vẽ và từ chuẩn UML:**

1. **Chỉ vẽ actor chính của use case.** Người *nhận* thông báo (Teacher, Moderator, Principal…) không đưa vào làm actor — lifeline chỉ nhận một mũi tên rồi hết là cột thừa. Ngoại lệ: hệ thống ngoài trao đổi hai chiều và được SRS ghi là secondary actor, ví dụ `Google Identity Services` ở UC-02.
2. **Không vẽ bước gửi thông báo.** Đây là hành vi dùng chung, không thuộc nhiệm vụ chính của use case; chỉ vẽ đầy đủ tại UC-93 Create Notifications. Áp dụng cho cả 13 UC có gọi `publishNew` trong code (lớp học, weekly task, nộp bài).
3. **Lifeline phải có ít nhất 2 message.** Một nhịp gọi nội bộ thì dùng self-message thay vì thêm cột.
4. **Không đặt alias trùng từ khoá PlantUML** (`header`, `footer`, `title`, `note`, `end`, `alt`, `else`, `opt`, `ref`, `box`, `legend`, `group`, `return`, `activate`…). PlantUML hiểu dòng đó là lệnh và **nuốt message mà không báo lỗi** — render vẫn thành công, chỉ mất nội dung. Đã dính thật với alias `HEADER` ở UC-01.
5. **Mỗi lifeline phải là object của một class có mặt trong class diagram của feature.** Người chấm đối chiếu chéo hai hình; lệch tên là lỗi. Ngoại lệ duy nhất: `DB` và hệ thống ngoài (`Google Identity Services`). *Đây là quy tắc chịu ảnh hưởng nặng nhất khi gộp: class diagram bị cắt DTO/client thì sequence cũng không được để lifeline là DTO/client đã cắt.*
6. **Mỗi message dạng lời gọi phải ứng với một operation khai báo trên class nhận.** Không được ghi `sanitize(textContent)` lên lifeline `:SubmissionService` khi operation đó thuộc `BlogContentSanitizer`. Bước xử lý nội bộ thì viết thành **cụm động từ không có dấu ngoặc** (`sanitize the answer text`, `issue access and refresh tokens`).
7. **Lifeline mang tên interface khi hợp đồng nằm ở interface** (`: StorageClient`, `: GoogleIdentityVerifier`, `: SubmissionRepository`), adapter (`R2StorageAdapter`, `Jpa*Repository`) chỉ xuất hiện ở class diagram với mũi tên realization.

## Trần độ chi tiết

Tài liệu là **bản thiết kế**, không phải bản chép code.

| | Trần |
|---|---|
| Class diagram (1 / feature) | ≤ **30 hộp**; > 20 hộp thì để trang **landscape** |
| Sequence diagram (1 / UC) | ≤ **8 lifeline**, ≈ **15–26 message**, ≤ **2 fragment**, **không lồng fragment** |

`2.9 Class` (26 hộp, gộp 4 service) và `2.2 Slide` (21 component FE phải gộp còn 3) là hai hình nặng nhất — bắt buộc landscape, và nếu vẫn quá thì tách class diagram thành **hai hình con** `2.9.1a` và `2.9.1b` (ví dụ: quản lý lớp + thành viên / tài nguyên + nộp bài), không nhồi vào một hình.

**Không vẽ** những thứ đã tụt xuống mức code:

- wiring nội bộ (`currentUserProvider.requireUserId()`)
- validate của framework (bean validation, `@Valid`)
- chuẩn hoá từng field (`normalizeVietnamPhoneNumber`)
- liệt kê cột trong câu SQL — ghi `UPDATE app_users SET profile fields` là đủ
- DTO/adapter không mang thông tin thiết kế
- private helper (`issueTokens`, `sha256Hex`)

**Vẫn giữ** vì là thông tin thiết kế thật: một dòng SQL ở lifeline `DB` · method + path HTTP · interface ↔ adapter, bội số, composition · mã message của SRS (MSG02/MSG12/MSG13) để truy vết ngược.

## Quy ước đặt tên file

```text
designs/sds-diagrams/
  MASTER.md                          file này
  features.json                      nguồn máy đọc: feature ↔ danh sách UC
  render.mjs  check-consistency.mjs  migrate-layout.mjs
  gen-feature-class.mjs              sinh class diagram của feature từ 107 hình UC cũ
  word-rebuild-section2.ps1          dựng lại khung mục 2 trong Report 4 (.docx)
  word-insert-class-diagrams.ps1     chèn ảnh class diagram vào mục 2.<n>.1
  word-fix-toc-levels.ps1            cho Heading5 vào mục lục ở cấp 4
  overview/
    architecture.puml / .png         → Report 4 mục 1.1
    package-backend.puml / .png      → mục 1.2.1
    package-frontend.puml / .png     → mục 1.2.2
    erd.puml / .png                  → mục 1.3
  feat<NN>/                          NN = số thứ tự feature, 2 chữ số (feat01 … feat15)
    feat<NN>_class.puml              source class diagram của cả feature
    feat<NN>-class-diagram.png       → mục 2.<N>.1
    uc<MM>_sequence.puml             source sequence của từng UC
    uc<MM>-sequence-diagram.png      → mục 2.<N>.2.<y>
  uc<MM>/                            THƯ MỤC CŨ — chỉ còn giữ uc<MM>_class.puml làm
                                     nguyên liệu gộp; xoá sau khi 15 class diagram xong
```

Render: `java -jar plantuml.jar -charset UTF-8 -tpng feat<NN>/*.puml`

Vì tên thư mục `feat01 … feat15` sắp xếp tăng dần trùng thứ tự mục trong tài liệu, và trong mỗi feature các file `uc<MM>_sequence` sắp theo thứ tự đã khai trong `features.json`, khi thay ảnh hàng loạt trong `word/media/` chỉ cần sắp theo tên là khớp đúng vị trí.

## Ba bản của mỗi hình sequence

Mỗi UC có ba file `.puml`, cùng một luồng, chỉ khác cách vẽ lifeline. Hai bản sau **sinh ra từ bản đầu**, không sửa tay:

| File | Lifeline | Sinh bởi |
|---|---|---|
| `uc<MM>_sequence.puml` | `participant` — hộp chữ nhật trơn | viết tay (bản gốc) |
| `uc<MM>_sequence_icon.puml` | `boundary` / `control` / `entity` — ký hiệu Jacobson | `make-icon-variants.mjs` |
| `uc<MM>_sequence_stereo.puml` | hộp chữ nhật + `«stereotype»` | `make-stereo-variants.mjs` |

Vai trò của cả hai bản sinh đều đọc từ `feat<NN>_class.puml`, nên luôn khớp class diagram. Khác nhau: bản `icon` gom 9 stereotype về 3 hình, bản `stereo` giữ nguyên cả 9 nhãn nên sequence khớp 1-1 với class diagram cùng mục 2.x.

**Report 4 hiện dùng bản `stereo`** (thay cho bản `icon`, 19/08/2026). Bản `stereo` đã bỏ dòng `title` — tên hình lấy từ heading `2.x.2.y` của tài liệu, nên ảnh chèn vào Word **không cần crop** (`srcRect t="0"`).

Cú pháp PlantUML: stereotype phải đứng **sau** alias — `participant ":X" as Y <<business logic>>`. Đặt trước alias là lỗi cú pháp.

Render riêng một bản: `ONLY=sequence_stereo node render.mjs`.

## Quy trình và cửa kiểm bắt buộc

```bash
node designs/sds-diagrams/migrate-layout.mjs            # xem truoc viec di chuyen file (dry-run)
node designs/sds-diagrams/migrate-layout.mjs --apply    # thuc su di chuyen sang feat<NN>/
node designs/sds-diagrams/render.mjs feat11             # render PNG (96 DPI mac dinh)
node designs/sds-diagrams/check-consistency.mjs feat11  # kiem lifeline <-> class, message <-> operation
```

`check-consistency.mjs` nay đọc `features.json`: với mỗi feature nó nạp **một** class diagram rồi đối chiếu **tất cả** sequence của feature đó với nó. Nhận tham số là `feat11` hoặc `uc94` (tự tìm feature chứa UC đó). Thư mục `uc<NN>/` kiểu cũ vẫn kiểm được để không mất chốt trong lúc chuyển đổi.

**Feature nào `check-consistency` còn báo lỗi thì chưa được chèn vào Word.** Với ~2.000 message, đây là thứ duy nhất giữ được quy tắc 5 và 6 — mắt người không rà nổi.

`render.mjs` render hai lượt: lượt đầu ở 96 DPI để đo khổ thật, rồi render lại ở DPI đã tính. **Mặc định giữ 96 DPI** — bản 220 DPI từng thử cho kết quả *xấu hơn* khi xem qua Google Docs vì Docs nén lại ảnh nhiều pixel. Cần bản nét cho in/PDF thì chạy `TARGET_DPI=220 node designs/sds-diagrams/render.mjs`. Vì PlantUML **không ghi chunk `pHYs`** vào PNG, script ghi kèm file `.json` lưu khổ gốc; bước chèn ảnh đọc file đó để đặt kích thước, nếu không Word hiểu nhầm là 96 DPI và phóng ảnh to gấp 2–3 lần.

Bước chèn ảnh khớp theo **tên heading** (`2.<N>.1 Class Diagram`, `2.<N>.2.<y> UC-<NN> …`), không theo thứ tự, nên chèn lại nhiều lần hoặc chèn bù một feature đều được.

## Trạng thái file Word (19/08/2026)

Mục 2 của `Report4_Software_Design_Specification_v1.3.docx` **đã được dựng lại theo cấu trúc feature, chưa chèn hình**:

- Xoá 675 đoạn cũ (112 mục UC + 248 ảnh class/sequence), không đụng bảng nào — mục 1 và mục 3 giữ nguyên.
- Chèn 259 đoạn: 15 `Heading3` (2.x), 30 `Heading4` (2.x.1, 2.x.2), 107 `Heading5` (2.x.2.y) + 107 đoạn mô tả tiếng Anh **bê nguyên từ bản cũ** theo đúng UC.
- `2. Detailed Design` trước đây không có style (lệch với `3. Class Specifications` là Heading2) — đã đặt lại thành `Heading2`.
- Field mục lục đổi từ `TOC \h \u \z \t "Heading 1,1,Heading 2,2,Heading 3,3,"` sang `... ,Heading 5,4,` để 107 tên UC vẫn nằm trong mục lục ở cấp 4. **Không** thêm Heading4 vì mục 3 sẽ đổ thêm ~100 dòng rác vào mục lục.
- **Phải mở Word và cập nhật mục lục**: `Ctrl+A` → `F9`. Trước khi F9 thì mục lục vẫn là nội dung cũ.
- 248 ảnh cũ vẫn nằm trong `word/media/` dưới dạng part mồ côi (file 17,30 MB). Không sao về mặt mở file; dọn khi chèn bộ hình mới.
- Backup trước khi sửa nằm ở scratchpad của phiên làm việc (`Report4_SDS_v1.3.BACKUP.docx`) — copy ra chỗ khác nếu cần giữ lâu.

Chạy lại được bằng `word-rebuild-section2.ps1 -InDocx <ban goc> -OutDocx <ban moi> -Features features.json` (script luôn làm trên bản copy, dừng nếu không xác định được cả hai biên của mục 2 hoặc nếu phạm vi có chứa bảng).

## Ký pháp UML còn lại

- **Return message ghi giá trị trả về**, không để trống và không ghi chữ `return`: `Optional<AppUser>`, `HTTP 200 + UserDto`.
- Object được tạo giữa luồng thì dùng `«create»` trỏ vào đầu lifeline; bị huỷ thì đánh dấu `X` ở cuối.
- Thời gian chạy từ trên xuống, **không có mũi tên đi ngược lên**.
- **Một hệ đánh số duy nhất cho cả 107 sequence**: phẳng `1…N`, chỉ nhánh trong `alt` mới thụt (`7.1`, `7.2`). Không trộn hai kiểu.
- Khung `sd` bao ngoài: PlantUML không vẽ, chấp nhận bỏ. Tên hình lấy từ heading `2.x.2.y` của tài liệu — bản `_stereo` đang dùng trong Report 4 đã bỏ dòng `title` trong ảnh.

## Truy vết ngược về SRS

- Thứ tự bước trong sequence bám theo **Normal Flow** của use case trong mục 2 của SRS; nhánh `alt` bám theo **Alternative Flow**.
- Có mã message thì ghi vào nhãn (`MSG02`, `MSG12`, `MSG13`) — người chấm đối chiếu được ngay với mục 5.2 System Messages.
- Sequence chỉ vẽ luồng thành công gần như luôn bị trả về, vì Alternative Flow trong SRS không được hiện thực hoá.

## Nhất quán toàn tài liệu

- Đã vẽ lifeline `DB` với câu SQL ở UC này thì UC khác chạm DB cũng phải vẽ — không lúc có lúc không.
- Dùng đúng một bộ stereotype: `«user interaction»` `«coordinator»` `«business logic»` `«interface»` `«database wrapper»` `«proxy»` `«entity»`.
- Tên class trong sequence, trong class diagram và trong code phải trùng nhau từng ký tự.
- **Vẽ theo code thật**, không theo trí nhớ: mở controller → service → repository → entity của đúng feature đó rồi mới vẽ. Sai một tên method là hỏng quy tắc 6.
- Cắt hộp nào khỏi class diagram thì phải rà lại toàn bộ sequence của feature đó — quy tắc 5 gãy trước tiên ở các lifeline DTO / component FE vừa bị cắt.

## Rút gọn chữ ký

Chữ ký method dài làm hộp phình ngang, kéo cả hình rộng ra, và vì hình luôn bị ép vừa khổ trang nên **chữ bị co nhỏ**. UC-18 từng có dòng 166 ký tự → hình rộng 2406 px → chữ in ra chỉ 3,8 pt. Rút gọn xong còn 1510 px và 6,2 pt.

- Mỗi dòng trong hộp class **≤ 90 ký tự**.
- Từ **3 tham số trở lên thì bỏ kiểu**, chỉ giữ tên: `publishPlanReady(sessionId, examPlan) : void`.
- Bỏ tham số wiring: `generateStreaming(request, sessionId, stream)` → `generateStreaming(request, sessionId)`.
- Bỏ chuỗi JSON nội bộ khỏi tham số: `detailOne(activity, knowledge, objectivesJson, materialsJson, frameJson, userPrompt)` → `detailOne(activity, context)`.
- Thêm `skinparam wrapWidth 320` (class diagram) và `skinparam maxMessageSize 280` (sequence) để dòng dài tự xuống hàng.
- Class diagram của feature chỉ liệt kê **operation thật sự xuất hiện trong sequence của feature đó** — đây là cách hiệu quả nhất để giữ hộp gộp không phình.

## Kích thước hình

Nội dung quyết định kích thước, **không cắt bớt lifeline hay rút nhãn chỉ để hình hẹp lại**. Script tự co hình vừa bề ngang trang (9,69") nên hình càng rộng thì chữ càng nhỏ khi in. Class diagram gộp nên đặt trang landscape (Layout → Orientation → Landscape cho section).

Tham khảo: bề ngang gốc **≤ 1300 px** thì chữ in ra khoảng 7 pt; 1900 px thì còn ~4,8 pt.

## Kỷ luật khi ghi vào file trên Drive

- **Đóng Word / tab draw.io trước khi chạy script**, chọn *không lưu*. Autosave của tab đang mở đã từng đè mất toàn bộ thay đổi một lần.
- Luôn **backup ra scratchpad trước mỗi lần ghi đè**; chỉ ghi khi XML đã parse hợp lệ.
- Sau khi chèn ảnh, mở Word và **cập nhật mục lục**: `Ctrl+A` → `F9`.
- Script động vào `document.xml` **không được xoá đoạn văn nằm trong `<w:tbl>`** — mỗi ô bảng bắt buộc có ít nhất một đoạn văn, xoá là hỏng file. Script luôn loại trừ vùng bảng, bắt buộc xác định được cả hai biên của mục 2, và dừng nếu định xoá quá 20 đoạn.
- **Chỉ mục đã có hình mới được ngắt trang.**
- Mục 2 phải **dựng lại từ đầu** theo cấu trúc feature: 112 mục cấp 3 cũ (`2.1 … 2.112`) bị thay bằng 15 mục cấp 3 + 15 mục `2.x.1` + 15 mục `2.x.2` + 107 mục cấp 5 `2.x.2.y`. Đây là thao tác xoá lớn — làm trên bản copy trước, đối chiếu số đoạn trước/sau rồi mới ghi đè bản chính.

## Giới hạn của bộ kiểm

`check-consistency.mjs` chỉ kiểm được message có dạng lời gọi (`tenHam(...)`). Message viết bằng lời văn (`sanitize the answer text`) **không bị kiểm** — đó là lý do quy tắc 6 cho phép dùng lời văn cho bước nội bộ, nhưng cũng có nghĩa là **lời văn phải đúng nghiệp vụ**, không ai bắt lỗi hộ.

## Việc cần xử lý

| Việc | Vấn đề |
|---|---|
| Vẽ 15 class diagram gộp | Nguyên liệu là 107 file `uc<NN>/uc<NN>_class.puml`; gộp xong phải rà lại lifeline của toàn bộ sequence trong feature (quy tắc 5) |
| 4 hình tổng thể mục 1 | Xem bảng dưới |
| UC-110 Export School Performance Report | **Code chưa có** — hình đã vẽ theo **thiết kế dự kiến** (tái dùng `DocumentPdfRenderer` + `StorageClient`, tên mới: `PrincipalStatisticsReportService`, `StatisticsReportHtmlBuilder`). Phải code bổ sung, hoặc vẽ lại sau khi có code |
| UC-112 Export Subject Performance Report | như trên (`ModeratorStatisticsReportService`) |
| 5 UC thiếu spec ở mục 2 của SRS | UC-27, UC-95, UC-98, UC-106, UC-112 — hình đã vẽ theo code, cần bổ sung Normal/Alternative Flow vào SRS rồi rà lại nhánh `alt` |
| Mã MSG | Bảng 5.2 của SRS và mã trích trong luồng UC ở mục 2 đang là **hai hệ đánh số khác nhau**. Toàn bộ hình đang trích theo mã ở luồng UC. Nếu chốt remap thì phải sửa cả SRS lẫn toàn bộ file `.puml` một lượt |
| UC-01, UC-73→76 | Xem mục "Tạm để ngoài" ở trên |

Năm chức năng sau **có endpoint nhưng giao diện không gọi tới** (code chết) — đã loại khỏi danh sách, không vẽ: Report Hub Content · Customize Physics Simulation · Ban Moderator Account · Ban IT Support Account · Reactivate IT Support Account.

## Hình tổng thể

| Mục | Hình | Trạng thái | Ghi chú |
|---|---|:---:|---|
| 1.1 | Software Architecture | — | Hội đồng đánh giá bản hiện tại **chưa đúng**: là tranh ghép logo, ô OpenAI/DeepSeek bị dán nhãn *Authentication Services*, mũi tên PostgreSQL ngược chiều, thiếu kênh WebSocket/STOMP, backend không thể hiện phân tầng |
| 1.2.1 | Package Diagram — Backend | — | Theo `be/src/main/java/com/edua/beeduasystem/` |
| 1.2.2 | Package Diagram — Frontend | — | Theo `fe/app/`, `fe/lib/`, `fe/components/` |
| 1.3 | Entity Relationship Diagram | — | 24 bảng, đã đối chiếu khớp `db/migration` V1–V50 |
