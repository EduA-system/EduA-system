# Report 1 — Hội đồng có thể phản biện gì, và trả lời thế nào

**Bản rà:** `AAA_docs_sau_khi_nop_9_8/Report1_Project_Introduction.docx` sau khi đã patch 19/08/2026 (28 sửa câu chữ + bảng Record of Changes).
**Đối chiếu:** repo `main_code` @ `439e62b` + backend deploy `https://api.edua.memore.vn`.
**Liên quan:** [report1-vs-code-gap.md](report1-vs-code-gap.md) — danh sách chỗ lệch giữa RP1 và code.

Bản sau khi sửa đã bịt nhóm "hứa quá đà" (mô tả chức năng không có trong code). Vì vậy các câu hỏi còn lại chuyển sang **phạm vi, bằng chứng, pháp lý và demo**. Xếp theo mức nguy hiểm.

---

## A. Ba câu nguy hiểm nhất

### A1. "Khách hàng là GV Hoá, vấn đề số 1 các em nêu là thí nghiệm nguy hiểm — và báo cáo tự thừa nhận không làm được. Vậy sản phẩm giải gì cho GV Hoá?"

**Vì sao hỏi được:** §2 vẫn *mở đầu* bằng câu chuyện tủ hút, khí clo, lớp 46–48 HS. Phần thừa nhận phạm vi (phòng thí nghiệm Hoá ảo bị bỏ theo LI-22, môn Hoá chỉ có trực quan hoá cấu trúc) nằm ở *cuối* mục. Người đọc lướt sẽ chốt "vấn đề chính không giải được".

**Trả lời:**

- Chính khảo sát của nhóm xếp nhu cầu theo thứ tự: **97.8% muốn hỗ trợ soạn giáo án > 76.9% slide > 62.6% chuẩn bị thí nghiệm > 60.4% ra đề**. Thí nghiệm không phải nhu cầu số 1 của GV — nó là vấn đề *gay gắt nhất về cảm xúc*, không phải tốn thời gian nhất.
- GV Hoá nhận được: giáo án 5512, slide, đề kiểm tra, cộng mô hình 3D phân tử, nguyên tử 3D và bảng tuần hoàn tương tác được **AI tự chèn vào đúng slide cần** — không phải GV tự đi tìm rồi dán (`be/src/main/java/com/edua/beeduasystem/service/slides/SlidePromptBuilder.java:303-306`).
- Phòng thí nghiệm Hoá ảo là hướng phát triển đã ghi rõ trong LI-22, không phải chỗ quên.

**Nước đi rẻ nhất để khoá hẳn câu này:** đảo thứ tự bốn vấn đề ở §2, đưa "nội dung trừu tượng" (nguyên tử, lai hoá sp/sp²/sp³, hình học phức chất) lên đầu — đó là vấn đề sản phẩm giải được cho môn Hoá. *Chưa làm*, vì giữa các đoạn §2 có chèn biểu đồ nên di chuyển đoạn dễ vỡ layout.

### A2. "Sao bảng so sánh không có Azota, Shub Classroom, K12Online?"

**Vì sao hỏi được:** cả 8 hệ thống trong §3 đều là sản phẩm nước ngoài hoặc công cụ chung (PowerPoint, Canva, ChatGPT, MagicSchool, MolView, Eduaide, Zperiod, NotebookLM). Không có một sản phẩm Việt Nam nào. Azota làm đúng mảng RP1 vừa mô tả là mình có: **giao đề, thu bài, chấm**. Không nhắc tới = hoặc chưa khảo sát thị trường trong nước, hoặc né.

**Trả lời:** Azota mạnh ở phát đề/thu bài/chấm tự động nhưng **không sinh nội dung** và không bám SGK; EDUA đi từ đầu nguồn (giáo án → slide → đề) và **có chủ đích** không làm chấm tự động (EX-02), vì điểm HS là hồ sơ chính thức của trường.

**Nước đi:** thêm một dòng Azota vào bảng §3 — khoảng 15 phút, đổi hẳn thế trận của câu hỏi này.

### A3. "Các em bóc nội dung SGK Kết nối tri thức vào database — đã xin phép NXB Giáo dục chưa?"

**Vì sao hỏi được:** cả RP1 không có một dòng nào về bản quyền. EX-11 mới nói không phát hành thương mại, chưa nói cơ sở nào cho việc *trích xuất*. Trong khi đó Vision lấy chính "knowledge base bóc từ KNTT" làm điểm khác biệt cốt lõi — nên câu hỏi này đánh trúng trụ chính.

**Trả lời:** dữ liệu dùng nội bộ cho đồ án và pilot tại một trường; hệ thống không phát hành lại nội dung SGK; người dùng chỉ nhận nội dung do AI sinh ra dựa trên phạm vi bài đã chọn.

**Nước đi:** bổ sung một câu vào LI-07 hoặc một exclusion mới nói rõ đúng ý trên.

---

## B. Nhóm "cho tôi con số"

### B1. "Knowledge base do nhóm rà tay — bao nhiêu bài, ai rà, rà mấy vòng, tỉ lệ sai?"

**Vì sao hỏi được:** RP1 dùng cụm "prepared / reviewed by the project team" ở 3 chỗ (§3 ChatGPT gap, §3 tổng kết, §5 Vision) và lấy nó làm vũ khí đánh ChatGPT và NotebookLM. Không kèm một con số nào. Nếu hội đồng mở đại một bài mà gặp lỗi OCR thì luận điểm chính sụp tại chỗ — trong seed repo có sẵn ví dụ: `be/src/main/resources/lessons/10.json`, bài Định luật 1 Newton, câu bị vỡ chữ.

**Cần chuẩn bị trước buổi bảo vệ:**

- Catalog trên bản deploy: **12 sách / 277 bài** — Hoá 83 bài (HOA_10/11/12), Lý 86 bài (LI10/11/12), Toán 108 bài (TOAN10–12 tập một + tập hai).
- Số bài có `knowledge_json` rỗng (`SELECT count(*) FROM lessons WHERE knowledge_json IS NULL`) — bài rỗng vẫn chọn được trên UI nhưng sinh giáo án sẽ hỏng. Có số rồi thì ghi thẳng vào LI-13.
- Quy trình rà: ai rà, bao nhiêu bài, mấy vòng — 2 câu là đủ, nhưng phải nói được.

### B2. "Thư viện mô phỏng phủ được bao nhiêu phần chương trình Vật lí?"

**Số thật:** 21 engine thí nghiệm trong `fe/components/simulations/`, 68 preset trong `fe/components/simulations/presets/`, so với 86 bài Vật lí trong catalog.

**Chi tiết ăn điểm nếu bị hỏi "AI đòi thí nghiệm mà thư viện không có thì sao":** bộ khớp `fe/lib/slide-layout/resolve-physics-preset.ts:73-92` đặt ngưỡng nhận bảo thủ — **không khớp thì để trống slot chứ không chèn nhầm thí nghiệm vào bài giảng**. Đây là quyết định thiết kế có chủ đích, nói ra được sẽ ghi điểm.

### B3. "LI-03 nói cần tối thiểu 8 GB RAM — đo bằng cách nào?"

Con số tuyệt đối trong tài liệu luôn bị hỏi. Nếu Report5.4.4 (Physical Simulation Test) có số đo thì dẫn ra; nếu không có thì nên đổi câu chữ từ ngưỡng cứng sang **khuyến nghị**.

---

## C. Nhóm phạm vi

### C1. "Vì sao có môn Toán?"

Toàn bộ §2 là phỏng vấn GV Hoá tại Lê Quý Đôn + khảo sát 92 GV Hoá / 91 GV Lý. §3, §4, §5 chỉ nói Lý–Hoá. EX-08 lại loại trừ mô phỏng Toán. Toán đứng trong scope (LI-13, EX-06) mà không có một dòng nhu cầu nào chống lưng.

**Hai lựa chọn, cần nhóm quyết:** (a) bổ sung 2–3 câu vào §2 nêu lý do thật (cùng cấu trúc SGK, cùng khung đề ba phần, chi phí thêm dữ liệu thấp); hoặc (b) hạ Toán xuống mức "mở rộng phạm vi dữ liệu" thay vì môn ngang hàng. Đã thêm vào LI-13 câu nói rõ Toán không có engine mô phỏng, nhưng phần bằng chứng nhu cầu thì không thể tự chế.

### C2. "Vì sao tự làm Classroom, sao không dùng Google Classroom?"

FE-10 nay đã định vị rõ (kênh phát/thu tài liệu do chính EDUA sinh ra, không thay LMS) và EX-10 đã có lý do. Nhưng **§2 vẫn không có vấn đề nào dẫn tới Classroom**, trong khi đây là phần nặng code. Câu hỏi kèm theo sẽ là: *"LI-23 nói còn thiếu điểm danh, chat, sổ điểm — tính năng dở dang sao vẫn đưa vào Release 1.0?"*

**Nước đi nếu còn thời gian:** thêm 3–4 câu vào cuối §2 nối vào chính ràng buộc đã nêu — HS không được dùng điện thoại trong lớp nên tài liệu và bài làm đi đường giấy hoặc file rời (Zalo/Drive), tản mát, khó theo dõi ai đã nộp.

### C3. "Vẫn là bài kiểm tra thôi mà — không chấm được thì GV vẫn phải làm bài kiểm tra của trường?"

Bản mới đã đóng phần lớn đường này: mục đích đặt trước khung đề, nói rõ đây là **đánh giá thường xuyên** GV tự chấm và vào sổ điểm của trường, EX-02 đã có lý do.

Đường còn lại là kinh tế: *"GV vẫn tự chấm, tự nhập điểm — tiết kiệm ở đâu?"* → phần tốn thời gian là **ma trận + bản đặc tả + soạn câu hỏi**, đúng bốn bước hệ thống làm (Configuration → Matrix → Specification → Test); chấm một bài 15 phút thì nhanh.

---

## D. Rủi ro demo, không phải rủi ro giấy tờ

### D1. Giao đề qua lớp học là giao luôn đáp án — **cần sửa code trước khi bảo vệ**

Document đề lưu trong thư viện gồm cả `I. ĐỀ KIỂM TRA` và `II. ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM` (`fe/lib/practice-exam-html.ts:125`), còn `fe/components/classroom/ClassResourceDocumentViewer.tsx` render nguyên văn, không cắt phần II. HS mở tài nguyên lớp là thấy đáp án và hướng dẫn chấm.

Đây không còn là câu hỏi tài liệu — nếu ai bấm đúng đường này lúc demo thì là lỗi thấy tận mắt. Và §5 Vision nay có câu "GV phát tài liệu đã duyệt cho lớp và thu bài nộp", tức là báo cáo đang mời người đọc đi đúng đường đó.

**Cách sửa:** khi mở qua ngữ cảnh lớp (`kind="exam"` + có `classId`/`resourceId`), lọc bỏ mọi node từ heading `II. ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM` trở đi trước khi render; hoặc lưu đề thành hai payload tách biệt (đề / đáp án) và chỉ trả phần đề cho HS. Cách hai sạch hơn nhưng đụng schema payload.

### D2. "Ai trả tiền gọi AI?"

EX-09 nói không thu phí, §4 lại lập luận đây là cơ hội thị trường. Không có mô hình chi phí ở đâu trong RP1. Nên có sẵn một câu trả lời về giai đoạn pilot.

### D3. "Grounded mà vẫn không đảm bảo đúng thì khác gì ChatGPT?"

LI-01, LI-08, EX-07 đều thừa nhận không có kiểm chứng tự động. Trả lời gọn: ChatGPT không biết bài đang soạn thuộc chương nào của sách nào; EDUA sinh trong phạm vi bài đã chọn từ dữ liệu đã bóc sẵn — giảm sai lệch phạm vi, không xoá bỏ sai sót; nên mới bắt buộc GV duyệt trước khi dùng.

### D4. "Ai bên trường xác nhận quy trình duyệt giáo án?"

FE-08 và FE-11 dựng quy trình mỗi môn đúng một Moderator, Principal quản Moderator. RP1 không có mục Stakeholders: không nói ai được phỏng vấn, ngày nào, ai chốt nghiệp vụ. Hỏi "tổ trưởng chuyên môn ở Lê Quý Đôn có thực sự duyệt giáo án theo tuần không?" thì không có gì trên giấy để dẫn.

**Nước đi:** thêm §1.3 "Stakeholders and requirement sources" — một bảng 5 dòng: tên/vai trò người được phỏng vấn, ngày Q&A, cỡ mẫu và thời gian hai khảo sát, ai xác nhận phạm vi.

---

## E. Việc nên làm, theo thứ tự

1. **Code — chặn lộ đáp án khi giao đề cho HS** (D1). Rủi ro duy nhất có thể vỡ ngay trên máy chiếu.
2. **Đếm bài `knowledge_json` rỗng** (B1) và điền vào LI-13.
3. **Thêm dòng Azota vào bảng §3** (A2) — rẻ, hiệu quả cao.
4. **Thêm câu bản quyền/pháp lý** vào LI-07 hoặc exclusions (A3).
5. **Đảo thứ tự bốn vấn đề §2** (A1) và **thêm đoạn dẫn cho Classroom** (C2).
6. **Thêm §1.3 Stakeholders** (D4) và cột "Source of requirement" cho bảng Major Features.
7. **Quyết hướng cho môn Toán** (C1).

## F. Số liệu cần thuộc trước khi vào phòng

| Con số | Giá trị | Dùng để trả lời |
| --- | --- | --- |
| Catalog SGK | 12 sách / 277 bài (Hoá 83, Lý 86, Toán 108) | B1, C1 |
| Bài `knowledge_json` rỗng | *cần đếm* | B1 |
| Mô phỏng Vật lí | 21 engine / 68 preset, catalog 86 bài Lý | B2 |
| Công cụ Hoá | bảng tuần hoàn 118 nguyên tố + nguyên tử 3D + sinh phân tử 3D | A1 |
| Thứ tự nhu cầu khảo sát | 97.8% giáo án / 76.9% slide / 62.6% thí nghiệm / 60.4% ra đề | A1 |
| Cỡ mẫu | 92 GV Hoá + 91 GV Lý + phỏng vấn Lê Quý Đôn | A2, D4 |

## G. Ba số trong RP1 cần đối chiếu lại với dữ liệu khảo sát gốc

Câu gốc trong docx bị cụt giữa chừng, khi patch chỉ viết lại cho trọn nghĩa — chưa có dữ liệu để xác nhận:

- 38.2% — "finding suitable illustrations or **videos**" (bản cũ dừng ở "or vd").
- 60.4% GV Vật lí — "**rejected the statement**" rằng slide không cần đẹp bằng Canva. Suy từ câu kết luận ngay sau đó ("visual quality is a hard expectation"); nếu khảo sát hỏi theo chiều ngược thì phải sửa lại.
- Câu về hai khung đề 15/45 phút — "frequently **need a ready-made quiz** on the spot".
