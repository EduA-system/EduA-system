# Report 7 — nội dung đề xuất cho các mục còn trống

Soạn ngày 19/08/2026. Mỗi mục ghi rõ **nguồn**: bê từ báo cáo khác, hay phải viết mới.

---

## A. Có sẵn nguồn — chỉ cần bê sang

### A1. `I.2 Product Background` — bê nguyên từ Report 1 §2

Report 1 (`Report1_Project_Introduction.docx`) mục `2. Product Background` đã viết đầy đủ: 6 đoạn văn + 5 biểu đồ khảo sát. Nội dung gồm khảo sát tại THPT Lê Quý Đôn Hà Đông, 92 GV Hoá và 91 GV Lý ở trường khác, và bốn vấn đề đã nhận diện (thí nghiệm nguy hiểm không chạy được, soạn bài tốn 1–2 giờ/tiết, kiểm tra tại lớp không dùng được điện thoại, nội dung trừu tượng cần mô hình 3D).

**Việc cần làm**: copy nguyên văn + 5 ảnh. Không phải viết gì.

### A2. `V.3` — khôi phục 2 mục bị rơi khi gộp

Report 5 (`Report5.0_Test_Documentation.docx`) mục 3 có **4** mục con, Report 7 chỉ còn **2**:

| Report 5 | Report 7 | |
|---|---|---|
| 3.1 Test Environment | 3.2 Test Environment | có |
| 3.2 Test Milestones | 3.3 Test Milestones | có |
| **3.3 Entry and Exit Criteria** | — | **mất** (1 bảng) |
| **3.4 Defect Management** | — | **mất** (1 đoạn + 2 bảng) |

Đồng thời Report 7 tự thêm `3.1 Human Resources` mà Report 5 không có (xem B4).

**Việc cần làm**: bê 2 mục trên từ Report 5 sang, đánh số lại thành `3.4` và `3.5`.

---

## B. Không có nguồn — nội dung đề xuất dưới đây

### B1. `Acknowledgement`

> We would like to express our sincere gratitude to Mr. Bui Minh Hoai, our supervising lecturer, whose guidance, review and critical feedback shaped this project from the initial problem framing through to the final release.
>
> We are grateful to the teachers of THPT Lê Quý Đôn Hà Đông, the customer school for this project, for the in-depth Q&A session that identified the concrete classroom problems EDUA addresses, and for their continued feedback on the generated lesson plans, slides and simulations. We also thank the 92 Chemistry teachers and 91 Physics teachers from other high schools who responded to our surveys and allowed us to verify that these problems are not specific to one site.
>
> Finally, we thank FPT University and the SEP490 Capstone Project programme for the structure, resources and review checkpoints that kept this work on track.
>
> Any remaining errors in this report are our own.

### B2. `II.3 Project Deliverables`

Dựa trên bảng `VI.1 Deliverable Package` sẵn có (9 mục), tách theo yêu cầu của template là *internal and/or external*:

> The project produces two groups of deliverables. Internal deliverables support project execution and are maintained by the team throughout the semester. External deliverables are handed over to the supervising lecturer and the capstone review committee at the final submission.

| No. | Deliverable | Type | Description |
|---|---|---|---|
| 1 | Schedule / Task Tracking | Internal | Project plan and progress-tracking sheet covering the WBS, sprint schedule and effort per member |
| 2 | Project Backlog | Internal | Product and sprint backlog listing epics, user stories and their status |
| 3 | Issues List | Internal | Register of project and technical issues raised during execution, with resolution |
| 4 | Defects List | Internal | Log of defects found during testing, with severity, state and retest result |
| 5 | Source Codes | External | Complete EDUA source code: Spring Boot backend and Next.js frontend |
| 6 | Database Script(s) | External | PostgreSQL schema and Flyway migration scripts |
| 7 | Final Report Document | External | This consolidated capstone final report |
| 8 | Test Cases Document | External | Unit, integration and system test documentation with AI test data |
| 9 | Presentation Slide | External | Slide deck used for the capstone defence |
| 10 | Deployed System | External | Running instance of EDUA reachable by the review committee |

> Mục 10 chỉ giữ nếu hệ thống còn chạy lúc bảo vệ — nếu không thì bỏ dòng đó.

### B3. `III.5.2 Common Requirements`

Đây là các yêu cầu áp dụng cho **mọi** màn hình, để mục 2 không phải lặp lại ở từng màn hình.

> The requirements in this section apply to every screen specified in section 2 unless that screen explicitly states otherwise.

| ID | Common requirement |
|---|---|
| CR-01 | Every screen except the landing page and the login screen requires a valid session. An expired or missing token redirects the user to the login screen and shows the session-expired message. |
| CR-02 | Screen and action visibility follows the role authorization matrix in section 1.3.2. A user never sees a control for an action their role cannot perform. |
| CR-03 | All user-facing text, labels, validation messages and dates are rendered in Vietnamese. |
| CR-04 | Any action that takes longer than one second shows a loading state. AI generation flows additionally stream partial progress instead of blocking on a single response. |
| CR-05 | All error and confirmation messages use the message codes defined in section 5.3. A screen never shows a raw server error or stack trace. |
| CR-06 | Any destructive action (delete, remove member, deactivate account, unpublish) requires an explicit confirmation step. |
| CR-07 | Any list that can exceed twenty items is paginated, and keeps the active filter and sort when the page changes. |
| CR-08 | Form input is validated on the client before submission and re-validated on the server; the server is authoritative. |
| CR-09 | Account-management, moderation and prompt-configuration actions are written to the activity log with actor, target, action and timestamp. |
| CR-10 | File uploads are restricted by type and size; a rejected upload states the reason. |
| CR-11 | Screens are usable on a desktop browser at 1366×768 or wider, per the compatibility requirements in section 4.2.2. |
| CR-12 | An editor with unsaved changes warns the user before navigation away from the screen. |

> Nhớ đối chiếu CR-05 và CR-11 với mục `5.3 Application Messages List` và `4.2.2 Accessibility and Compatibility` để số hiệu khớp.

### B4. `V.3.1 Human Resources`

> Testing is carried out by the development team; there is no separate QA role. Each member tests the modules they did not implement, so that no feature is verified only by its own author. The team leader consolidates results and owns the defect log.

Phân công bám theo **người viết tài liệu**, lấy từ bảng Record of Changes của từng báo cáo — người đặc tả phần nào thì chịu trách nhiệm kiểm thử đúng phần đó.

| Full name | Project role | Documents authored | Testing responsibility |
|---|---|---|---|
| Nguyen Tuan Bach | Member | Report 1, Report 2, **Report 3 (SRS, toàn bộ)** | System testing against the SRS he authored: verifies every use case specification, business rule and application message; owns the system test suite (Report 5.3) and the acceptance criteria |
| Vu Dinh Dang | Leader | Report 4 — High Level Design, Software Architecture, Package Diagram, Database Design, Other Design Specifications | Integration testing (Report 5.2): API contracts between frontend and backend, database schema and Flyway migrations, cross-module flows. As leader, also owns test scheduling, the defect log and the final exit-criteria decision |
| Nguyen Hong Nha | Member | Report 4 — Detailed Design | Unit testing (Report 5.1) of the classes he specified in the class and sequence diagrams |
| Vu Tuan Hiep | Member | *(chưa có)* | *(chưa xác định)* |
| Vu Nhat Minh | Member | *(chưa có)* | *(chưa xác định)* |
| Bui Minh Hoai | Lecturer | — | Review of test scope and strategy, acceptance of test results |

> **VƯỚNG — cần bạn cho thông tin.** Áp đúng nguyên tắc "dựa vào người viết tài liệu" thì **Vu Tuan Hiep và Vu Nhat Minh không gán được gì**: tên hai bạn không xuất hiện trong Record of Changes của bất kỳ báo cáo nào (Report 1, 2, 3 đều là Bach; Report 4 là Đăng + Nhạ; Report 5 ghi chung là `SEP490_SU26_G20`).
>
> Đã dò thêm nhưng không ra: metadata `dc:creator` của `Report5.1_Unit Test.xlsx` và `Report5.2_Integration Test.xlsx` là "Nguyen Hoang Anh" / "Kien Nguyen" — tác giả file template của trường, không phải thành viên nhóm. Report 6 là `.gdoc` (chỉ có link, không đọc được nội dung).
>
> Hai khả năng: (a) hai bạn viết Report 5 hoặc Report 6 nhưng Record of Changes ghi chung tên nhóm; (b) hai bạn phụ trách code chứ không viết tài liệu. Bạn cho biết thì tôi điền nốt. Nếu là (a) thì nên bổ sung tên cụ thể vào Record of Changes của Report 5 luôn, vì hội đồng thường soi chỗ này để đánh giá đóng góp cá nhân.

### B5. `VI.3.1 Overview`

> EDUA is a web application for high-school Chemistry and Physics teachers. It generates MOET-5512 lesson plans, presentation slides and practice exams from the Vietnamese national textbook, provides interactive physics simulations, an interactive periodic table and 3D molecular models, and supports classroom management, weekly teaching tasks and a community content hub.
>
> A teacher signs in with a Google account. After signing in, the dashboard is the entry point to every feature. This manual describes the two workflows that cover the day-to-day use of the system: preparing teaching material for a lesson, and completing the weekly teaching task cycle. Features that are used on their own — the periodic table, the simulation library, the community hub and the blog — are reachable directly from the dashboard and do not require a workflow.

### B6. `VI.3.2` và `VI.3.3` — đề xuất đặt tên

Template để `Workflow 1` / `Workflow 2` là tên tạm. Đề xuất:

| Hiện tại | Đề xuất |
|---|---|
| `3.2 Workflow 1` | **`3.2 Preparing teaching material for a lesson`** |
| `3.3 Workflow 2` | **`3.3 The weekly teaching task cycle`** |

**`3.2 Preparing teaching material for a lesson`** — chuỗi: chọn SGK / khối / chương / bài → sinh giáo án 5512 → chỉnh trong trình soạn → xuất PDF/DOCX → từ giáo án sinh dàn ý slide → sinh bộ slide → chỉnh và trình chiếu → sinh đề kiểm tra theo ma trận ba phần → xuất đề. Mỗi bước một ảnh màn hình. Ảnh lấy lại được từ mục `III.2` vừa điền (48 mockup) nên không phải chụp mới.

**`3.3 The weekly teaching task cycle`** — chuỗi: Moderator giao nhiệm vụ tuần → giáo viên xem lịch tuần → soạn và nộp giáo án cho nhiệm vụ → Moderator duyệt hoặc trả lại kèm nhận xét → giáo viên nhận thông báo → giáo án được duyệt vào thư viện cá nhân. Ảnh cũng lấy từ `III.2`.

---

## C. `IV.4.4.4 Physics Simulation Parameter Controls` — cần bạn quyết

Mục này là mục **duy nhất** trong 60 mục của `IV.4 Class Specifications` không có bảng. Lý do: nó mô tả một thứ chạy ở frontend, không phải một class backend như 59 mục còn lại.

Nhưng khi soi code thì có một điểm lệch cần xử lý trước:

- Backend **có thật** `PhysicsSimulationController` (`POST /api/physics-simulations/ai-edit`, `@PreAuthorize("hasRole('TEACHER')")`) và `PhysicsSimulationService.edit()`.
- Frontend **có** hàm `editPhysicsSimulation()` trong `fe/lib/api/physics-simulations.ts` — nhưng **không nơi nào gọi**. Code chết.
- Câu văn hiện tại của mục viết: *"does not provide an AI-based editing workflow"* — **đúng với thực tế người dùng thấy**, vì FE không bao giờ gọi.

**Đã chốt: bỏ mục này.**

Việc cần làm:

1. Xoá heading `4.4.4 Physics Simulation Parameter Controls` và đoạn văn của nó.
2. Đánh số lại các mục sau trong `4.4`: `4.4.5 MoleculeController` → `4.4.4`, `4.4.6 MoleculeService` → `4.4.5`, `4.4.7 MoleculeStructure` → `4.4.6`.
3. Sửa câu dẫn của mục `4.4` — hiện đang viết *"Physics simulations are deterministic client-side interactive views whose supported parameters are adjusted manually."* Câu này giới thiệu cho mục 4.4.4 vừa bỏ, nên bỏ theo, để lại: *"This module validates and generates practice exams and constructs validated molecule graphs."*
4. Kiểm tra tên mục `4.4` — hiện là `4.4 Practice Exam, Physics Simulation, and Molecule Generation`. Bỏ `Physics Simulation` khỏi tên: **`4.4 Practice Exam and Molecule Generation`**.

Sau khi bỏ, `IV.4` còn **59 mục, cả 59 đều có bảng** — hết mục cụt.

> **Lưu ý để lại**: backend vẫn còn `PhysicsSimulationController` + `PhysicsSimulationService` (`POST /api/physics-simulations/ai-edit`) mà tài liệu sẽ không mô tả ở đâu nữa. Chấp nhận được vì frontend không gọi, nhưng nếu hội đồng đọc source code thì có thể hỏi. Cân nhắc xoá luôn code chết `editPhysicsSimulation()` trong `fe/lib/api/physics-simulations.ts` cho khớp.

---

## D. Việc cơ học kèm theo

| Việc | Chi tiết |
|---|---|
| Xoá 2 dòng hướng dẫn còn sót | `II.1.1 Scope & Estimation` và `III.5 Requirement Appendix` còn đoạn `[Create/Provide the list...]`, `[List out other requirements...]` |
| Trùng tên, nhảy số | `III.1.3.3 Non-UI Functions` và `III.1.4.3 Non-UI Functions` |
| Thiếu heading cha | `V.5.3 System Test` → nhảy thẳng `V.5.4.1`, thiếu `5.4` |
| Sai chính tả | `III.1.3.1.4 Screens Flow for Principle` → **Principal** |
| Mục lục | `Ctrl+A` → `F9`. Mục lục đang đặt tới Heading 6 nên sẽ có 96 dòng `a./b.` — cân nhắc hạ xuống Heading 5 |
