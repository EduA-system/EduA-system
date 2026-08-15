# Kịch bản demo EDUA

Tài liệu cầm tay khi demo trước hội đồng. Mọi route, ràng buộc và quy tắc nghiệp vụ trong file này được đối chiếu trực tiếp với code (`fe/lib/auth/permissions.ts`, `app/weekly-schedule/page.tsx`, `be/.../WeeklyTaskService.java`, `be/.../MoleculeService.java`, `designs/weekly-task/grade-scoped-deadline-and-review.md`, `WBS_CHECKLIST.md`).

Bổ trợ cho `outline.md` (nội dung thuyết trình); file này chỉ lo phần **bấm gì, nói gì, theo thứ tự nào**.

---

## 1. Ngân sách thời gian

Hội đồng cho **~60 phút**.

| Phần | Thời lượng |
| --- | --- |
| Slide: bối cảnh, giải pháp, kiến trúc AI, kiến trúc hệ thống | 15 phút |
| **Demo — Phần A: luồng chính** | **18 phút** |
| **Demo — Phần B: các luồng bao quanh** | **12 phút** |
| **Demo — Phần C: quản trị và số liệu** | **3 phút** |
| Kiểm thử, giới hạn, hướng phát triển (slide) | 3 phút |
| Hỏi đáp | 9 phút |

Lưu ý khi nói slide: **mục IV của `outline.md`** (quy trình phê duyệt giáo án tuần, Teacher AI Pipeline, pipeline slide) trùng với những gì demo cho xem tận mắt. Cắt mục IV xuống một câu chuyển tiếp — *"phần quy trình nghiệp vụ và pipeline, chúng tôi xin trình bày trực tiếp trên hệ thống"* — vừa tiết kiệm 4 phút vừa giữ được bất ngờ cho demo.

---

## 2. Cách kể: một luồng chính, các luồng bao quanh

### 2.1. Luồng chính — thứ hệ thống sinh ra để làm

> **Tạo giáo án → Tạo slide → Tạo đề kiểm tra**

Đây là bộ ba học liệu cho một tiết dạy, và là phần chiếm gần hết thời gian demo. Toàn bộ giá trị cốt lõi của EDUA nằm ở đây: giáo viên đi từ một bài trong SGK ra đủ bộ học liệu, trong vài phút thay vì vài giờ.

Câu mở đầu Phần A nên nói thẳng ý này:

> "Một tiết dạy cần ba thứ: giáo án, slide trình chiếu, và đề kiểm tra. Chúng tôi sẽ làm cả ba, bắt đầu từ đúng một bài trong sách giáo khoa."

### 2.2. Các luồng bao quanh — thứ khiến nó dùng được trong trường

Sau khi bộ ba đã có, mới nói tới hệ sinh thái quanh nó, theo đúng thứ tự này:

| Thứ tự | Luồng | Trả lời câu hỏi |
| --- | --- | --- |
| B1 | **Duyệt giáo án tuần** | Ai kiểm soát chất lượng trước khi lên lớp? |
| B2 | **Lớp học** | Học liệu đến tay học sinh bằng cách nào? |
| B3 | **Cộng đồng (Hub)** | Giáo viên chia sẻ cho nhau thế nào? |
| B4 | **Thư viện** | Học liệu được lưu và quản lý ở đâu? |
| B5 | **Blog** | Trao đổi chuyên môn ngoài học liệu? |

Câu chuyển tiếp giữa Phần A và Phần B:

> "Đến đây bộ học liệu đã xong. Nhưng một hệ thống dùng được trong trường thì không dừng ở chỗ tạo ra nội dung — nó phải trả lời được: ai duyệt, đến tay học sinh thế nào, và giáo viên chia sẻ cho nhau ra sao."

### 2.3. Bài được chọn — dùng thống nhất từ đầu đến cuối

| Trường | Giá trị |
| --- | --- |
| Môn | Hóa học |
| Sách | **Hoá học 11** (Kết nối tri thức) |
| Khối | **11** |
| Chương | **HYDROCARBON** (chương 4) |
| Bài | **Arene (Hydrocarbon thơm)** |
| Trang SGK | 103–111 (8 trang) |
| Phân tử chèn mô phỏng | **benzene**, **toluene** |

Cả ba học liệu ở Phần A đều dựng từ đúng bài này, và Phần B cũng xoay quanh chính nó. Đừng đổi bài giữa chừng — mạch chuyện đứt ngay.

**Lý do chọn:** vòng benzene là phân tử đẹp nhất để quay 3D lúc trình chiếu, bài đủ dài (8 trang) để giáo án AI sinh ra dày dặn, và có công thức cấu tạo để khoe khả năng hiển thị công thức.

---

## 3. Chuẩn bị trước khi lên bục

### 3.1. Tài khoản

| Vai | Dùng ở | Lưu ý bắt buộc |
| --- | --- | --- |
| Teacher | A, B2–B5 | Môn **Hóa học**, **phải có khối 11** trong danh sách khối dạy |
| Moderator | B1 | Môn **Hóa học** — cùng môn với Teacher thì mới giao và duyệt được |
| Student | B2 | Đã có trong lớp demo |
| Principal | C1 | |
| IT Staff | C2 | |

Mở sẵn mỗi vai ở một **cửa sổ/profile trình duyệt riêng**, đăng nhập từ trước. Chuyển vai bằng cách đổi cửa sổ, tuyệt đối không đăng xuất/đăng nhập lại giữa demo.

### 3.2. Dữ liệu phải seed sẵn

- [ ] ⚠ **Thử sinh giáo án bài Arene ít nhất một lần trước ngày demo** — xem bẫy 5. Việc quan trọng nhất trong danh sách.
- [ ] **Thử chèn phân tử benzene vào slide** để chắc chắn AI dựng được vòng 6 cạnh — xem bẫy 6.
- [ ] Thư viện của Teacher có sẵn **1 giáo án Arene** và **1 slide deck Arene** hoàn chỉnh để dự phòng khi AI chạy chậm.
- [ ] Tổ bộ môn Hóa có **ít nhất 3 giáo viên**, đều có khối 11, trong đó **1 người dạy 2 khối** — để minh họa quy tắc số 1 ở mục 4.
- [ ] Lớp học demo đã có **ít nhất 1 học sinh**.
- [ ] Community Hub đã có **vài học liệu đã duyệt** để trang không trống.
- [ ] Blog đã có **vài bài viết**.
- [ ] Vài tuần trước đó có dữ liệu nộp/duyệt để màn **Thống kê** không trống trơn.
- [ ] **Chưa** giao bài Arene cho tuần hiện tại — sẽ giao trực tiếp trên sân khấu ở B1.

### 3.3. Kỹ thuật

- [ ] Backend + frontend chạy ổn định (`pwsh scripts/start.ps1`), `/api/health` trả `UP`.
- [ ] Trình duyệt hỗ trợ **WebGL 2.0** (mô phỏng 3D và phân tử cần).
- [ ] Zoom trình duyệt ~110–125%.
- [ ] Tắt thông báo hệ thống, đóng tab thừa.
- [ ] Nếu máy chiếu tỉ lệ 4:3, kiểm tra trước màn trình chiếu và mô phỏng không bị cắt.

### 3.4. Đạo cụ cho màn đối chiếu SGK (bước A3)

**Repo chỉ có PDF sách Vật lý** (`sach_giao_khoa_vat_ly/`), **không có SGK Hóa**. Phải tự chuẩn bị:

- [ ] **SGK Hoá học 11 (Kết nối tri thức)** — sách giấy đánh dấu sẵn trang 103, hoặc PDF mở sẵn đúng trang.
- [ ] Nếu dùng PDF: mở ở **nửa màn hình bên phải**, trình duyệt nửa trái, để hội đồng thấy cả hai cùng lúc.
- [ ] Nếu dùng sách giấy: đánh dấu sẵn **khung "Yêu cầu cần đạt"** đầu bài và **hình cấu tạo vòng benzene**.
- [ ] Đọc trước bài Arene một lượt. Đối chiếu chỉ thuyết phục khi bạn biết trước trong sách có gì.

---

## 4. Nghiệp vụ giao bài theo tuần — nền cho phần B1

Đây là phần hội đồng đã yêu cầu bổ sung ở lần bảo vệ trước, nên sẽ bị hỏi sâu. Nắm chắc 8 quy tắc dưới đây thì trả lời được gần hết.

### 4.1. Bài toán thực tế

Ở trường THPT, tổ chuyên môn phải thống nhất tiến độ dạy: tuần này cả khối dạy bài nào, ai soạn giáo án bài đó, nộp trước khi nào để tổ trưởng còn góp ý. Trước đây việc này chạy bằng file Excel dùng chung và tin nhắn Zalo — **không ai biết chính xác ai đã nộp, ai chưa, và bản giáo án đang dùng là bản nào**.

### 4.2. Tám quy tắc nghiệp vụ

**1. Mỗi nhiệm vụ gắn đúng một khối.**
Nhiệm vụ thuộc về đúng một khối trong 10/11/12. Tổ trưởng chỉ giao được cho giáo viên có khối đó trong danh sách khối họ dạy. **Giáo viên dạy hai khối nhận hai nhiệm vụ độc lập, nộp hai lần** — vì hai khối có tiến độ và nội dung khác nhau.

**2. Giao một lần, hệ thống tự tỏa xuống cả tổ.**
Tổ trưởng chọn bài rồi bấm giao **một lần duy nhất**; hệ thống tự tạo nhiệm vụ riêng cho từng giáo viên đang hoạt động, cùng môn, cùng khối. Tổ có 8 giáo viên thì không phải nhắn 8 lần.

**3. Đơn vị giao là một Bài lấy từ danh mục SGK, không phải mô tả tự do.**
Chọn Chương và Bài qua hai dropdown liên động. Tên chương/tên bài do **máy chủ tự tra và ghi lại**, không tin dữ liệu trình duyệt gửi lên. Nhờ vậy về sau đối chiếu và thống kê được theo chương/bài.

**4. Tối đa 2 bài mỗi tuần cho mỗi cặp (môn, khối), không trùng bài.**
Khớp thực tế phân phối chương trình, và giữ lưới lịch gọn đúng 2 ô mỗi tuần.

**5. Hạn nộp không ai nhập tay.**
Hệ thống tự tính **23:59:59 Chủ Nhật của chính tuần đó, giờ Việt Nam**, **không nhận giá trị từ trình duyệt**. Tổ trưởng không có ô nhập, chỉ thấy dòng hiển thị. Chống mỗi nhiệm vụ một hạn, và chống sửa hạn từ phía client.

**6. Tuần nộp không phải tuần dạy.**
Tuần trên lịch là **tuần nộp**; bài được **dạy vào tuần liền sau**, giao diện hiện tuần dạy trong ngoặc. Ý nghĩa: **giáo án phải được duyệt xong trước khi giáo viên bước vào lớp**.

**7. Giáo viên vào tổ giữa chừng được cấp bù.**
Khi giáo viên được thêm mới, khôi phục, hoặc bổ sung khối dạy, hệ thống tự cấp các nhiệm vụ còn hạn của tuần hiện tại khớp môn và khối mới. Không cấp lại nhiệm vụ quá hạn, không tạo trùng.

**8. Hai chốt khóa.**
Chỉ giao được cho **tuần hiện tại và tương lai** — tuần đã kết thúc chuyển sang chỉ đọc. Và **khi đã có giáo án được duyệt trong cụm, cụm đó không sửa được nữa**.

### 4.3. Điểm dễ bị hỏi vặn

*"Trạng thái giáo án trên Thư viện và trạng thái nộp cho tổ trưởng có phải là một không?"*

**Không.** Hai trạng thái độc lập, cố ý tách rời:

| Trạng thái | Ý nghĩa | Ai duyệt |
| --- | --- | --- |
| Nộp giáo án tuần | Nộp cho tổ trưởng trước khi lên lớp — **bắt buộc** | Tổ trưởng chuyên môn |
| Đăng lên Hub cộng đồng | Chia sẻ rộng cho giáo viên khác — **tùy chọn** | Kiểm duyệt viên Hub |

Một giáo án có thể được tổ trưởng duyệt mà không bao giờ đăng lên Hub, và ngược lại.

---

# PHẦN A — LUỒNG CHÍNH: BỘ BA HỌC LIỆU AI (~18 phút)

Ký hiệu ★ = đoạn không được cắt.

**Vai dùng suốt Phần A: Teacher.**

Mở đầu bằng câu ở mục 2.1, rồi vào thẳng.

---

## A1. Chọn bài từ SGK (~1,5 phút)

**Route:** `/lesson-create`

Chọn **Hóa học → Hoá học 11 → HYDROCARBON → Arene (Hydrocarbon thơm)**.

Gõ thêm yêu cầu riêng, ví dụ: *"nhấn mạnh cấu trúc vòng benzene và tính thơm, thêm một hoạt động cho học sinh quan sát mô hình phân tử"* — câu này nối đẹp sang phần chèn mô phỏng ở A7.

**Đây là chỗ nói về Textbook Grounding:**

> "Hệ thống không để AI tự bịa nội dung. Chúng tôi đã chuẩn hóa SGK Kết nối tri thức thành cấu trúc sách → chương → bài, mỗi bài có một khối tri thức cốt lõi lưu riêng: yêu cầu cần đạt, các đề mục, khái niệm, công thức, ví dụ, và cả chú thích hình theo đúng số hiệu trong sách. Khi giáo viên chọn bài, đúng phần tri thức đó được nạp làm ngữ cảnh cho AI."

Đừng nói dài — bằng chứng nằm ở A3, để dành.

---

## A2. Giáo án chảy về theo thời gian thực ★ (~2 phút)

**Route:** `/lesson-edit`

Bấm tạo. Màn hình chuyển ngay sang trình soạn thảo, **nội dung xuất hiện dần từng phần**.

> "Backend trả về ngay lập tức chứ không giữ request. Tiến trình sinh bài được đẩy về trình duyệt qua WebSocket. Giáo viên thấy bài hình thành dần thay vì ngồi nhìn vòng xoay hai phút rồi có nguy cơ hết thời gian chờ."

Chỉ vào cấu trúc giáo án đang hình thành: **I. Mục tiêu → II. Thiết bị dạy học và học liệu → III. Tiến trình dạy học** theo Công văn 5512.

Nếu một hoạt động sinh lỗi, hệ thống tự chuyển thành đề mục trống kèm ghi chú *"Mời soạn tay"* — nhắc như một điểm thiết kế chịu lỗi, không giấu.

---

## A3. Đối chiếu giáo án với SGK thật ★★ (~3 phút)

**Đạo cụ:** SGK Hoá học 11 mở sẵn trang 103–111

Đây là đoạn biến câu *"AI bám sát SGK"* từ lời hứa thành bằng chứng kiểm chứng được ngay tại chỗ. **Đặt SGK cạnh màn hình**, rồi chỉ từng cặp.

**Vì sao đối chiếu ngay lúc này, trước khi sửa gì:** giáo án đang ở trạng thái AI vừa sinh, chưa có bàn tay giáo viên chạm vào. Sửa trước rồi mới đối chiếu thì hội đồng không phân biệt được đâu là AI làm đúng, đâu là giáo viên chữa lại.

### Bốn cặp nên chỉ

**Cặp 1 — Yêu cầu cần đạt.** Khung *"Yêu cầu cần đạt"* đầu bài trong SGK ↔ phần **I. MỤC TIÊU → Kiến thức**.

> "Mục tiêu về kiến thức không phải AI tự nghĩ ra, mà dựng từ đúng yêu cầu cần đạt in ở đầu bài."

**Cặp 2 — Đề mục lớn.** Các đề mục La Mã của bài Arene trong SGK ↔ **dàn ý hoạt động phần III**.

> "Trình tự hoạt động dạy học bám đúng trình tự đề mục trong sách, nên giáo viên không bị lệch mạch so với sách học sinh đang cầm."

**Cặp 3 — Công thức.** Công thức phân tử benzene, công thức cấu tạo vòng 6 cạnh, phản ứng thế ↔ công thức trong giáo án.

> "Công thức hiển thị bằng LaTeX chứ không phải chữ thường, nên in ra hay xuất PDF đều đúng chuẩn ký hiệu."

**Cặp 4 — Hình minh họa.** Dữ liệu số hóa lưu cả **chú thích hình theo đúng số hiệu trong sách**. Nếu giáo án nhắc tới hình nào, lật đúng hình đó.

> "Đến hình minh họa cũng đánh số theo đúng sách, nên khi giáo viên bảo học sinh mở hình nào thì đó là hình có thật, đúng số."

### Câu chốt

> "Thầy cô có thể kiểm tra bất kỳ mục nào trong giáo án này ngược lại sách. Đó là khác biệt giữa một trợ lý soạn bài bám chương trình và một công cụ sinh văn bản chung chung."

### Nếu có chỗ lệch

Đừng giấu, đừng chống chế:

> "Chỗ này AI diễn đạt rộng hơn sách. Đây đúng là lý do quy trình của chúng tôi bắt buộc có hai lớp rà: giáo viên duyệt từng mục, và tổ trưởng duyệt giáo án trước khi lên lớp."

Một chỗ lệch xử lý bình tĩnh ăn điểm hơn một demo trơn tru mà hội đồng nghi là dàn dựng.

---

## A4. AI sửa bài, giáo viên quyết định ★★ (~3,5 phút)

**Route:** `/lesson-edit` (khung chat)

Ra lệnh sửa: *"viết lại phần Luyện tập ngắn hơn và thêm một bài tập về phản ứng thế của benzene"*. AI trả về **diff inline**, mỗi mục một thẻ **Chấp nhận / Bỏ qua** riêng.

Làm đủ ba việc: **chấp nhận một thẻ**, **bỏ qua một thẻ**, rồi ra lệnh thứ hai chạm nhiều mục cùng lúc.

> "AI đề xuất, giáo viên duyệt cuối. Không có chuyện AI tự ghi đè bài giảng. Một lệnh có thể chạm nhiều mục, và mỗi mục được chấp nhận hay loại bỏ độc lập."

**Nếu bị hỏi sâu kỹ thuật:** luồng này tách hai bước AI — một bước chỉ để chọn đúng mục cần sửa (chỉ nhìn mã, tiêu đề, loại mục, không nhìn nội dung), sau đó mới gọi song song từng mục để viết nội dung. Tách vậy để giảm hẳn việc AI sửa nhầm mục.

**Kết thúc bước này: bấm lưu vào Thư viện.** Nói ngắn một câu, phần thư viện đầy đủ để dành B4:

> "Giáo án được lưu vào thư viện cá nhân. Lát nữa chúng tôi sẽ quay lại đây."

---

## A5. Tạo outline slide — 2 pha (~1,5 phút)

**Route:** `/slide-create` → `/slide-create/outline`

Chuyển ý:

> "Giáo án xong. Nhưng lên lớp thì giáo viên cần slide, và đây là phần tốn thời gian nhất khi soạn tay."

> "Sinh slide không làm một phát. Pha một dựng khung bài trình chiếu, pha hai sinh chi tiết từng slide. Nhờ vậy giáo viên theo dõi được tiến trình và chỉ cần sinh lại đúng phần bị lỗi, không phải làm lại cả bộ."

Sửa vài mục trong outline để cho thấy khung vẫn do giáo viên nắm.

---

## A6. Dựng và biên tập slide (~2 phút)

**Route:** `/slide-maker`

> "Ba bước: AI tạo phong cách chung cho cả bộ — nền, bảng màu, vùng tiêu đề. Sau đó thuật toán bố cục phía trình duyệt tự sắp xếp theo loại slide và độ dày nội dung, không phụ thuộc template cứng. Cuối cùng AI mới điền nội dung vào từng ô."

Thao tác nhanh: kéo-thả, đổi thuộc tính, rồi **chèn phân tử benzene**.

**Cách nhập phân tử — có bẫy:** gõ **`benzene`** (tên), **không gõ `C6H6`** (công thức). Lý do ở bẫy 6. Phân tử thứ hai nếu muốn: `toluene`.

---

## A7. Trình chiếu và mô phỏng ★★ (~2 phút)

**Route:** `/slide-present`

Trình chiếu toàn màn hình, tới slide có benzene, bấm **"Nhấn để mô phỏng"**, rồi **xoay vòng benzene** bằng chuột.

> "Mô phỏng không tự chạy nền — nó chỉ khởi động khi giáo viên chủ động bấm trong lúc giảng, để không ngốn tài nguyên máy suốt buổi."

Nói ngay khi đang xoay phân tử — đây là chỗ chốt lại bài toán ban đầu:

> "Cấu trúc vòng benzene là thứ học sinh phải tưởng tượng từ một hình vẽ phẳng trong sách. Ở đây các em xoay được nó, nhìn được góc liên kết và tính phẳng của vòng. Đây chính là vấn đề chúng tôi đặt ra từ đầu: trường thiếu thiết bị, còn nhiều khái niệm hoá học thì trừu tượng, không có gì để sờ vào."

Nếu còn thời gian: xuất bộ slide ra **HTML chạy offline**.

> "Nhiều phòng học không có mạng ổn định. Bộ slide xuất ra chạy được offline, kèm điều khiển trình chiếu."

---

## A8. Tạo đề kiểm tra *(tùy chọn)* (~2,5 phút)

**Route:** `/exam-create-new`

Chuyển ý:

> "Món thứ ba của một tiết dạy: đề kiểm tra. Cũng từ đúng bài vừa rồi."

Đây là **trình tạo 3 bước**, đi nhanh qua từng bước:

1. **Thông tin chung** — tên đề, môn, lớp, thời lượng, **độ khó** (Dễ / Trung bình / Khó), mục tiêu riêng nếu có.
2. **Phạm vi kiến thức** — chọn sách và **các bài** được ra đề. Chọn đúng bài Arene.
3. **Cấu hình câu hỏi** — số câu theo từng loại và điểm từng phần.

> "Giáo viên khai báo ma trận đề: phạm vi bài, số câu mỗi loại, thang điểm. Hệ thống kiểm tra cấu hình có khả thi không trước khi gọi AI — tránh việc yêu cầu 40 câu khó từ một bài chỉ có vài đơn vị kiến thức."

Bấm sinh → sang `/exam-edit-new`, biên tập bằng trình soạn thảo giống giáo án, lưu vào Thư viện dưới dạng **Bài kiểm tra**.

**Đây là bước cắt đầu tiên khi thiếu thời gian** — nói bằng lời và mở sẵn một đề đã tạo cũng đủ.

⚠ **Không bấm xuất đề ra Word/PDF** — chưa làm, xem mục 7.

---

## Chốt Phần A

> "Từ một bài trong sách, trong khoảng thời gian vừa rồi, giáo viên đã có giáo án theo đúng khung 5512, bộ slide có mô phỏng tương tác, và đề kiểm tra. Soạn tay thì đây là công việc của một buổi tối."

---

# PHẦN B — CÁC LUỒNG BAO QUANH (~12 phút)

Mở đầu bằng câu chuyển tiếp ở mục 2.2.

---

## B1. Duyệt giáo án tuần ★★★ (~6 phút)

Luồng dài nhất Phần B, và là phần trả lời trực tiếp góp ý của hội đồng lần trước. Chia làm bốn nhịp.

### Nhịp 1 — Tổ trưởng giao bài (~2,5 phút)

**Route:** `/weekly-schedule` · **Vai: Moderator** (đổi cửa sổ)

> "Trong thực tế, giáo viên không tự chọn tuần này soạn bài gì. Tổ chuyên môn phân công."

Thao tác theo thứ tự:

1. **Chọn khối 11** → lịch luôn gắn với đúng một khối.
2. Chỉ vào **lưới lịch theo tuần thực** (Thứ Hai → Chủ Nhật), mỗi tuần đúng **2 ô**.
3. Chỉ vào nhãn tuần: *"Lịch nộp"*, trong ngoặc là *"lịch dạy thực tế"* tuần sau.
4. Bấm ô trống **"Ấn để thêm bài thứ nhất"**.
5. Nhập **Tiêu đề**, chọn chương **HYDROCARBON**, chọn bài **Arene (Hydrocarbon thơm)**.
6. Chỉ vào **dòng hạn nộp** — hiển thị sẵn, không có ô nhập.
7. Bấm giao → lưới hiện thẻ nhiệm vụ với bộ đếm **0/N đã nộp**.

Bốn câu cần nói, theo đúng 4 quy tắc quan trọng nhất:

> "Thứ nhất — đơn vị giao không phải dòng mô tả gõ tay, mà là một Bài chọn từ chính danh mục SGK trong hệ thống."

> "Thứ hai — tôi chỉ bấm giao một lần, nhưng hệ thống tạo nhiệm vụ riêng cho từng giáo viên dạy khối này. Tổ bao nhiêu người thì bấy nhiêu nhiệm vụ độc lập."

> "Thứ ba — không ai nhập hạn nộp. Hệ thống chốt cứng 23:59 Chủ Nhật của tuần đó, do máy chủ tính chứ không nhận từ trình duyệt."

> "Thứ tư — tuần trên lịch này là tuần nộp, bài được dạy tuần sau. Để giáo án được duyệt xong trước khi giáo viên bước vào lớp."

### Nhịp 2 — Giáo viên nộp (~1 phút)

**Route:** `/notifications` → `/weekly-schedule` · **Vai: Teacher**

Chuông đã có số: *"Lịch tuần mới — bạn được giao soạn…"*. Bấm vào là nhảy tới lịch.

Mở ô tuần hiện tại, bấm nộp — hộp thoại **lọc sẵn đúng giáo án khớp khối/môn/chương được giao**, chính là giáo án Arene vừa tạo ở Phần A.

> "Danh sách được lọc sẵn theo đúng bài được giao, giáo viên không phải bới giữa toàn bộ thư viện. Và giáo án nộp lên đây chính là bản chúng ta vừa soạn lúc nãy."

### Nhịp 3 — Tổ trưởng duyệt (~1,5 phút)

**Route:** `/lesson-plan-approval` · **Vai: Moderator**

Chỉ vào **bộ lọc theo khối, chương, bài**. Mở giáo án vừa nộp, đọc nội dung ngay trong màn duyệt.

> "Phạm vi duyệt giới hạn theo môn: tổ trưởng chỉ thấy giáo án thuộc tổ mình. Khi cả tổ nộp cùng lúc, bộ lọc theo chương và bài giúp duyệt gọn theo từng bài."

**Hay hơn nếu còn thời gian:** bấm **Từ chối kèm lý do** trước, cho thấy giáo viên nhận thông báo và sửa lại được, rồi mới duyệt ở lần nộp thứ hai. Chứng minh quy trình là vòng lặp thật, không phải nút duyệt hình thức.

### Nhịp 4 — Thông báo realtime ★★★ (~1 phút)

**Chuẩn bị:** đặt hai cửa sổ Teacher và Moderator **cạnh nhau trên cùng màn hình** trước khi bấm duyệt.

Ngay khi Moderator bấm duyệt, **chuông đỏ bên cửa sổ Teacher nhảy số tức thì**, không cần tải lại trang.

Khoảnh khắc gây ấn tượng rẻ nhất và chắc chắn nhất trong toàn bộ demo — **tuyệt đối đừng bỏ**.

Quay lại lịch ở vai Moderator: bộ đếm đổi thành **N/N đã nộp**.

> "Tổ trưởng nhìn một màn hình là biết cả tổ tuần này ai đã nộp, ai chưa, bài nào đã duyệt — thay cho việc dò file Excel và tin nhắn."

---

## B2. Lớp học (~3 phút)

### Giáo viên giao tài nguyên và bài tập (~1 phút)

**Route:** `/class-detail` · **Vai: Teacher**

Đăng slide Arene vừa dựng thành tài nguyên lớp, rồi tạo một bài tập có **hạn nộp**.

> "Học liệu vừa làm đi thẳng vào lớp, không phải tải xuống rồi gửi qua Zalo."

### Học sinh nộp bài (~1,5 phút)

**Route:** `/list-class` → `/detail-resource` · **Vai: Student** (đổi cửa sổ)

Mở tài nguyên, nộp bài kèm tệp đính kèm.

> "Hệ thống phân biệt nộp đúng hạn và nộp trễ. Học sinh có thể thu hồi và nộp lại trước hạn."

### Giáo viên xem bài nộp (~30 giây)

**Route:** `/class-detail/assignments/submissions` · **Vai: Teacher**

Danh sách bài nộp cả lớp, mở chi tiết một bài.

---

## B3. Cộng đồng — Community Hub (~1,5 phút)

**Route:** `/community-hub` · **Vai: Teacher**

> "Đến đây là chuyện chia sẻ giữa giáo viên với nhau, vượt ra ngoài phạm vi một trường."

Cho xem danh sách học liệu đã duyệt, mở một cái ra. Chỉ ba việc:

- **Tùy biến** — sao chép học liệu của người khác thành bản riêng của mình để sửa.
- **Bình luận** — trao đổi ngay dưới học liệu.
- **Báo cáo** — báo nội dung vi phạm.

> "Học liệu lên Hub phải qua kiểm duyệt viên duyệt, và đây là luồng tùy chọn — hoàn toàn tách khỏi việc nộp giáo án cho tổ trưởng lúc nãy."

Nhắc lại ý mục 4.3 nếu hội đồng có vẻ lẫn hai luồng duyệt.

---

## B4. Thư viện cá nhân (~1 phút)

**Route:** `/library` · **Vai: Teacher**

Quay lại nơi mọi thứ được lưu.

> "Đây là nơi mọi học liệu hội tụ: giáo án, slide, đề kiểm tra, mô phỏng — tất cả những gì chúng ta vừa tạo ở phần đầu đều nằm ở đây."

Chỉ vào **badge 4 trạng thái**: Nháp / Chờ duyệt / Đã duyệt / Từ chối. Giáo án Arene giờ hiện **Đã duyệt** sau khi tổ trưởng duyệt ở B1.

Chỉ thêm: tìm kiếm, mở lại để sửa tiếp, và nút **gửi duyệt lên Hub**.

---

## B5. Blog (~1 phút)

**Route:** `/blog` · **Vai: Teacher**

> "Cuối cùng là kênh trao đổi chuyên môn ngoài học liệu — kinh nghiệm dạy, phương pháp, tình huống lớp học."

Lướt danh sách bài, mở một bài. Nhắc ngắn: giáo viên tự viết và sửa bài của mình, kiểm duyệt viên gỡ bài vi phạm kèm lý do.

---

# PHẦN C — QUẢN TRỊ VÀ SỐ LIỆU (~3 phút)

## C1. Nhà trường nhìn toàn cảnh (~2 phút)

**Route:** `/statistics` · **Vai: Principal** (đổi cửa sổ)

Cho xem xu hướng nội dung AI theo tháng, nội dung theo môn, **trạng thái nhiệm vụ tuần**, tiến độ duyệt học liệu, tài khoản theo vai trò.

> "Toàn bộ thao tác của các vai vừa rồi đều quy về số liệu. Ban giám hiệu theo dõi được tiến độ chuyên môn của từng tổ — bao nhiêu giáo án đã nộp, bao nhiêu còn nợ — chứ hệ thống không chỉ là công cụ soạn bài lẻ tẻ."

Dừng đủ lâu để hội đồng đọc biểu đồ. Đây là chỗ chốt toàn bộ câu chuyện.

## C2. Vận hành hệ thống (~1 phút)

**Route:** `/it-staff`, `/it-staff/activity-log` · **Vai: IT Staff**

> "Câu lệnh điều khiển AI không bị chôn cứng trong mã nguồn — bộ phận kỹ thuật của trường sửa được mà không cần lập trình viên. Kèm nhật ký hoạt động phục vụ kiểm tra khi có sự cố."

---

## 6. Sáu cái bẫy trong code

### Bẫy 1 — Tài khoản bị khóa theo môn ⚠ nguy hiểm nhất

`fe/lib/auth/permissions.ts` giới hạn cứng:

| Route | Chỉ dành cho môn |
| --- | --- |
| `/mo-phong-vat-ly` | `PHYSICS` |
| `/molecules` | `CHEMISTRY` |
| `/periodic-table` | `CHEMISTRY` |

Kịch bản này chạy tài khoản **Hóa học**, nên `/mo-phong-vat-ly` **không vào được**. Kho mô phỏng dùng được là **phân tử 3D, bảng tuần hoàn, mô hình nguyên tử**.

**Đừng hứa trước là sẽ xem thí nghiệm vật lý.** Nếu bị hỏi: hệ thống có cả kho mô phỏng vật lý, nhưng tài khoản đang đăng nhập là giáo viên Hóa nên bị giới hạn theo đúng phân quyền — đây là tính năng, không phải lỗi.

### Bẫy 2 — Giáo viên chưa gán môn bị chặn tại route

Không phải nút mờ đi mà **chặn thẳng ở route kèm thông báo**. Kiểm tra tài khoản demo có môn **và khối 11** trước khi bắt đầu — thiếu khối 11 thì B1 hỏng hoàn toàn.

### Bẫy 3 — Nộp giáo án tuần chỉ chọn được từ Thư viện

Chức năng nộp chỉ nhận nội dung **có sẵn trong Thư viện**, không có tải tệp lên. Vì vậy **phải bấm lưu ở cuối A4**, nếu không thì đến B1 nhịp 2 sẽ không có gì để chọn.

Ngoài ra giao diện khóa giáo viên chỉ nộp được trong **tuần hiện tại** — nên B1 phải giao bài cho **đúng tuần diễn ra buổi bảo vệ**, không giao tuần tương lai.

### Bẫy 4 — AI chạy thật sẽ lâu

Ở A2: bấm sinh cho hội đồng thấy nội dung chảy về ~20 giây, rồi nói *"trong lúc chờ, tôi mở bản đã sinh sẵn"* và chuyển sang bản trong Thư viện.

Với slide ở A5–A6 cũng vậy, và với đề kiểm tra ở A8 càng nên — sinh đề gọi AI theo nhiều lô, có thể mất tới ba phút.

### Bẫy 5 — Bài chưa có nội dung số hóa thì sinh giáo án lỗi thẳng ⚠ rủi ro cao nhất

Khi sinh giáo án, hệ thống bắt buộc đọc được nội dung SGK số hóa của bài. Nếu bài **chưa có** dữ liệu này, luồng **ném lỗi ngay** — *"Bài học chưa có nội dung số hóa để sinh giáo án"* — không có phương án dự phòng.

Dữ liệu số hóa đi kèm repo **chỉ có môn Vật lý**. Dữ liệu Hóa nằm trong cơ sở dữ liệu dùng chung, nạp bằng đường khác, và **API danh mục không trả về trường này nên không kiểm tra được từ bên ngoài**.

**Bắt buộc làm trước ngày demo:** đăng nhập tài khoản Hóa, vào `/lesson-create`, chọn **Hoá học 11 → HYDROCARBON → Arene**, bấm sinh một lần.

- Chạy được → khóa bài này.
- Báo lỗi thiếu nội dung số hóa → **đổi bài ngay**, thử theo thứ tự: *Alkane* (cùng chương), *Hydrocarbon không no* (cùng chương), *Liên kết cộng hoá trị* (Hoá 10). Đổi sang Hoá 10 thì nhớ sửa khối trong toàn bộ kịch bản thành **10**.

### Bẫy 6 — Nhập `benzene`, đừng nhập `C6H6`

Khi dựng phân tử, nếu người dùng gõ **công thức hóa học**, hệ thống chạy thêm bước kiểm tra chặt: đếm nguyên tử nặng, suy số hydro từ bậc liên kết, rồi **so khớp chính xác với công thức đã gõ**. Sai là hỏng, kèm thông báo *"Bậc liên kết AI không khớp với công thức hoá học đã yêu cầu."*

Với benzene, vòng thơm phải được trả về dạng liên kết đơn–đôi xen kẽ mới ra đúng 6 hydro. Nếu AI trả về cả 6 liên kết đều là đơn — nhầm lẫn rất phổ biến với vòng thơm — ra 12 hydro và **yêu cầu bị từ chối ngay trước mặt hội đồng**.

Khi gõ **tên chất** (`benzene`), bước kiểm tra đó **không chạy**, nên phân tử luôn dựng được.

**Luôn gõ `benzene`, `toluene` — tuyệt đối không gõ `C6H6`.** Vẫn phải thử trước ít nhất một lần vì đây là đường AI thật (chỉ vài phân tử hai nguyên tử như H₂, N₂, O₂, Cl₂ mới dựng sẵn không cần AI).

**Đừng thử naphthalene** (hai vòng gắn nhau) trên sân khấu, dù bài Arene có nhắc tới nó.

---

## 7. Không đụng vào

Theo `WBS_CHECKLIST.md`, các phần sau chưa hoàn thiện:

- **Tạo giáo án từ tệp tải lên** — chỉ có luồng sinh từ SGK.
- **Xuất giáo án ra Word/.docx** — mới có PDF.
- **Xuất đề kiểm tra ra Word/PDF** — chưa làm. Lưu ý ở A8.
- **Quản lý Hub** (phân loại, gắn thẻ, ghim) — chưa làm. Lưu ý ở B3.
- **Xem chi tiết bài blog ở chế độ khách** chưa đăng nhập — chưa làm. Lưu ý ở B5.
- **Tùy biến mô phỏng bằng AI và lưu bản tùy biến** — frontend có, phần lưu chưa xong.

**Nếu bị hỏi về bảo mật:** trả lời thẳng thay vì né. Phân quyền hiện mạnh ở tầng giao diện (mọi route đều qua lớp chặn) và ở các luồng lớp học, nhiệm vụ tuần, kiểm duyệt (có kiểm tra môn phía máy chủ). Gap đã biết và ghi nhận trong tài liệu: một số nhóm API tải lên và sinh nội dung chưa bắt buộc xác thực, và bộ điều khiển giáo án chưa gắn kiểm tra vai trò ở mức phương thức. Thừa nhận gap đang xử lý ăn điểm hơn bị hội đồng chỉ ra trước.

---

## 8. Phương án rút gọn

| Thời lượng | Giữ lại |
| --- | --- |
| 33 phút | Toàn bộ A + B + C |
| 25 phút | Bỏ A8, bỏ B5, rút B2 còn phần học sinh nộp bài, bỏ C2 |
| 18 phút | Chỉ **Phần A** (bỏ A8) + **B1** |
| 10 phút | Chỉ **A2 → A3 → A4 → B1 nhịp 3 → B1 nhịp 4** |

Nguyên tắc cắt: giữ bằng mọi giá **A2, A3, A4 và B1 nhịp 4**. Bốn thứ không thể kể lại bằng slide tĩnh — nội dung chảy về thời gian thực, đối chiếu ngược lại SGK thật, AI đề xuất có diff để duyệt, và thông báo bật lên tức thì giữa hai cửa sổ.

Thứ tự cắt: **A8 (tạo đề) đi trước tiên** vì đã là bước tùy chọn, rồi B5, rồi C2, rồi B3.

Riêng **A3 đối chiếu SGK** có thể rút xuống 1 phút bằng cách chỉ làm **cặp 1 và cặp 3**.

---

## 9. Câu hỏi hội đồng hay hỏi

**"Làm sao đảm bảo AI không dạy sai kiến thức?"**
Bốn lớp: Textbook Grounding nạp đúng tri thức bài học từ SGK đã chuẩn hóa; máy chủ kiểm tra cấu trúc dữ liệu trước khi hiển thị; giáo viên duyệt cuối qua cơ chế diff Chấp nhận/Bỏ qua; và tổ trưởng chuyên môn duyệt giáo án trước khi lên lớp. Phần đối chiếu với sách ở đầu buổi chính là minh chứng cho lớp thứ nhất.

**"Vì sao phải có bước tổ trưởng duyệt, không tin giáo viên sao?"**
Không phải vấn đề tin hay không. Tổ chuyên môn vốn đã họp để thống nhất tiến độ và nội dung dạy; hệ thống chỉ đưa quy trình vốn có lên phần mềm để theo dõi được. Thêm nữa, khi AI tham gia soạn bài thì càng cần một lớp rà soát chuyên môn trước khi nội dung tới học sinh.

**"Giáo viên dạy nhiều khối thì sao?"**
Nhận nhiều nhiệm vụ độc lập, mỗi khối một nhiệm vụ, nộp riêng từng bản. Hai khối có tiến độ và nội dung khác nhau, không dùng chung một giáo án được.

**"Hạn nộp có sửa được không?"**
Không, và đây là chủ ý. Hạn nộp do máy chủ tính cứng theo tuần lịch thực, không nhận giá trị từ trình duyệt. Tổ trưởng cũng không có ô nhập.

**"AI hỏng hoặc nhà cung cấp lỗi thì sao?"**
Có cơ chế dự phòng giữa các nhà cung cấp. Riêng sinh ảnh minh họa, nếu lỗi thì luồng tạo slide vẫn chạy tiếp với ảnh giữ chỗ, không làm hỏng cả bài giảng.

**"Dữ liệu SGK lấy từ đâu, có mở rộng được không?"**
Hiện do nhóm chuẩn hóa cho bộ Kết nối tri thức. Hướng phát triển là module để nhà trường tự cập nhật và kiểm duyệt tri thức bài học mới — giới hạn nhóm chủ động thừa nhận trong phần Hướng phát triển.

**"Hệ thống có thay thế giáo viên không?"**
Không, và thiết kế cố tình không cho phép: mọi nội dung AI sinh ra đều phải qua thao tác chấp nhận của giáo viên, và giáo án còn phải qua tổ trưởng duyệt mới được dùng trên lớp.
