# Report5.1_Unit Test — Đối chiếu tham số hàm với code thật

**Ngày quét:** 2026-08-20
**File tài liệu:** `H:\...\AAA_docs_sau_khi_nop_9_8\Report5.1_Unit Test.xlsx` (28 sheet test case + MethodList + Statistics)
**Code đối chiếu:** `be/src/main/java/com/edua/beeduasystem/` (nhánh `main`, commit `da33cad`)
**Phạm vi:** chỉ soi phần **tham số đầu vào** của từng hàm (tên / kiểu / thứ tự / số lượng / đầu vào ngầm / giá trị biên / dấu "O" có ánh xạ vào giá trị input hay không). Không đánh giá phần kỳ vọng đầu ra, ngoài những chỗ nó chứng minh input bị sai.

---

## 1. Tóm tắt

| Mức | Số sheet | Nội dung |
|---|---|---|
| 🔴 Nặng — sai/thiếu tham số trong chữ ký | 6 | `replaceModerator`, `addTeacher`, `createBlogPost`, `updateBlogPost`, `updateCurrentUserProfile`, `deleteTeacher` |
| 🟠 Trung bình — thiếu đầu vào ngầm quyết định nhánh code | 9 | `createClass`, `updateClass`, `updateClassStatus`, `listHubContents`, `getHubContentDetail`, `customizeHubContent`, `hideHubComment`, `submitWeeklyTask`, `approveWeeklyTask` |
| 🟡 Nhẹ — sai tên/sai chỗ/sai giá trị enum, dấu "O" lạc dòng | 12 | phần còn lại |
| ✅ Khớp tham số | 1 | `listModerators` |

Ngoài ra: **3 sheet ghi sai tên class** — `listModerators` / `addModerator` / `replaceModerator` ghi `AdminModeratorService`, class thật là `PrincipalModeratorService` (`service/auth/PrincipalModeratorService.java:38`).

---

## 2. Lỗi 🔴 nặng: chữ ký hàm không khớp

### 2.1 `replaceModerator` — thiếu hẳn tham số thứ 4

```java
// PrincipalModeratorService.java:165
public AppUser replaceModerator(UUID id, String replacementEmail,
                                boolean disablePrevious, List<Integer> previousTeacherGrades)
```

Sheet (D21–D33) chỉ mô tả 3 tham số: `id`, `replacementEmail`, `disablePrevious`. **Không case nào có `previousTeacherGrades`.**

Hệ quả: 11/12 case đặt `disablePrevious=false`, mà nhánh đó bắt buộc `requireGrades(previousTeacherGrades)` và ném `IllegalArgumentException` nếu null/rỗng (`PrincipalModeratorService.java:200-201, 248-257`). Các case kỳ vọng thành công (UTC-REP-01, 03, 11) không thể ra kết quả như sheet ghi. Cũng thiếu toàn bộ biên của `previousTeacherGrades` (10/11/12 hợp lệ; 9, 13, rỗng, null → `IllegalArgumentException`, dòng 252-256).

### 2.2 `addTeacher` — thiếu hẳn tham số thứ 4

```java
// ModeratorTeacherService.java:118
public AppUser addTeacher(String email, String rawSubject, String fullName, Collection<Integer> grades)
```

Sheet (D19–D34) chỉ có `email`, `subject`, `fullName`. Controller truyền `request.grades()` (`ModeratorController.java:66`), DTO có `@NotEmpty List<Integer> grades` (`AddTeacherRequest.java:24`).

Hệ quả: `normalizeGrades` ném `IllegalArgumentException("Vui lòng chọn ít nhất một khối.")` khi null/rỗng (`ModeratorTeacherService.java:131, 310-313`) và chạy **trước** `findByEmail` (dòng 135). Nên UTC-AT-03 kỳ vọng `DuplicateEmailException` thực tế sẽ dừng ở lỗi grades. Thiếu biên grades 9/10/12/13 (dòng 316-318).

> **Nguyên nhân gốc của 2.1 và 2.2:** sheet ghi ngày thực thi 14/06/2026, còn hai tham số này được thêm vào code ngày 12/08/2026 (`473f6ed`) và 15/08/2026 (`2f2ad48`). Tài liệu chưa cập nhật theo chữ ký mới.

### 2.3 `createBlogPost` / `updateBlogPost` — thiếu `thumbnailUrl`

```java
// BlogPostService.java:56
public BlogViews.PostDetail create(String title, String rawContent, String rawSubject, String thumbnailUrl)
// BlogPostService.java:69
public BlogViews.PostDetail update(UUID id, String title, String rawContent, String rawSubject, String thumbnailUrl)
```

Cả 11 case của `createBlogPost` (D19–D39) và 7 case của `updateBlogPost` (D19–D30) chỉ ghi 3 trường `title; content; subject`. Nhánh `cleanUrl()` (`BlogPostService.java:186-195`) hoàn toàn không được phủ: null/blank → trả null (187-189), biên 1000 ký tự → `IllegalArgumentException` (191-193) — trong khi sheet tự nhận đã phủ biên.

Riêng UTC-UBP-02 tên là "Partial update keeps omitted fields" nhưng bỏ đúng cái nhánh nó nhắm tới: `thumbnailUrl != null ? cleanUrl(thumbnailUrl) : post.thumbnailUrl()` (`BlogPostService.java:76`).

Tên tham số cũng lệch: sheet ghi `content` / `subject`, code là `rawContent` / `rawSubject`.

### 2.4 `updateCurrentUserProfile` — thiếu 2 tham số, thừa 1 "tham số"

```java
// ProfileService.java:35-36
public ProfileResult updateCurrentUserProfile(String fullName, String avatarUrl, String contactInfo,
                                              String bio, String phoneNumber, LocalDate dateOfBirth)
```

- **Thiếu `bio`** (tham số 4, xử lý tại `ProfileService.java:58-59`) — không xuất hiện ở bất kỳ ô nào trong sheet.
- **Thiếu `phoneNumber`** (tham số 5, `ProfileService.java:45-47`) — cũng không xuất hiện. Đây là trường bắt buộc với tài khoản không phải STUDENT và có validator riêng (`AppUserFieldValidator.normalizeVietnamPhoneNumber`, dòng 50-68: đúng 10 chữ số, prefix `0[35789]`, max 30 ký tự) — toàn bộ nhóm validate này không được case nào phủ.
- **Thừa `Role`** (nhãn B21): roles đọc từ repository bên trong hàm (`ProfileService.java:40`), là precondition chứ không phải input. Hơn nữa K21/L21 đánh "O" ngay trên hàng nhãn, không có giá trị ở cột D.
- Sai tên: `fullname` → `fullName`; `Avata` → `avatarUrl`; `Birthday` → `dateOfBirth` (kiểu `LocalDate`, sheet chỉ ghi `null`, không có ví dụ định dạng ngày nào).
- `contactInfo` không có hàng nhãn riêng, chỉ nằm lẫn trong chuỗi D36.

**Mâu thuẫn do thiếu 2 tham số trên:**

- UTC-UPD-04/05 (avatar URL sai) truyền thiếu `phoneNumber` + `dateOfBirth`; do thứ tự thực thi, `normalizeEducatorDateOfBirth` / `normalizeVietnamPhoneNumber` (dòng 42-47) chạy **trước** `normalizeAvatarUrl` (dòng 55), nên exception thật là "Vui lòng nhập ngày sinh." chứ không phải thông điệp avatar mà D45 kỳ vọng. Test thật trong repo phải truyền đủ (`ProfileServiceTest.java:110-113`).
- UTC-UPD-02 "all null → giữ giá trị cũ" chỉ đúng cho `fullName` / `avatarUrl` / `contactInfo` / `bio`; với `dateOfBirth` + `phoneNumber` thì chỉ đúng khi user có role STUDENT (`ProfileService.java:41-47`) — điều kiện này không được ghi. Chính test hiện có đã chú thích điều đó (`ProfileServiceTest.java:88-91`).

### 2.5 `deleteTeacher` — sai kiểu tham số

```java
// ModeratorTeacherService.java:161
public void deleteTeacher(UUID id)
```

| Ô | Sheet ghi | Code thật |
|---|---|---|
| D15, D16 | `id = 123.0`, `456.0` (số) | `UUID` (`ModeratorTeacherService.java:161`, `ModeratorController.java:85`) |
| D33 | Return value = `True` | hàm trả `void` |
| G13 | "O" đánh trên hàng nhãn `ID` | không ánh xạ vào giá trị nào |
| J11, J19, H23, I25, K25 | "O" trên hàng trống hoàn toàn | không nhãn ở B, không giá trị ở D |
| cột J (UTC-DT-05) | không có input nào được đánh dấu | case kỳ vọng `ForbiddenOperationException` nhưng không truyền gì |
| D9 + D10 (cột I, K) | đánh đồng thời "123 tồn tại" và "456 không tồn tại" | hai precondition mâu thuẫn cho cùng một `id` |

Thiếu đầu vào ngầm `currentUserProvider.require().subject()` (dòng 162) dù exception kỳ vọng D42 lại nhắc "subject MATH"; thiếu precondition cho 2 nhánh `status == DISABLED` (168-170) và không có role TEACHER (171-173). Chính tả: `user iD "123" is exting`.

---

## 3. Lỗi 🟠: thiếu đầu vào ngầm quyết định nhánh code

### 3.1 Nhóm ClassManagement — không sheet nào khai `TeacherGradeRepository`

Grep cả 3 sheet `createClass`, `updateClass`, `updateClassStatus` không có chữ "TeacherGrade" / "khối phụ trách" nào, trong khi `requireOwnGrade` là chốt chặn chạy trước phần lớn validate khác:

- `createClass`: `requireOwnGrade(ownerId, requestedGrade)` (`ClassManagementService.java:90`, thân 324-331) chạy **trước** `requireName` (93) ⇒ case F/G/H (grade 10/11/12) và L/M (kỳ vọng lỗi tên) sẽ ra `ForbiddenOperationException` trước.
- `updateClass`: `requireOwnGrade(classroom.ownerId(), newGrade)` gọi **vô điều kiện** (dòng 118), kể cả khi `grade=null` (lúc đó lấy `classroom.grade()`). Case G/H/I/J đều `grade=null` nên chỉ pass nếu giáo viên đúng khối của lớp — sheet không khai, cũng không cho biết `grade` hiện tại của lớp `aaaaaaaa-…`.
- `updateClassStatus`: chuyển sang ACTIVE gọi `requireOwnGrade(ownerId, classroom.grade())` (dòng 141-143) ⇒ case G và N có thể ném Forbidden thay vì trả `ClassDetail`.

### 3.2 Nhóm Hub — subject của user hiện tại đè tham số

- `listHubContents`: `currentUser.require().subject()` **đè hoàn toàn** tham số `rawSubject` (`HubContentService.java:44-45`). Không hàng nào ghi user hiện tại ⇒ case H (`subject="MATH"`) và L (`subject="HISTORY"` → exception) chỉ đúng khi user có `subject == null`; với Teacher đã có chuyên môn thì `parseSubject` không bao giờ chạy.
- `getHubContentDetail` / `customizeHubContent`: `requireApproved` chặn khi `assignedSubject != null && content.subject() != assignedSubject` → `ResourceNotFoundException` (`HubContentService.java:84-87`). Không case nào phủ.
- `hideHubComment`: không ghi giá trị cụ thể cho `currentUser.requireUserId()` (`HubCommentService.java:124`) nên case K ("currentUserId equals comment.authorId") và L ("not content owner") không có giá trị input xác định; cũng thiếu hẳn case chưa đăng nhập → `InvalidTokenException` (`CurrentUserProvider.java:28`).

### 3.3 Nhóm WeeklyTask — thiếu điều kiện làm exception kỳ vọng không thể xảy ra

- `approveWeeklyTask` cột L: case "unauthenticated / subject=null" **không đánh D11** ("reviewStatus là SUBMITTED"). Code kiểm trạng thái ở dòng 429 **trước** `requireSubject()` ở 432 ⇒ thực tế ném `IllegalArgumentException: Chỉ có thể duyệt nhiệm vụ đang ở trạng thái đã nộp`, không phải Forbidden/InvalidToken như D40/D42.
- `submitWeeklyTask` cột M: không đánh D11 nên trạng thái task không xác định; code kiểm trạng thái (302) trước khi resolve library content (311-319).
- `updateWeeklyTask` cột Q (UTC-UWT-12): **không có bất kỳ điều kiện đầu vào nào được đánh O** — không tái lập được `requireModeratorOwnerInSubject` (419-425) / `requireBeforeDeadline` (438-442).
- `updateWeeklyTask`: không hàng nào khai **kích thước cụm task (assignment group)**, dù nó quyết định 2 nhánh: cụm có task APPROVED thì chặn sửa (255-257), cụm > 1 task thì cấm đổi giáo viên (268-270).
- `submitWeeklyTask` / `approveWeeklyTask`: không ô nào ghi `currentUser.requireUserId()` dù đó là giá trị so với `c.ownerId()` (314) và được ghi vào `reviewedBy` + activity log (371, 374-375).

---

## 4. Lỗi 🟡: sai giá trị / sai chỗ / dấu "O" lạc

### 4.1 Giá trị enum không tồn tại

| Sheet | Ô | Sheet ghi | Enum thật |
|---|---|---|---|
| `listHubContents` | D23 | `type="SLIDE"` | `LESSON_PLAN, SLIDE_DECK, TEST, SIMULATION` (`LibraryContentType.java:3`) — phải là `SLIDE_DECK` |
| `customizeHubContent` | D20 | "APPROVED **SLIDE** source" | như trên |
| `removeBlogPostByModerator` | D13, D23 | `subject=HISTORY` | `Subject` chỉ có MATH/CHEMISTRY/PHYSICS (`Subject.java:4-8`) — không tạo được post subject=HISTORY |

Riêng `createBlogPost` dùng `subject="HISTORY"` là **hợp lệ**, vì tham số là `rawSubject` kiểu String chưa parse.

### 4.2 Sai khái niệm giá trị

- `refresh` D24: giá trị `rawRefreshToken` được ghi là một **JWT access token** (3 phần, payload chứa `sub/email/roles/role/subject` đúng bộ claim của `issueAccessToken`, `JwtTokenAdapter.java:29, 54-62`). Refresh token thật là chuỗi ngẫu nhiên đục: 32 byte Base64-URL không padding (`AuthService.java:194-198`), không có dấu chấm.
- `loginWithGoogle` D27: `idToken="   "` kỳ vọng `InvalidTokenException`, nhưng `loginWithGoogle` **không có** blank-check nào (dòng 81-88) — lỗi ném từ adapter `GoogleIdTokenVerifierAdapter.java:33-35`, mà adapter bị mock trong unit test (`AuthServiceTest.java:48`) ⇒ case này không kiểm chứng hành vi của hàm đang test.
- `loginWithGoogle` cột H (UTC-LOG-03): precondition nói email có khoảng trắng + chữ hoa nhưng **không ô nào ghi giá trị email**, dù đó mới là đầu vào quyết định (`AuthService.java:86-87`).
- `deleteBlogPost` D21: gọi "All-zero UUID boundary" — code không có xử lý biên riêng cho UUID toàn 0, nó chỉ là id không tồn tại, trùng nhánh với UTC-DBP-03.

### 4.3 Fixture UUID dùng lẫn

`getHubContentDetail` D26, `customizeHubContent` D24, `createHubComment` D27: `id="3333-…"` chính là UUID được khai làm **id user hiện tại** ở `customizeHubContent` D9 / `createHubComment` D10 — dùng userId làm contentId.

### 4.4 Dữ liệu entity bị nhét vào khối "Input value"

| Sheet | Ô | Nội dung không phải tham số |
|---|---|---|
| `deleteBlogPost` | D19, D23, D25 | `title`, `subject`, `authorEmail`, `status` — hàm chỉ có `delete(UUID id)` |
| `removeBlogPostByModerator` | D23 | `postSubject`, `moderatorSubject` |
| `getClassDetail` | D19–D28 | `owner caller`, `owner fullName`, `enrolledStudentCount`… — hàm chỉ có `getDetail(UUID id)` |
| `approveWeeklyTask` | D19–D25 | `task status`, `subject`, `source fields` — hàm chỉ có `approve(UUID id)` |
| `submitWeeklyTask` | D21 | `reviewStatus=REJECTED` |
| `listClasses` / `createClass` / `updateClassStatus` | D26 / D22 / D25 | `unauthenticated caller`, `callerId` — đầu vào ngầm |
| `updateClass` | D28 | `currentUser.subject=CHEMISTRY` |

### 4.5 Dấu "O" đánh ngược mệnh đề "unless" của chính hàng đó

Lỗi cơ học lặp lại nhiều nhất, tập trung ở nhóm WeeklyTask và `addClassMember`:

| Sheet | Hàng | Cột bị đánh sai |
|---|---|---|
| `listWeeklyTasks` | D9 "authenticated as TEACHER **unless** Moderator" | G, H, I (đúng 3 case Moderator) |
| `listWeeklyTasks` | D9 | L — role ghi TEACHER nhưng input D25 là MODERATOR subject=null; nhánh TEACHER không bao giờ gọi `requireSubject()` nên exception D39 không thể xảy ra |
| `listWeeklyTasks` | D11 + D13 | J — đánh cả "repo trả tasks" lẫn "repo trả rỗng" |
| `updateWeeklyTask` | D11 "catalog resolves **unless** tests catalog errors" | K, L (đúng 2 case lỗi catalog) |
| `updateWeeklyTask` | D13 "lesson slots **allow** …" | N (case trùng bài / vượt 2 bài) |
| `updateWeeklyTask` | D9 "findById **finds** …" | P (case không tìm thấy) |
| `submitWeeklyTask` | D10 "deadline **in the future** …" | O (case quá hạn) |
| `submitWeeklyTask` | D11 "NOT_SUBMITTED hoặc REJECTED …" | L (case SUBMITTED/APPROVED) |
| `listWeeklyTaskModerationQueue` | D9 "MODERATOR **với subject=MATH** …" | K (case subject=null) |
| `addClassMember` | D11 "capacity < 60" | Q (case lớp đủ 60, kỳ vọng CLASS_FULL) |
| `addClassMember` | D12 "no ENROLLED member exists" | J (case trùng ghi danh) |
| `addClassMember` | D14 | L (case hồ sơ không hợp lệ, không thuộc nhóm điều kiện đó) |
| `hideHubComment` | D9 "comment tồn tại và chưa bị ẩn **unless** …" | I, J (đúng 2 case ẩn / không tồn tại) |
| `updateBlogPost` | D17 (hàng nhãn "Input value") | L, M — nội dung điều kiện bị viết vào hàng nhãn |

### 4.6 Case không có input / không có precondition

| Sheet | Case | Vấn đề |
|---|---|---|
| `updateCurrentUserProfile` | UTC-UPD-03, 09–13 | 6 dấu "O" (H27, N30, O31, P32, Q33, R34) đánh vào hàng **trống hoàn toàn** — 6 case không có input nào |
| `deleteTeacher` | UTC-DT-05 | không có giá trị input nào được đánh dấu |
| `createHubComment` | UTC-CHCOM-09 (cột N) | không có precondition nào; D27 thiếu giá trị `rawContent` |
| `createHubComment` | K, L, M | thiếu giá trị `rawContent` |
| `updateWeeklyTask` | UTC-UWT-12 (cột Q) | không có điều kiện đầu vào nào |
| `submitWeeklyTask` | UTC-SWT-09 (cột N) | không có điều kiện đầu vào nào |
| `addModerator` | UTC-ADD-10..13 (O, P, Q, R) | không đánh precondition "đã đăng nhập administrator" (D9 chỉ đánh F–M) |
| `addTeacher` | UTC-AT-07..10 (L, M, N, O) | không đánh D9/D10 (moderator đăng nhập + subject) |
| `updateClass` | UTC-UC-14 (cột S) | không đánh D9 "đã đăng nhập" |
| `getClassDetail` | UTC-GCD-10 (cột O) | không đánh D9 "class tồn tại"; `requireClass` chạy trước `requireUserId` (237-238) nên ra ResourceNotFound chứ không phải InvalidToken |
| `createHubComment` | UTC-CHCOM-10 (cột O) | thiếu D9 "content APPROVED" |
| `updateClass` | D30 (case R, S) | chỉ ghi `id`, thiếu 4/5 tham số còn lại |
| `addModerator` | S7, T7 | 2 cột test case còn sót trong header nhưng không có input/Confirm/Result nào |

### 4.7 Giá trị biên sai hoặc thiếu

| Sheet | Vấn đề | Giới hạn thật |
|---|---|---|
| `updateCurrentUserProfile` | D42/D48 nói "at DB max lengths" nhưng **không ghi số nào** | fullName 255, avatarUrl **1024**, contactInfo 500, bio 1000, phoneNumber 30 (`AppUserFieldValidator.java:11-15`, `V9`, `V29`) — lưu ý avatarUrl không phải 255 |
| `updateCurrentUserProfile` | M29: case boundary trỏ vào `Birthday = null` | `null` không phải giá trị biên; với user không phải STUDENT thì ném `IllegalArgumentException` (`AppUserFieldValidator.java:70-73`) |
| `createClass` | chỉ có biên dưới `grade=9` | thiếu biên trên `grade=13` (`ClassManagementService.java:318`) |
| `createClass` | không có case `description` = 2001 ký tự | giới hạn 2000 (`ClassManagementService.java:293`) |
| `addClassMember` | D25 không nêu giá trị biên cụ thể | phone `^0[35789]\d{8}$` (dòng 67, 455), tuổi ≥ `MIN_STUDENT_AGE_YEARS = 16` (64, 464) — thiếu case dob tròn 16 tuổi |
| `listWeeklyTaskModerationQueue` | chỉ test cận trên `size=200 → 100` | thiếu cận dưới `Math.max(1, size)` (dòng 353) |
| `customizeHubContent` | D22 "title length near boundary" | `customize` chỉ nối `" (bản sao)"`, không kiểm độ dài (`HubContentService.java:60`); giới hạn chỉ ở cột DB `VARCHAR(255)` — không kiểm chứng được ở mức unit |
| `createBlogPost` / `updateBlogPost` | không có biên `thumbnailUrl` | 1000 ký tự (`BlogPostService.java:191-193`) |
| `listModerators` | UTC-LM-01 gắn Type=B nhưng input giống 3 case còn lại | không case nào chạm biên `page`/`size` |

### 4.8 Mock / cổng ghi sai trong Pre-Condition

| Sheet | Ô | Sheet ghi | Code thật gọi |
|---|---|---|---|
| `listHubContents` | D9 | `LibraryContentRepository.searchApproved` | `searchApprovedHubSummaries(...)` (`HubContentService.java:46`; `searchApproved` ở `LibraryContentRepository.java:24` là method khác) |
| `listHubContents` | D11, D12 | `AppUserRepository`, `HubCommentRepository.countByLibraryContentId` | không tham gia — `ownerName`/`commentCount` nằm trong cùng projection (`HubContentService.java:91-94`) |
| `getHubContentDetail`, `customizeHubContent`, `hideHubComment` | D9 / D10 / D12 | `findActiveById` | `findApprovedForHubById` (`HubContentService.java:82`, `HubCommentService.java:128`) — khác ngữ nghĩa: bản Hub vẫn trả nội dung APPROVED đã soft-delete khỏi thư viện cá nhân |
| `deleteTeacher` (MethodList) | — | mock `CurrentUserProvider, AppUserRepository, UserRoleRepository` | service có 8 dependency; thiếu `ClassRepository`, `RefreshTokenRepository`, `ActivityLogService` |

### 4.9 Một ô gộp nhiều bộ input / nhiều exception

`addModerator` D58 · `updateWeeklyTask` D24, D28, D30 · `submitWeeklyTask` D26, D27 · `approveWeeklyTask` D22, D25 · `addClassMember` D24 · `deleteBlogPost` D23 · `loginWithGoogle` D44 · `refresh` D42 · `replaceModerator` B47 (giá trị kỳ vọng viết nhầm sang cột nhãn) · `updateBlogPost` D30 (hai biên 255/256 chung một hàng, cả L và M cùng đánh "O").

### 4.10 Lỗi lẻ khác

- `addModerator` D10 vs D38 (cột M): precondition ghi "email **vuhiep@gmail.com** does not exist" nhưng input là `email="vuhiep.blankname@gmail.com"` — precondition và input khác email.
- `addModerator` D49 (cột F): case input độ dài thường bị đánh vào hàng kết quả "accepted **at the DB max lengths**".
- `replaceModerator` O46: "O" đánh vào hàng 46 trống, đúng ra phải là `ForbiddenOperationException` "Môn … đã có moderator đang hoạt động khác" (`PrincipalModeratorService.java:340-343`).
- `replaceModerator` D9: ghi vai trò gọi hàm là "ADMINISTRATOR", code ghi actor là `"PRINCIPAL"` (dòng 211).
- `addTeacher` D12 (cột G): precondition reactivate chỉ nêu "user DISABLED", thiếu 2 điều kiện bắt buộc là role TEACHER (284-292) và subject trùng moderator (293-297).
- `removeBlogPostByModerator` B18/B20/B22/B24: các hàng input không có nhãn ở cột B; D11 khai "reason is null or blank" nhưng chỉ có case `reason="   "`, thiếu `reason=null` dù code kiểm riêng (`BlogPostService.java:96`).
- `createBlogPost` D55: ghi thông điệp `"Content is required after sanitization."`, code ném `"Content is required."` (`BlogPostService.java:181`).
- `loginWithGoogle` D35/D39 và `refresh` D33: mô tả `LoginResult`/`RefreshResult` thiếu thành phần `List<Integer> grades` của record (`AuthService.java:71, 74`).
- `updateClassStatus` A3: mô tả gọi hàm là "updateClassStatus", tên hàm thật là `updateStatus` (L1 ghi đúng).
- `addClassMember` D29 (cột P): kỳ vọng "reuse tài khoản khi email khác hoa/thường" — code chỉ chuẩn hoá **đầu vào** rồi `findByEmail` khớp chính xác (`ClassEnrollmentService.java:422`, `JpaAppUserRepository.java:31-33`, không có `IgnoreCase`), nên sẽ tạo tài khoản mới chứ không reuse.
- `addClassMember`: lệch tên tham số `phone` → `rawPhoneNumber`, `dob` → `dateOfBirth`, `fullName` → `rawFullName` (`ClassEnrollmentService.java:101-102`).
- `updateClass`: hàng 33 để trống, khối "Return value" bắt đầu ở D34 — lệch cấu trúc so với các sheet khác.

---

## 5. Sheet khớp tham số

**`listModerators`** — `listModerators(Pageable pageable)` (`PrincipalModeratorService.java:86`); sheet ghi đúng `PageRequest.of(0, 20, Sort.by(DESC, "createdAt"))`, khớp đúng cái controller dựng (`PrincipalController.java:61-62`). Hàm không dùng `currentUserProvider` nên không có đầu vào ngầm bị bỏ sót. (Chỉ vướng lỗi tên class ở C1 và Type=B không có biên thật.)

Hai nhóm khác cần ghi nhận là **đúng chữ ký**, lỗi chỉ nằm ở precondition:

- **WeeklyTask (5 sheet):** đúng tên/kiểu/thứ tự/số lượng tham số, kể cả việc `update` không có `grade` và dùng tên `title` chứ không phải `scopeDescription` của DTO.
- **Classroom (6 sheet):** đúng chữ ký cả 6, chỉ `addClassMember` lệch tên tham số như mục 4.10.

---

## 6. Việc cần làm, theo thứ tự ưu tiên

1. **Cập nhật chữ ký cho 4 sheet 🔴** — bổ sung `previousTeacherGrades` (replaceModerator), `grades` (addTeacher), `thumbnailUrl` (createBlogPost + updateBlogPost), `bio` + `phoneNumber` (updateCurrentUserProfile). Đây là lỗi khiến kết quả "Passed" ghi trong sheet không thể tái lập.
2. **Sửa `deleteTeacher`** — đổi input từ số sang UUID, bỏ "Return value = True" (hàm `void`), gỡ 5 dấu "O" lạc dòng, bổ sung 3 nhánh `ResourceNotFoundException` và nhánh moderator thiếu subject.
3. **Bổ sung đầu vào ngầm** — TeacherGrade cho 3 sheet Class, subject của user hiện tại cho 4 sheet Hub, `requireUserId()` cho WeeklyTask submit/approve.
4. **Rà lại toàn bộ dấu "O" đánh ngược mệnh đề "unless"** (bảng 4.5) — 14 chỗ, lỗi cơ học, sửa nhanh.
5. **Sửa giá trị sai khái niệm** — `SLIDE` → `SLIDE_DECK` (2 chỗ), `subject=HISTORY` ở `removeBlogPostByModerator`, JWT dùng làm refresh token, UUID user dùng làm contentId (3 chỗ).
6. **Đổi tên class** `AdminModeratorService` → `PrincipalModeratorService` ở 3 sheet + MethodList.
7. **Bổ sung giá trị biên còn thiếu** (bảng 4.7), đặc biệt `avatarUrl` 1024 (không phải 255) và `grade=13`.

---

## 7. Ghi chú: mức khớp giữa doc và test tự động

Sheet Statistics khai **253 test case, 100% passed, 100% coverage**. Đối chiếu `be/src/test/`:

- 8/28 hàm **không có unit test tự động nào**: `listModerators`, `addTeacher`, `deleteTeacher`, 4 hàm blog (`create` / `update` / `delete` / `removeByModerator`), `addStudent`, `schedule`, `listModerationQueue`, `hideByContentOwner`.
- Không tồn tại `ModeratorTeacherServiceTest`, `BlogPostServiceTest`, `ClassEnrollmentServiceTest`.
- Tổng số `@Test` thuộc 28 hàm này khoảng **50**, so với 253 case tài liệu khai.
- Một số hành vi được phủ bằng **integration test** (`UserManagementIntegrationTests`, `BlogIntegrationTests`, `WeeklyTaskIntegrationTests`…) — nhưng đó là phạm vi của Report5.2, không phải Report5.1.

Đây là vấn đề tách bạch với lỗi tham số ở trên, ghi lại để cân nhắc khi bảo vệ.
