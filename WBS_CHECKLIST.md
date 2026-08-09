# WBS Checklist

Source: `(đã làm) Report2_Project Tracking.xlsx`, sheet `WBS` (Iteration 1–3, all 55 rows).

`Code Reality` verified against the actual codebase (`be/`, `fe/`) via a full audit pass on 2026-07-29 — see the Discrepancies section for every row where the WBS tracker's own Status column was wrong.

Legend (Done column, based on **Code Reality**, not the raw WBS Status):
- `[x]` — verified Coded or Tested
- `[~]` — verified Partially Coded
- `[ ]` — verified Pending / Planned / Not Found

## Summary (verified code reality)

| Code Reality | Count |
| --- | ---: |
| Coded | 43 |
| Tested | 1 |
| Partially Coded | 7 |
| Pending | 2 |
| Planned | 2 |
| Not Found | 0 |

**9 of 55 rows (16%) had a WBS Status that did not match the code.** See [Discrepancies](#discrepancies) below.

## Checklist

| Done | Function/Screen | Feature | Sub Feature | Iteration | Code Reality | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | Login / Logout (Google SSO) | Common | Login & Logout (SSO) | Iteration 2 | Coded | UC-02, UC-03 - Coded: Google ID token/JWT authentication and refresh-cookie logout |
| [x] | Update Profile Information | Common | Profile Management | Iteration 2 | Coded | UC-04 - Coded: view/update full name, avatar and contact information |
| [~] | Role-based Access Control (Teacher / Mod / Principal) | Common | Access Control | Iteration 2 | Partially Coded | Partially coded: backend roles and protected Principal/Moderator APIs; frontend route coverage remains incomplete |
| [x] | View Landing Page | Common | Landing Page | Iteration 1 | Coded | UC-01 |
| [~] | Create Lesson Plan (AI: from SGK database or uploaded file) | Lesson | Lesson Plan Creation | Iteration 1 | Partially Coded | UC-24 - SGK-database generation is implemented; uploaded-file generation is missing. If an activity fails to generate (`ACTIVITY_FAILED`), the streaming `pendingActivity` placeholder is auto-healed into a plain heading + "Mời soạn tay." paragraph before persisting — on save (only nodes already `status: "failed"`, so a still-generating node in the same live session is left untouched) and on reopening a saved lesson from Personal Library (any leftover `pendingActivity` node, since no live stream can resolve it anymore) — via `resolveDeadPendingActivities` (`fe/components/LessonEditor/pendingActivityNode.ts`). Fixes both the dead "Thử lại" button (missing streaming context after reopen) and the AI edit-section flow (previously couldn't target a failed activity at all, since it was never a real heading) for previously-saved broken documents. |
| [x] | Edit Lesson Plan | Lesson | Lesson Plan Editing | Iteration 1 | Coded | UC-28 - Coded: TipTap lesson editor supports manual editing, auto-save to Personal Library, and EDUA AI edit-section flow with inline-diff preview/accept/discard via `POST /api/lesson-plans/edit-section` (external contract unchanged: `[{targetId, content}, ...]`). AI can propose edits for one OR MULTIPLE sections per instruction, each with its own independent Accept/Discard card; a new instruction is blocked until every pending diff is resolved. AI edit is structure-aware: sections carrying a 5512 table (thiết bị, phiếu học tập, bảng tổ chức/sản phẩm tiểu hoạt động HĐ2) round-trip through a table wire convention (`fe/components/LessonEditor/tableText.ts`) instead of losing the `<table>` on accept. Internally, `editSection` is split into a narrow section-selection AI call (sees only id/heading/kind per candidate section, `AiPromptKey.LESSON_PLAN_EDIT_SECTION_SELECT`) followed by per-target parallel content-writing AI calls (each scoped to that one target's own content and only the kind-specific formatting rules it needs, `AiPromptKey.LESSON_PLAN_EDIT_SECTION`), to reduce AI mis-targeting (picking the wrong section) without changing the external request/response contract. A 4th `SectionKind`/`kind` value `"activity"` (FE-detected via heading pattern "Hoạt động &lt;số&gt;") teaches the write step the mandatory a) Mục tiêu / b) Nội dung / c) Sản phẩm / d) Tổ chức thực hiện structure plus per-activity-type notes (Khởi động/Luyện tập/Vận dụng) for top-level activities (HĐ1/3/4), so regenerating a failed/placeholder activity via chat produces properly structured content instead of generic unstructured prose. |
| [~] | Export Lesson Plan (PDF / Word) | Lesson | Lesson Plan Export | Iteration 2 | Partially Coded | UC-33 - PDF export is implemented; Word/.docx export is missing. |
| [x] | Create Slide Outline (AI - no 3d) | Slide | Slide Outline | Iteration 1 | Tested | UC-25 |
| [x] | Edit Slide Outline | Slide | Slide Outline | Iteration 1 | Coded | UC-29 |
| [x] | Create Slide Deck (AI from Outline) | Slide | Slide Generation | Iteration 1 | Coded | UC-26 |
| [x] | Edit Slide Deck | Slide | Slide Editing | Iteration 1 | Coded | UC-30 |
| [x] | Present Slide Deck (online) | Slide | Presentation | Iteration 2 | Coded | UC-32 - Coded: /slide-present supports previous/next controls, keyboard navigation, slide picker, fullscreen, and exit. |
| [x] | Click-to-simulate during Presentation | Slide | Presentation | Iteration 2 | Coded | Slide simulation `molecule` renders a preview in the editor and activates its live `MoleculeViewer` only after the presenter clicks “Nhấn để mô phỏng” (`Canvas`, `ElementView`, `SlidePresentationClient`). |
| [x] | Export Slide (HTML for offline use) | Slide | Slide Export | Iteration 2 | Coded | UC-34 - Coded: exports a self-contained offline HTML slide deck with presenter controls, inline CSS, and embedded assets where available. |
| [x] | View 3D Atomic / Molecule Models | Simulation | Molecular Models | Iteration 2 | Coded | UC-58, UC-59 - Coded: interactive 3D ball-and-stick/space-filling molecule viewer, 3D atom model in Periodic Table detail, AI molecule structure generation, save/open from Personal Library, and molecule embedding in slide editor/presentation. |
| [~] | View Periodic Table | Simulation | Periodic Table | Iteration 2 | Partially Coded | UC-57 - Partially coded: 118-element table, filters, detail cards and 3D atom; embedding into lessons/slides is not implemented |
| [~] | Physics Hub (view, detail, customize via AI) | Simulation | Physics Simulation | Iteration 2 | Partially Coded | UC-53, UC-54, UC-55 - Coded frontend: /mo-phong-vat-ly provides reviewed presets and interactive physics simulations. Missing: backend AI customization and persistence of customized simulations in Personal Library. |
| [~] | Simulation & Asset Library Management | Simulation | Simulation Library | Iteration 2 | Partially Coded | No UC — shared asset/sim infrastructure |
| [x] | Create Test | Test | Exam Creation | Iteration 1 | Coded | UC-27 - AI practice-exam creation at `/exam-create-new`, including textbook scope, question/score configuration, feasibility validation, and generated-question validation. |
| [x] | Edit Test | Test | Exam Editing | Iteration 1 | Coded | UC-31 - Tiptap editor at `/exam-edit-new`; test drafts are saved to and reopened from Personal Library as `TEST` content. |
| [ ] | Export Test / Exam (Word / PDF) | Test | Exam Export | Iteration 2 | Pending | UC-35 |
| [x] | View Personal Library (view, open, search own content) | Personal Library | Library Management | Iteration 2 | Coded | UC-21, UC-22, UC-36, UC-37 - Coded: authenticated per-user library supports list, search, open, rename/update, and delete; lesson plans and molecule simulations are saved from their editors |
| [x] | Submit / Unsubmit Hub Content for Review | Community Hub | Content Publishing | Iteration 3 | Coded | UC-23 - Coded: backend POST/DELETE /api/library/contents/{id}/submission (LibraryContentStatus PRIVATE/SUBMITTED/APPROVED/REJECTED, submit() also accepts REJECTED to resubmit); frontend Gui duyet/Thu hoi/Gui lai buttons on /library. Public hub feed, comments/reports, customize, and moderation review are now built (see rows below / Hub Moderation). |
| [x] | View Community Hub | Community Hub | Content Discovery | Iteration 3 | Coded | UC-44 - Coded: backend GET /api/hub/contents (chi APPROVED, khong owner filter); frontend /community-hub. |
| [x] | View Public Hub Content Detail (Guest preview) | Community Hub | Content Discovery | Iteration 3 | Coded | UC-45 - Coded: backend GET /api/hub/contents/{id} khong yeu cau auth (SecurityConfig permitAll cho GET /api/hub/contents/**); frontend detail modal xem duoc khi chua dang nhap. |
| [x] | Customize Hub Content | Community Hub | Content Discovery | Iteration 3 | Coded | UC-46 - Coded: backend POST /api/hub/contents/{id}/customize copy content APPROVED thanh ban PRIVATE thuoc so huu nguoi dung hien tai; frontend nut Tuy bien. |
| [x] | View & Create Content Comments | Community Hub | Community Feedback | Iteration 3 | Coded | UC-47, UC-41 - Coded: bang hub_content_comments; backend POST /api/hub/contents/{id}/comments (chi tren content APPROVED); frontend hien thi + form binh luan. |
| [x] | Update / Delete Own Comment | Community Hub | Community Feedback | Iteration 3 | Coded | UC-48, UC-49, UC-42, UC-43 - Coded: backend PATCH/DELETE /api/hub/comments/{commentId}, owner-only cho update; delete cho phep tac gia comment hoac chu so huu content. |
| [x] | Delete Comment on Own Content | Community Hub | Community Feedback | Iteration 3 | Coded | UC-50 - Coded: HubCommentService.delete cho phep xoa neu la chu so huu content (chung 1 rule voi Update/Delete Own Comment). |
| [x] | Report Violating Content | Community Hub | Content Moderation | Iteration 3 | Coded | No UC - Coded: bang hub_content_reports; backend POST /api/hub/contents/{id}/reports chi ghi nhan bao cao, chua co man hinh duyet report (WBS khong dinh nghia UC cho luong nay). |
| [x] | Moderator Account Management | User & Content Management | Account Management | Iteration 3 | Coded | UC-60, UC-61, UC-62 - Coded: backend /api/principal/moderators (PrincipalController); frontend /user-management. |
| [x] | Teacher Account Management | User & Content Management | Account Management | Iteration 3 | Coded | UC-13, UC-14, UC-15 - Coded: backend /api/moderator/teachers; frontend /user-management. |
| [x] | Create Notifications (send to subject teachers) | User & Content Management | Notifications | Iteration 3 | Coded | UC-20 - Coded: backend POST /api/notifications, Moderator broadcast to Teachers of the same subject, realtime push over STOMP /user/queue/notifications; frontend compose form on /notifications (Moderator only). |
| [x] | View & Manage My Notifications | User & Content Management | Notifications | Iteration 3 | Coded | UC-05, UC-19 - Coded: backend GET /api/notifications, /unread-count, PATCH /{id}/read, POST /read-all; notifications support target metadata/deep-link; frontend /notifications list with unread filter, mark read/read-all, click-through target, and realtime unread badge on Sidebar. |
| [x] | View & Filter Activity Log | User & Content Management | Audit Log | Iteration 3 | Coded | UC-10 - filtered IT Staff activity-log API and screen are implemented. |
| [x] | Moderate Hub Content (review, approve, reject) | User & Content Management | Hub Moderation | Iteration 3 | Coded | UC-06, UC-07, UC-08, UC-09 - Coded: backend GET /api/library/contents/moderation-queue, POST .../approval, POST .../rejection (subject-scoped nhu Blog moderation); frontend /hub-moderation. |
| [ ] | Manage Hub (categorize, tag, organize, pin) | User & Content Management | Hub Management | Iteration 3 | Pending | No UC — Hub structure management |
| [x] | View / Update AI System Prompts | User & Content Management | System Configuration | Iteration 3 | Coded | UC-11, UC-12 - Coded: backend /api/it-staff/system-prompts; frontend /it-staff; prompts apply to lesson/slide/molecule AI flows. |
| [x] | View Blog List (reader + moderation) | Blog | Blog Reading | Iteration 3 | Coded | UC-51, UC-16 - Coded: backend /api/blog-posts; frontend /blog and /blog/moderation. |
| [~] | View Blog Post Detail (reader + moderation) | Blog | Blog Reading | Iteration 2 | Partially Coded | UC-52, UC-17 - Partially coded: authenticated reader and moderator detail views; guest preview is not implemented |
| [x] | Edit Own Blog Post | Blog | Blog Authoring | Iteration 2 | Coded | UC-39 - owner-only PATCH API and the pre-filled edit modal in `BlogCommunityPage` are implemented. |
| [x] | Remove / Delete Blog Post | Blog | Blog Moderation | Iteration 3 | Coded | UC-18, UC-40 - Coded: Teacher can delete own post; Moderator can remove post with reason. |
| [x] | Create Class (CRUD) | Classroom | Class Management | Iteration 2 | Coded | CR-01 - Coded: API/UI/service/repository and migrations for create, list, detail, update, activate/deactivate are present (`/api/classes`, `/create-class`, `ClassManagementService`). |
| [x] | Add Students to Class by Gmail | Classroom | Class Membership | Iteration 2 | Coded | CR-02 - Coded: add by Gmail plus CSV/XLS/XLSX all-or-nothing import, membership list, student-role assignment, and soft-remove/rejoin membership are implemented (`ClassEnrollmentService`, `/add-student`). |
| [x] | Student View Class Resources | Classroom | Class Resource Access | Iteration 2 | Coded | CR-03 - Coded: `/list-class`, `/class-detail`, `/detail-resource`, `GET /api/classes/{id}/resources`, and classroom resource schema are implemented. |
| [x] | IT Staff Role & AI Prompt Administration | Common | Access Control | Iteration 2 | Coded | CR-12 - Principal can manage IT Staff; IT Staff can manage AI system prompts. |
| [x] | Manage Classroom Resources & Assignments | Classroom | Class Hub Management | Iteration 3 | Coded | CR-04, CR-05 - Coded: teacher UI/API can post, edit and delete library/file resources; assignments are resources with `submissionEnabled` and `deadline`. |
| [x] | Assign Homework with Deadline | Classroom | Assignment Delivery | Iteration 3 | Coded | CR-06 - Coded: deadline validation, overdue state, notifications and assignment UI are implemented in `ClassResourceService` and `ClassDetailPage`. |
| [x] | Student View Teaching Resources | Classroom | Class Resource Access | Iteration 3 | Coded | CR-07 - Coded: enrolled-class and resource-detail screens are implemented for `STUDENT`, including file/library resource metadata. |
| [x] | Student Assignment Submission | Classroom | Assignment Submission | Iteration 3 | Coded | CR-08 - Coded: submit/unsubmit text and file attachments, on-time/late status, teacher notification with submission-detail deep-link, API and UI are implemented in `SubmissionService` and `ResourceDetailPage`. |
| [x] | Teacher Review Student Submissions | Classroom | Submission Review | Iteration 3 | Coded | CR-09 - Coded: submission roster and student-detail API/UI are implemented (`SubmissionsRosterPanel`, `SubmissionDetailPanel`). |
| [x] | Submit Lesson Plan for Approval | Lesson | Lesson Plan Approval | Iteration 3 | Coded | CR-10, UC-80/81/83/84/85 - Coded: Full Weekly Task epic implemented per Report3 SRS v1.2. Backend: weekly_tasks table (V21 migration), WeeklyTaskService/Controller (create/edit/submit/unsubmit with BR-47 deadline lock, review_status state machine independent of Hub Publish Status). Frontend: /weekly-schedule (Teacher+Moderator). 22 unit tests green, full mvn test suite green, fe lint/typecheck/build green. UI refinement (2026-08-09): `weekly-schedule` grid lets Moderator assign current/future submission weeks, displays the real teaching week as the following week in parentheses, keeps ended weeks visible with expired empty slots, and uses the same task-card style for edit without changing teacher/week; Teacher submit/unsubmit remains limited to the current submission week in UI. See `designs/weekly-task/grade-scoped-deadline-and-review.md` §8. UI refinement (2026-08-06, part 2): `/library` "Thư viện của tôi" cards now show a 4-state status badge (Nháp/Chờ duyệt/Đã duyệt/Từ chối) next to the Khối tag — for `LESSON_PLAN` items that are the source of a Weekly Task submission, the badge shows that task's `reviewStatus` (added `sourceLibraryContentId` to `WeeklyTaskViews.Summary`) instead of the separate Hub-publish `LibraryContent.status`, since that's the "gửi cho mod" flow teachers actually use for giáo án. See §8 mục con "Library status badge" in the same design doc. |
| [x] | Moderator Approve / Reject Lesson Plans | Lesson | Lesson Plan Approval | Iteration 3 | Coded | CR-11, UC-86/87/88/89 - Coded: Weekly Task Review implemented. Backend: GET /api/weekly-tasks/moderation-queue, POST /{id}/approval, POST /{id}/rejection (subject-scoped like Hub moderation), notifies teacher via existing Notification mechanism. Frontend: /lesson-plan-approval (Moderator). |
| [ ] | AI Content Statistics Dashboard | Principal | Analytics Dashboard | Iteration 3 | Planned | CR-13 |
| [ ] | Principal Management Dashboard |  |  | Iteration 3 | Planned |  |

## Discrepancies

Rows where the WBS tracker's Status column does not match the actual code, found via a full-codebase audit (2026-07-29):

- **Create Lesson Plan (AI: from SGK database or uploaded file)** — WBS says `Coded`, code reality is `Partially Coded`: only the SGK-database variant is implemented (`bookId`/`chapterId`/`lessonId`). Uploaded files are not wired into lesson-plan generation.
- **Export Lesson Plan (PDF / Word)** — WBS says `Pending`, code reality is `Partially Coded`: PDF export works; Word/.docx export is absent.
- **View 3D Atomic / Molecule Models** — WBS says `Partially Coded`, code reality is `Coded`: 3D atom/molecule viewing, AI molecule generation, Personal Library save/open, and slide editor/presentation embedding are implemented.
- **View & Filter Activity Log** — WBS says `Pending`, code reality is `Coded`: `ActivityLogController`, migration `V22`, and `/it-staff/activity-log` are implemented.
- **Edit Own Blog Post** — WBS says `Partially Coded`, code reality is `Coded`: `BlogCommunityPage` opens a pre-filled `CreatePostModal`, which PATCHes the post.
- **Create Class (CRUD)** — WBS says `Partially Coded`, code reality is `Coded`: API/UI/service/repository and Flyway migrations now apply without duplicate versions.
- **Add Students to Class by Gmail** — WBS says `Partially Coded`, code reality is `Coded`: add-by-Gmail, CSV/XLS/XLSX all-or-nothing import, membership listing, student-role assignment, and soft-remove/rejoin membership are implemented.
- **IT Staff Role & AI Prompt Administration** — WBS says `Planned`, code reality is `Coded`: Principal can manage IT Staff and IT Staff can manage AI system prompts. This overlaps with the separate system-prompt row.
- **Teacher Review Student Submissions** — WBS says `Planned`, code reality is `Coded`: roster/detail API and UI are implemented.

### Classroom integration status

The classroom source code is present: `ClassController`, the class/enrollment/resource/submission services, routes and UI all exist. The previous duplicate Flyway version was fixed by keeping `V25__create_class_resources.sql` and renaming submissions to `V27__create_submissions.sql`; backend tests pass (`117` tests, `0` failures). Existing classroom unit coverage still only includes `ClassManagementServiceTest`; resource and submission flows have no dedicated backend tests yet.

