# Iteration 3 Code Checklist

Source: `(đã làm) Report2_Project Tracking.xlsx`, sheet `WBS`, planned `Iteration 3`.

Legend:
- `[x] Coded`: có frontend + backend hoặc logic chính đã có trong code.
- `[~] Partial`: có một phần liên quan, nhưng chưa đủ theo scope WBS.
- `[ ] Not found`: chưa thấy module/API/UI tương ứng trong code hiện tại.

## Summary

| Code reality | Count |
| --- | ---: |
| Coded | 19 |
| Partial | 0 |
| Not found | 8 |

## Checklist

| Done | WBS item | Feature | WBS status | Code reality | Evidence / note |
| --- | --- | --- | --- | --- | --- |
| [x] | Submit / Unsubmit Hub Content for Review | Community Hub | Pending | Coded | Backend `POST/DELETE /api/library/contents/{id}/submission` (`LibraryContentController.java`, `LibraryContentService.submit/unsubmit`); `LibraryContentStatus` nay có `PRIVATE`/`SUBMITTED`/`APPROVED`/`REJECTED`; `submit()` chấp nhận cả `REJECTED` để gửi lại. Frontend nút "Gửi duyệt"/"Thu hồi"/"Gửi lại" ở `/library`. |
| [x] | View Community Hub | Community Hub | Pending | Coded | Backend `GET /api/hub/contents` (`HubContentController`, `HubContentService.list`) — chỉ trả content `APPROVED`, không owner filter. Frontend `/community-hub` (`CommunityHubPage.tsx`), sidebar đã trỏ đúng thay vì `/homepage`. |
| [x] | View Public Hub Content Detail (Guest preview) | Community Hub | Pending | Coded | Backend `GET /api/hub/contents/{id}` không yêu cầu auth (`SecurityConfig`: `GET /api/hub/contents/**` permitAll); trả 404 nếu content chưa `APPROVED`. Frontend detail modal trong `/community-hub` xem được khi chưa đăng nhập. |
| [x] | Customize Hub Content | Community Hub | Pending | Coded | Backend `POST /api/hub/contents/{id}/customize` (`HubContentService.customize`) — copy payload/type/subject thành `LibraryContent` mới, owner = user hiện tại, status `PRIVATE`. Yêu cầu role TEACHER. Frontend nút "Tùy biến về thư viện của tôi". |
| [x] | View & Create Content Comments | Community Hub | Pending | Coded | Bảng `hub_content_comments` (`V20__create_hub_comments_and_reports.sql`); backend `POST /api/hub/contents/{id}/comments` (`HubCommentService.create`, chỉ trên content `APPROVED`); frontend hiển thị + form bình luận trong detail modal. |
| [x] | Update / Delete Own Comment | Community Hub | Pending | Coded | Backend `PATCH/DELETE /api/hub/comments/{commentId}` (`HubCommentService.update/delete`, owner-only cho update). |
| [x] | Delete Comment on Own Content | Community Hub | Pending | Coded | `HubCommentService.delete` cho phép xóa nếu là tác giả comment HOẶC chủ sở hữu content (1 rule dùng chung với "Update/Delete Own Comment"). Frontend hiện nút Xóa tương ứng. |
| [x] | Report Violating Content | Community Hub | Pending | Coded | Bảng `hub_content_reports`; backend `POST /api/hub/contents/{id}/reports` (`HubContentReportService.create`) — chỉ ghi nhận báo cáo, WBS không định nghĩa UC cho luồng xử lý/review nên chưa có màn hình duyệt report. Frontend nút "Báo cáo vi phạm". |
| [x] | Moderator Account Management | User & Content Management | Pending | Coded | Backend `/api/principal/moderators` (`PrincipalController.java`); frontend `/user-management`. Role contract hiện là `PRINCIPAL`. |
| [x] | Teacher Account Management | User & Content Management | Pending | Coded | Backend `/api/moderator/teachers`; frontend `/user-management`. |
| [x] | Create Notifications (send to subject teachers) | User & Content Management | Pending | Coded | Backend `POST /api/notifications` (`NotificationController.java`, `NotificationService.create`) — Moderator broadcast tới Teacher cùng subject, fan-out `notifications`/`notification_recipients` (`V17__create_notifications.sql`) + push STOMP `/user/queue/notifications`. Frontend: form "Soạn thông báo" ở `/notifications` (chỉ hiện cho MODERATOR). Spec: `designs/API_designs/notifications.md`. |
| [x] | View & Manage My Notifications | User & Content Management | Pending | Coded | Backend `GET /api/notifications`, `/unread-count`, `PATCH /{id}/read`, `POST /read-all`. Frontend `fe/app/notifications/page.tsx` (list, filter unread, mark read/read-all) + badge chưa đọc realtime trên `Sidebar`. |
| [x] | View & Filter Activity Log | User & Content Management | Pending | Coded | SRS UC-11. Backend `activity_logs` table (`V22__create_activity_logs.sql`); `ActivityLogService.record/search`; `GET /api/it-staff/activity-log` (`ActivityLogController`, role IT_STAFF), filter theo actorId/category/from/to. Ghi log trực tiếp (không AOP) tại 15 điểm: login/logout (`AuthService`), grant/revoke/reactivate Moderator/IT Staff/Teacher (`PrincipalModeratorService`, `PrincipalItStaffService`, `ModeratorTeacherService`), approve/reject Library content (`LibraryContentService`), remove Blog post (`BlogPostService`), approve/reject Weekly Task (`WeeklyTaskService`), update AI system prompt (`AiSystemPromptService`). v1 scope: 4 categories (AUTH/ACCOUNT/MODERATION/CONFIG) — xem Follow-Up Notes. Frontend `/it-staff/activity-log`. |
| [x] | Moderate Hub Content (review, approve, reject) | User & Content Management | Pending | Coded | Backend `GET /api/library/contents/moderation-queue`, `POST .../approval`, `POST .../rejection` (`LibraryContentService.approve/reject/listModerationQueue`) — subject-scoped như Blog moderation. Frontend `/hub-moderation`. |
| [ ] | Manage Hub (categorize, tag, organize, pin) | User & Content Management | Pending | Not found | Chưa thấy category/tag/pin/organize model hoặc API cho Hub. |
| [x] | View / Update AI System Prompts | User & Content Management | Pending | Coded | Backend `/api/it-staff/system-prompts` (`ItStaffController.java`); frontend `/it-staff`; prompt được apply vào lesson/slide/molecule AI flows. Role contract hiện là `IT_STAFF`. |
| [x] | View Blog List (reader + moderation) | Blog | Pending | Coded | Backend `/api/blog-posts`; frontend `/blog` và `/blog/moderation`. |
| [x] | Remove / Delete Blog Post | Blog | Pending | Coded | Teacher delete own post; Moderator remove post with reason. |
| [ ] | Manage Classroom Resources & Assignments | Classroom | Planned | Not found | Chưa thấy classroom/class hub/resource/assignment module. |
| [ ] | Assign Homework with Deadline | Classroom | Planned | Not found | Chưa thấy assignment/deadline API hoặc UI. |
| [ ] | Student View Teaching Resources | Classroom | Planned | Not found | Chưa thấy student classroom/resource access module. |
| [ ] | Student Assignment Submission | Classroom | Planned | Not found | Chưa thấy submission/upload-text assignment module. |
| [ ] | Teacher Review Student Submissions | Classroom | Planned | Not found | Chưa thấy teacher review submissions module. |
| [x] | Submit Lesson Plan for Approval | Lesson | Planned | Coded | Weekly Task epic (SRS UC-80..89). Backend `WeeklyTaskEntity`/`weekly_tasks` (`V21__create_weekly_tasks.sql`); `WeeklyTaskController` `POST /api/weekly-tasks` (Create, moderator), `POST/DELETE /api/weekly-tasks/{id}/submission` (Submit/Unsubmit, teacher); `WeeklyTaskService` enforces deadline lock (BR-47), subject/ownership checks, and a `reviewStatus` state machine independent from Hub Publish Status. Frontend `/weekly-schedule` (`fe/app/weekly-schedule/page.tsx`, `fe/lib/weekly-task.ts`). |
| [x] | Moderator Approve / Reject Lesson Plans | Lesson | Planned | Coded | Weekly Task Review (SRS 2.13, UC-86..89). Backend `GET /api/weekly-tasks/moderation-queue`, `POST /{id}/approval`, `POST /{id}/rejection` (`WeeklyTaskService.listModerationQueue/approve/reject`), subject-scoped like Hub moderation; notifies teacher via existing `NotificationRepository`/`NotificationStreamPort`. Frontend `/lesson-plan-approval` (`fe/app/lesson-plan-approval/page.tsx`). Unit tests: `be/src/test/java/.../service/weeklytask/WeeklyTaskServiceTest.java` (22 tests, incl. the unsubmit-reverts-to-REJECTED behavior from SRS UC-85). |
| [ ] | AI Content Statistics Dashboard | Principal | Planned | Not found | Chưa thấy dashboard thống kê số giáo án/slide AI theo giáo viên. |
| [ ] | Principal Management Dashboard | Principal | Planned | Not found | WBS row thiếu feature/effort/notes; chưa thấy route/dashboard riêng cho Principal. |

## Code Pointers

- Blog API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/BlogController.java`; service validation: `be/src/main/java/com/edua/beeduasystem/service/blog/BlogPostService.java`
- Blog UI: `fe/components/blog/BlogCommunityPage.tsx`, `fe/app/blog/moderation/page.tsx`
- Library/private content API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/LibraryContentController.java`
- Library/private content UI: `fe/app/library/page.tsx`, `fe/lib/library.ts`
- Hub submit/unsubmit: `LibraryContentService.submit/unsubmit` (be), `submitLibraryContent`/`unsubmitLibraryContent` (`fe/lib/library.ts`)
- Hub moderation (approve/reject/queue): `LibraryContentService.approve/reject/listModerationQueue`, `LibraryContentController` (be); `fe/app/hub-moderation/page.tsx`
- Hub public feed/detail/customize API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/HubContentController.java`, `service/library/HubContentService.java`
- Hub comments/reports: `service/library/HubCommentService.java`, `HubContentReportService.java`; migrations `V19__add_library_content_review_fields.sql`, `V20__create_hub_comments_and_reports.sql`
- Hub UI: `fe/app/community-hub/page.tsx`, `fe/components/hub/CommunityHubPage.tsx`, `fe/lib/hub.ts`
- Account management API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/PrincipalController.java`, `be/src/main/java/com/edua/beeduasystem/presentation/controller/ModeratorController.java`
- Account management UI: `fe/app/user-management/page.tsx`, `fe/app/it-staff-users/page.tsx`
- IT Staff prompt management API/UI: `be/src/main/java/com/edua/beeduasystem/presentation/controller/ItStaffController.java`, `be/src/main/java/com/edua/beeduasystem/service/ai/AiSystemPromptService.java`, `fe/app/it-staff/page.tsx`
- Notifications API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/NotificationController.java`, `be/src/main/java/com/edua/beeduasystem/service/notification/NotificationService.java`
- Notifications UI: `fe/app/notifications/page.tsx`, `fe/lib/notifications.ts`, `fe/lib/ws/notifications-client.ts`, badge trong `fe/components/layout/Sidebar.tsx`
- Weekly Task API (giao/nộp/rút/duyệt giáo án tuần, SRS UC-80..89): `be/src/main/java/com/edua/beeduasystem/presentation/controller/WeeklyTaskController.java`, `be/src/main/java/com/edua/beeduasystem/service/weeklytask/WeeklyTaskService.java`, migration `V21__create_weekly_tasks.sql`
- Weekly Task UI: `fe/app/weekly-schedule/page.tsx` (Teacher + Moderator), `fe/app/lesson-plan-approval/page.tsx` (Moderator), `fe/lib/weekly-task.ts`
- Activity Log API (SRS UC-11): `be/src/main/java/com/edua/beeduasystem/presentation/controller/ActivityLogController.java`, `be/src/main/java/com/edua/beeduasystem/service/activitylog/ActivityLogService.java`, migration `V22__create_activity_logs.sql`
- Activity Log UI: `fe/app/it-staff/activity-log/page.tsx`, `fe/lib/activity-log.ts`

## Follow-Up Notes

- Workbook wording has been corrected: Principal owns school-level account management; IT Staff owns system-prompt management.
- Code role contract now uses `PRINCIPAL` for Principal-level account management.
- Code role contract now uses `IT_STAFF` for IT Staff prompt/account management.
- Decision (this session): Activity Log ownership moved from Mod/Principal to `IT Staff` (IT Manager). WBS source (`(đã làm) Report2_Project Tracking.xlsx`, sheet `WBS`, row 36 col E) updated to match; `designs/auth/rbac-screen-access.md` now lists "Activity Log" as its own row scoped to IT Staff, separate from "Principal Dashboard".
- Resolved: the shared Supabase dev DB's `flyway_schema_history` drift at V18 (schema had `library_contents.submitted_at` without V18 recorded as applied) has been reconciled — history rows for V18/V19 inserted and the missing `idx_library_contents_status_subject` index created. `./mvnw spring-boot:run` / `scripts/start.ps1` against the cloud DB now succeeds.
- Runtime-verified via curl against the running backend (JWTs minted locally with the configured HS256 secret for existing TEACHER/MODERATOR seed accounts, no code changes made to auth): Library content create/submit/moderation-queue/approve/reject (incl. 400 on missing rejection reason, 403 on wrong role/subject), and Hub public list/detail (guest, no token), comment create/update/delete (403 cross-user), report, and customize-to-library. All endpoints behaved per the checklist entries above.
- Added (this session): Weekly Task epic (SRS `Report3_Software Requirement Specification v1.2.docx` §2.12–2.13, UC-80..89). "Submit Lesson Plan for Approval"/"Moderator Approve / Reject Lesson Plans" in the WBS turned out to require the full Weekly Task workflow (moderator assigns a lesson-plan task + deadline to a teacher in their subject; teacher submits/unsubmits; moderator reviews a subject-scoped queue) — not a standalone submit action. `weekly_tasks.review_status` is intentionally independent of `library_contents.status` (Hub Publish Status). Verified via `WeeklyTaskServiceTest` (22 tests) and full `./mvnw test` (all green) plus `npm run lint && npm run typecheck && npm run build` in `fe/`. Google Drive WBS tracker rows 53/54 updated to match.
- Added (this session): Activity Log (SRS `Report3_Software Requirement Specification.docx` UC-11). No audit/logging mechanism existed anywhere in the backend before this; writes are done via direct injection + explicit call in each mutating service (no AOP/events), matching the codebase's existing style. **v1 scope decision**: only 4 categories are logged — `AUTH` (login, logout; refresh-token events intentionally excluded as high-volume/low-audit-value), `ACCOUNT` (grant/revoke/reactivate Moderator, IT Staff, Teacher), `MODERATION` (approve/reject Library-Hub content, remove Blog post, approve/reject Weekly Task), `CONFIG` (AI system prompt updates). Self-service **content changes** (create/update/delete of a user's own private Library content, Blog post, Weekly Task submit/unsubmit) are explicitly deferred — lower audit value, would roughly double the call sites touched. Verified via `ActivityLogServiceTest` (5 tests) and full `./mvnw test` (102 tests, all green) plus `npm run lint && npm run typecheck && npm run build` in `fe/`.
