# Kế hoạch quét lỗi logic / thiếu alternative flow

Mục tiêu: tìm những chỗ code **chạy đúng ở happy path nhưng vỡ ở nhánh phụ** — người dùng bấm hai
lần, trạng thái đã đổi, AI trả về rác, mạng đứt giữa chừng, file hỏng, người dùng không còn quyền.

Khác với `after8_9.md`: tài liệu đó đối chiếu **code vs SRS** (thiếu tính năng gì). Tài liệu này soi
**code vs chính nó** (tính năng có rồi nhưng logic hở). Hai việc bổ sung nhau, không trùng.

Lập ngày 2026-08-10 trên nhánh `main`.

---

## 1. Công cụ và cách chạy

Dùng skill `/code-review` với **path target** (nó nhận cả path, không chỉ diff):

```
/code-review high be/src/main/java/com/edua/beeduasystem/service/library be/src/main/java/com/edua/beeduasystem/presentation/controller/LibraryContentController.java
```

Về mức effort:

- `low` / `medium` — chỉ báo lỗi chắc chắn. **Không hợp** với việc này: alternative flow thiếu sót
  hầu hết là suy đoán "nếu người dùng làm X thì sao", mức thấp sẽ lọc bỏ hết.
- `high` — mặc định cho mọi cụm dưới đây.
- `max` — chạy lại cho cụm nào ở `high` đã lộ ra nhiều vấn đề, hoặc cho Tier 1 (R1–R3) nếu lượt
  `high` bỏ sót những lỗ đã biết trước ở cột "Đầu mối".
- `ultra` — multi-agent trên cloud, sâu hơn hẳn nhưng **phải tự gõ lệnh** và tính phí riêng. Để dành
  cho một cụm duy nhất, sau khi các cụm khác đã xong và biết chỗ nào đáng đầu tư.

Thêm `--fix` để áp luôn sửa vào working tree. **Không dùng `--fix` ở lượt quét đầu** — đọc finding
trước, vì một số "lỗi" sẽ là quyết định thiết kế có chủ ý.

**Mỗi cụm chạy hai lượt: tự động trước, đọc tay sau.** Rút ra từ R1, nơi hai lượt gần như không chồng
lấn (4/19 finding trùng nhau). Lượt tự động phủ đường lỗi phía FE tốt hơn hẳn và tìm được ca kích hoạt
cụ thể; đọc tay bắt lỗi hệ thống và những lỗ hổng dạng "đáng lẽ phải có mà không có" — thiếu
`@Transactional` cả package, thiếu hẳn một endpoint, sai HTTP status. Đọc tay chạy sau và chỉ nhắm vào
loại thứ hai, không đọc lại từng dòng.

---

## 2. Những lớp lỗi cần săn

Đây là checklist để đọc finding và để tự soi tay chỗ nào công cụ bỏ sót:

**Máy trạng thái**
- Chuyển trạng thái không hợp lệ có bị chặn không (unsubmit khi đã APPROVED, chấm điểm bài đã rút, duyệt bài đã xoá).
- Thao tác lặp: bấm submit hai lần, gửi duyệt hai lần, reactivate tài khoản đang active.
- Race: hai moderator cùng duyệt một bài; teacher rút nộp đúng lúc moderator đang duyệt.
- Trạng thái cuối có lối thoát không, hay item kẹt vĩnh viễn.

**Quyền và danh tính**
- Kiểm tra quyền có ở **cả** controller lẫn service, hay chỉ một chỗ.
- Đối tượng của thao tác có còn tồn tại / còn active không (moderator phụ trách đã bị thu hồi, học sinh đã rời lớp).
- Người dùng thao tác lên tài nguyên của người khác qua ID đoán được (IDOR).
- Tự thao tác lên chính mình (principal tự thu hồi quyền, tự thay thế mình).

**Đầu vào ngoài tầm kiểm soát**
- AI trả về rỗng, sai định dạng, JSON hỏng, HTML thiếu thẻ đóng, vượt token.
- File upload: sai đuôi nhưng đúng magic byte và ngược lại, file 0 byte, Excel thiếu cột, ô rỗng, email trùng.
- Phân trang / sort với tham số ngoài miền.

**Giao dịch và tính nhất quán**
- Ghi DB thành công nhưng upload R2 fail (và ngược lại) — có rollback hay để lại rác.
- `@Transactional` có bao đúng phạm vi không; gọi AI/HTTP dài **bên trong** transaction là dấu hiệu xấu.
- Xoá cha còn con mồ côi (xoá lớp còn submission, xoá bài còn comment).

**Streaming / WebSocket**
- Client ngắt giữa chừng: server có dọn không, hay generate tiếp rồi ghi vào hư không.
- Người dùng bấm generate lần hai khi lần một chưa xong.
- Lỗi giữa stream: FE có nhận được tín hiệu lỗi hay treo spinner mãi.

**Frontend**
- API trả 4xx/5xx: có hiện lỗi hay nuốt im lặng.
- Trạng thái loading không bao giờ tắt khi request fail.
- Optimistic update không revert khi server từ chối.

---

## 3. Chia cụm

Sắp theo **rủi ro giảm dần**, không theo kích thước. Cụm càng đầu càng nhiều máy trạng thái —
đó là nơi alternative flow thiếu sẽ gây lỗi thật, chứ không phải CRUD thường.

Cột "Đầu mối" là những chỗ `after8_9.md` đã lộ dấu hiệu, dùng để đối chiếu xem lượt quét có bắt được không.

### Tier 1 — đã có dấu hiệu hở, quét trước

| # | Cụm | Path | Đầu mối đã biết |
| --- | --- | --- | --- |
| **R1** | Publish / duyệt nội dung | `be/.../service/library/` (521 loc, 6 file)<br>`presentation/controller/LibraryContentController.java`, `HubContentController.java`<br>`fe/app/library/`, `fe/app/hub-moderation/`, `fe/app/lesson-plan-approval/` | B2: `update()` sửa thẳng bản APPROVED đang public; trạng thái SUBMITTED không khoá sửa; `unsubmit()` chỉ đổi status |
| **R2** | Tài khoản & vòng đời nhân sự | `be/.../service/auth/` (1135 loc, 9 file)<br>`PrincipalController.java`, `ModeratorController.java`, `ItStaffController.java`, `UserController.java`<br>`fe/app/user-management/` (871 loc), `fe/app/it-staff/` | B3: `PrincipalItStaffService.add()` không kiểm tra BR-41; `disable()` thu hồi không cần người thay → có thể về 0 IT Staff active |
| **R3** | Weekly Task nộp / chấm | `be/.../service/weeklytask/` (604 loc)<br>`WeeklyTaskController.java`<br>`fe/app/weekly-schedule/` (927 loc), `fe/components/weeklytask/` | B1: `unsubmit()` chỉ đổi `reviewStatus`, không báo moderator. Cùng họ máy trạng thái với R1 |

### Tier 2 — bề mặt rộng, đầu vào không kiểm soát được

| # | Cụm | Path | Trọng tâm |
| --- | --- | --- | --- |
| **R4** | Lớp học & import danh sách | `be/.../service/classroom/` (1784 loc, 8 file)<br>`ClassController.java`<br>`fe/components/classroom/` (4348 loc) | Parse Excel (BR-38 đã lệch cột), email trùng, học sinh rời lớp còn submission, quyền theo vai trò trong lớp |
| **R5** | Sinh giáo án (streaming) | `be/.../service/lessonplan/` (1581 loc)<br>`LessonPlanController.java`<br>`fe/lib/ws/`, `fe/components/LessonEditor/` (4470 loc) | AI rỗng/hỏng, client ngắt STOMP, generate chồng, autosave (BR-19 chưa có) |
| **R6** | Sinh slide & thiết kế slide | `be/.../service/slides/` (2063) + `service/slidedesign/` (1573)<br>`SlideController.java`, `SlideDesignController.java`<br>`fe/lib/slide-create/`, `fe/components/outline-editor/` | Cụm backend lớn nhất — **quét làm 2 lượt**, `slides/` trước rồi `slidedesign/`. HTML AI trả về không hợp lệ |

### Tier 3 — nhỏ hơn nhưng có điểm chạm hạ tầng

| # | Cụm | Path | Trọng tâm |
| --- | --- | --- | --- |
| **R7** | Blog & bình luận | `be/.../service/blog/` (564 loc, 5 file)<br>`BlogController.java`<br>`fe/components/blog/` (1471 loc), `fe/app/blog/moderation/` | B1: `hideByPostAuthor()` không báo tác giả. Sanitizer HTML, xoá bài còn comment |
| **R8** | Đề kiểm tra & xuất tài liệu | `be/.../service/practiceexam/` (631) + `service/documentexport/` (330)<br>`PracticeExamController.java`, `DocumentExportController.java`<br>`fe/components/dashboard/PracticeExam*` | Render PDF fail giữa chừng, đề rỗng, ký tự đặc biệt/công thức, timeout |
| **R9** | Upload / R2 / mô phỏng / phân tử | `be/.../service/upload/` (59) + `physicssimulation/` (191) + `molecule/` (234)<br>`UploadController.java`, `PhysicsSimulationController.java`<br>`fe/app/mo-phong-vat-ly/` (1652 loc) | Ghi DB vs upload R2 lệch nhau để lại rác; giới hạn 10 MB; AI edit mô phỏng trả code hỏng |
| **R10** | Thông báo / nhật ký / thống kê | `be/.../service/notification/` (278) + `activitylog/` (104) + `statistics/` (288)<br>`NotificationController.java`, `ActivityLogController.java`, hai `*StatisticsController.java`<br>`fe/app/notifications/`, `fe/app/statistics/` | Gửi noti cho user đã bị vô hiệu hoá; đếm thống kê lệch khi soft-delete; log ghi fail có nuốt lỗi chính không |

### Ngoài phạm vi

- `fe/components/simulations/` (46k loc, 250 file) — kernel vật lý thuần, đã có Vitest, không có
  máy trạng thái nghiệp vụ. Quét ở đây sẽ toàn finding về số học, loãng. Nếu cần thì chạy riêng
  `npm test` thay vì `/code-review`.
- `fe/components/periodic-table/`, `fe/lib/sandbox/` — dữ liệu tĩnh và công cụ dev, không nằm trong
  luồng nghiệp vụ.
- `fe/components/slide-editor/` (8902 loc) — logic chuyển đổi đã có Vitest phủ; chỉ quét nếu R6 lộ
  ra vấn đề ở ranh giới backend↔editor.

---

## 4. Thứ tự và cách ghi kết quả

Chạy tuần tự R1 → R10, **không chạy song song**: finding của cụm trước hay đổi cách đọc cụm sau
(ví dụ nếu R1 cho thấy quyền chỉ kiểm ở controller, thì R2–R10 phải soi riêng điểm đó).

Sau mỗi cụm, ghi vào `review/findings-R<N>.md` theo mẫu:

```markdown
# R<N> — <tên cụm>

Quét ngày <date>, `/code-review <level> <paths>`

| # | File:line | Vấn đề | Kịch bản lỗi | Mức | Xử lý |
| --- | --- | --- | --- | --- | --- |
| 1 | `X.java:42` | ... | Người dùng làm A rồi B → ... | Cao/TB/Thấp | Sửa / Bỏ qua (lý do) / Chuyển sang SRS |
```

Cột **Xử lý** quan trọng: không phải finding nào cũng phải sửa. Ba kết cục hợp lệ là *sửa*,
*bỏ qua có lý do ghi lại*, và *thực ra là SRS sai chứ không phải code sai* (nhóm này gộp vào mục C
của `after8_9.md`).

Cập nhật bảng tiến độ dưới đây sau mỗi lượt.

---

## 5. Tiến độ

| Cụm | Trạng thái | Mức đã chạy | Số finding | File kết quả |
| --- | --- | --- | --- | --- |
| R1 Publish / duyệt | **Xong** | đọc tay + `high` | 19 (7 Cao) | [findings-R1.md](findings-R1.md) |
| R2 Tài khoản | **Xong** | đọc tay + `high` | 14 (7 Cao) | [findings-R2.md](findings-R2.md) |
| R3 Weekly Task | **Xong** | đọc tay + `high` | 11 (5 Cao) | [findings-R3.md](findings-R3.md) |
| R4 Lớp học | **Xong** | đọc tay + `high` | 15 (5 Cao) | [findings-R4.md](findings-R4.md) |
| R5 Giáo án | Chưa chạy | — | — | — |
| R6 Slide | Chưa chạy | — | — | — |
| R7 Blog | **Xong** | Đọc tay | 9 (3 Cao) | [findings-R7.md](findings-R7.md) |
| R8 Đề kiểm tra | **Xong** | Đọc tay | 8 (5 Cao) | [findings-R8.md](findings-R8.md) |
| R9 Upload | **Xong** | Đọc tay | 7 (4 Cao) | [findings-R9.md](findings-R9.md) |
| R10 Thông báo | **Xong** | Đọc tay | 7 (4 Cao) | [findings-R10.md](findings-R10.md) |
