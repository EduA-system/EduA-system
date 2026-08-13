# Integration Test Feature List

Scope: danh sach tab/sheet va function de chuan bi tai lieu Integration Test.

Strategy de xuat: Feature-based Integration Testing, bo sung mot so Thread-based smoke flow cho cac luong lien quan nhieu role.

Khong dua vao scope:

- Chuc nang dung AI de sinh noi dung: tao giao an bang AI, tao slide outline/deck bang AI, tao de/ma tran bang AI, tao molecule bang AI, slide design/fill content bang AI.
- Chuc nang edit/export ma tien de nghiep vu bat buoc la noi dung duoc tao boi AI: Lesson Plan Editing & Export, Slide Deck Editing & Export, Practice Test Editing.
- Cac mo phong Ly-Hoa: Physics Hub, Periodic Table, Molecule/Atomic models, simulation embedding.
- Cac dashboard dang Planned/Pending.

## Sheet Overview

| No  | Sheet/Tab                          | Main Feature              | Function Groups                                                                             |
| --- | ---------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Authentication & Profile           | Common                    | Login/Logout, Refresh Session, Current User, Update Profile                                 |
| 2   | Role-Based Access Control          | Common                    | Route Access, API Permission, Unauthorized Access                                           |
| 3   | User Management CRUD               | User & Content Management | Principal manages Moderator/IT Staff, Moderator manages Teacher                             |
| 4   | Personal Library CRUD              | Personal Library          | List/Search/Open, Create/Save, Rename/Update, Delete                                        |
| 5   | Community Hub Content              | Community Hub             | View Hub, View Detail, Customize Content, Submit/Unsubmit from Library                      |
| 6   | Community Hub Feedback             | Community Hub             | Create Comment, Update Comment, Delete Comment, Report Content                              |
| 7   | Hub Moderation                     | User & Content Management | View Moderation Queue, Approve Content, Reject Content                                      |
| 8   | Blog CRUD & Moderation             | Blog                      | View Blog, View Detail, Create, Edit, Delete Own Post, Moderator Remove Post                |
| 9   | Notification Management            | User & Content Management | Moderator Creates Notification, View Notifications, Mark Read, Mark All Read, Unread Count  |
| 10  | Activity Log                       | User & Content Management | View Activity Log, Filter Activity Log                                                      |
| 11  | Classroom CRUD                     | Classroom                 | Create Class, List Classes, View Detail, Update Class, Activate/Deactivate                  |
| 12  | Classroom Membership               | Classroom                 | Add Student by Gmail, Import Students, List Members, Student List Enrolled Classes          |
| 13  | Classroom Resource CRUD            | Classroom                 | Post Resource, List Resources, View Resource Detail, Update Resource, Delete Resource       |
| 14  | Assignment Submission              | Classroom                 | Student Submit Assignment, View Own Submission, Unsubmit Assignment                         |
| 15  | Submission Review                  | Classroom                 | Teacher View Submission Roster, View Student Submission Detail                              |
| 16  | Weekly Task / Lesson Plan Approval | Lesson                    | Moderator Create Weekly Task, Teacher Submit/Unsubmit Lesson Plan, Moderator Approve/Reject |

## Sheet Details

### 1. Authentication & Profile

| Function              | Role                    | Screen/API                             | Notes                                                               |
| --------------------- | ----------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| Login with Google SSO | All allowed users       | `/login`, `POST /api/auth/google`      | Integration with auth service, user allowlist, JWT, refresh cookie. |
| Refresh session       | All authenticated users | `POST /api/auth/refresh`               | Verify refresh token/cookie flow.                                   |
| Logout                | All authenticated users | `POST /api/auth/logout`                | Verify refresh cookie is cleared/revoked.                           |
| View current user     | All authenticated users | `GET /api/auth/me`                     | Verify user identity, role, subject.                                |
| Update profile        | All authenticated users | `/user-profile`, `PATCH /api/users/me` | Update full name, avatar, contact information.                      |

### 2. Role-Based Access Control

| Function                              | Role                  | Screen/API                                                                         | Notes                                                       |
| ------------------------------------- | --------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Teacher accesses Teacher pages        | Teacher               | `/library`, `/blog`, `/create-class`, `/weekly-schedule`                           | Positive permission tests.                                  |
| Moderator accesses moderation pages   | Moderator             | `/hub-moderation`, `/blog/moderation`, `/lesson-plan-approval`, `/user-management` | Positive permission tests.                                  |
| Principal accesses account management | Principal             | `/user-management`, `/api/principal/**`                                            | Positive permission tests.                                  |
| IT Staff accesses activity log        | IT Staff              | `/it-staff/activity-log`                                                           | Include only activity-log access, not AI prompt management. |
| Unauthorized role is denied           | Teacher/Student/Guest | Protected routes/APIs                                                              | Negative tests: 401/403 or UI access denied.                |

### 3. User Management CRUD

| Function                 | Role                     | Screen/API                                          | Notes                                       |
| ------------------------ | ------------------------ | --------------------------------------------------- | ------------------------------------------- |
| List Moderators          | Principal                | `/user-management`, `GET /api/principal/moderators` | Principal-only.                             |
| Create Moderator         | Principal                | `POST /api/principal/moderators`                    | Verify role grant and status.               |
| Disable/Revoke Moderator | Principal                | `DELETE /api/principal/moderators/{id}`             | Verify disabled state.                      |
| Replace Moderator        | Principal                | `POST /api/principal/moderators/{id}/replacement`   | Verify old/new moderator state.             |
| Reactivate Moderator     | Principal                | `PATCH /api/principal/moderators/{id}/reactivate`   | Verify reactivation.                        |
| List IT Staff            | Principal                | `GET /api/principal/it-staff`                       | Principal-only.                             |
| Create IT Staff          | Principal                | `POST /api/principal/it-staff`                      | Account CRUD only; exclude AI prompt tests. |
| Disable/Revoke IT Staff  | Principal                | `DELETE /api/principal/it-staff/{id}`               | Verify IT Staff access removed.             |
| Reactivate IT Staff      | Principal                | `PATCH /api/principal/it-staff/{id}/reactivate`     | Verify IT Staff restored.                   |
| List Teachers            | Moderator                | `GET /api/moderator/teachers`                       | Moderator-only.                             |
| Create Teacher           | Moderator                | `POST /api/moderator/teachers`                      | Verify subject and role.                    |
| Disable Teacher          | Moderator                | `DELETE /api/moderator/teachers/{id}`               | Verify teacher is disabled.                 |
| Reactivate Teacher       | Moderator                | `PATCH /api/moderator/teachers/{id}/reactivate`     | Verify teacher restored.                    |
| Permission denial        | Teacher/IT Staff/Student | `/api/principal/**`, `/api/moderator/**`            | Negative RBAC tests.                        |

### 4. Personal Library CRUD

| Function                  | Role              | Screen/API                                     | Notes                                              |
| ------------------------- | ----------------- | ---------------------------------------------- | -------------------------------------------------- |
| List own content          | Teacher/Moderator | `/library`, `GET /api/library/contents`        | Filter by type, subject, keyword.                  |
| Open content detail       | Teacher/Moderator | `GET /api/library/contents/{id}`               | Owner-only.                                        |
| Create library content    | Teacher/Moderator | `POST /api/library/contents`                   | Use non-AI payload fixtures only.                  |
| Rename/update content     | Teacher/Moderator | `PATCH /api/library/contents/{id}`             | Verify title/subject/payload update.               |
| Delete content            | Teacher/Moderator | `DELETE /api/library/contents/{id}`            | Soft delete behavior.                              |
| Submit content for review | Teacher/Moderator | `POST /api/library/contents/{id}/submission`   | PRIVATE/REJECTED to SUBMITTED.                     |
| Unsubmit content          | Teacher/Moderator | `DELETE /api/library/contents/{id}/submission` | SUBMITTED to PRIVATE.                              |
| Owner isolation           | Teacher/Moderator | Library APIs                                   | Negative test: cannot access other user's content. |

### 5. Community Hub Content

| Function                        | Role                                     | Screen/API                                | Notes                                       |
| ------------------------------- | ---------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| View approved Hub feed          | Guest/All users                          | `/community-hub`, `GET /api/hub/contents` | Public approved content only.               |
| View approved content detail    | Guest/All users                          | `GET /api/hub/contents/{id}`              | Guest preview is included for Hub.          |
| Customize Hub content           | Teacher                                  | `POST /api/hub/contents/{id}/customize`   | Copy approved content into private library. |
| Deny customize for invalid role | Guest/Student/Moderator where applicable | `POST /api/hub/contents/{id}/customize`   | Negative permission tests.                  |

### 6. Community Hub Feedback

| Function                      | Role              | Screen/API                             | Notes                                                |
| ----------------------------- | ----------------- | -------------------------------------- | ---------------------------------------------------- |
| Create comment                | Teacher/Moderator | `POST /api/hub/contents/{id}/comments` | Approved content only.                               |
| Update own comment            | Teacher/Moderator | `PATCH /api/hub/comments/{commentId}`  | Owner-only.                                          |
| Delete own comment            | Teacher/Moderator | `DELETE /api/hub/comments/{commentId}` | Author can delete.                                   |
| Delete comment on own content | Content owner     | `DELETE /api/hub/comments/{commentId}` | Owner of content can delete comments on own content. |
| Report content                | Teacher/Moderator | `POST /api/hub/contents/{id}/reports`  | Report record is created.                            |
| Permission denial             | Guest/Other user  | Comment/report APIs                    | Negative tests.                                      |

### 7. Hub Moderation

| Function                  | Role                    | Screen/API                                                      | Notes                                |
| ------------------------- | ----------------------- | --------------------------------------------------------------- | ------------------------------------ |
| View moderation queue     | Moderator               | `/hub-moderation`, `GET /api/library/contents/moderation-queue` | Submitted content only.              |
| Approve submitted content | Moderator               | `POST /api/library/contents/{id}/approval`                      | Status becomes APPROVED.             |
| Reject submitted content  | Moderator               | `POST /api/library/contents/{id}/rejection`                     | Status becomes REJECTED with reason. |
| Permission denial         | Teacher/Principal/Guest | Moderation APIs                                                 | Negative RBAC tests.                 |

### 8. Blog CRUD & Moderation

| Function                  | Role                   | Screen/API                              | Notes                      |
| ------------------------- | ---------------------- | --------------------------------------- | -------------------------- |
| View blog list            | Authenticated users    | `/blog`, `GET /api/blog-posts`          | Published posts only.      |
| View blog detail          | Authenticated users    | `GET /api/blog-posts/{id}`              | Authenticated detail view. |
| Create blog post          | Teacher                | `POST /api/blog-posts`                  | Sanitized HTML content.    |
| Edit own blog post        | Teacher owner          | `PATCH /api/blog-posts/{id}`            | Owner-only.                |
| Delete own blog post      | Teacher owner          | `DELETE /api/blog-posts/{id}`           | Soft delete by author.     |
| Create blog comment       | Teacher                | `POST /api/blog-posts/{id}/comments`    | Published post only.       |
| Update own blog comment   | Teacher owner          | `PATCH /api/blog-comments/{commentId}`  | Owner-only.                |
| Delete own blog comment   | Teacher owner          | `DELETE /api/blog-comments/{commentId}` | Owner-only.                |
| View blog moderation list | Moderator              | `/blog/moderation`                      | Moderation screen.         |
| Remove blog post          | Moderator              | `POST /api/blog-posts/{id}/removal`     | Remove with reason.        |
| Permission denial         | Non-owner/invalid role | Blog APIs                               | Negative tests.            |

### 9. Notification Management

| Function                    | Role                      | Screen/API                                  | Notes                             |
| --------------------------- | ------------------------- | ------------------------------------------- | --------------------------------- |
| Create notification         | Moderator                 | `/notifications`, `POST /api/notifications` | Broadcast to teachers by subject. |
| View my notifications       | Authenticated users       | `GET /api/notifications`                    | Recipient-specific list.          |
| View unread count           | Authenticated users       | `GET /api/notifications/unread-count`       | Badge/count integration.          |
| Mark notification as read   | Authenticated users       | `PATCH /api/notifications/{id}/read`        | Owner recipient only.             |
| Mark all as read            | Authenticated users       | `POST /api/notifications/read-all`          | All user's unread notifications.  |
| Permission denial on create | Teacher/Student/Principal | `POST /api/notifications`                   | Moderator-only create.            |

### 10. Activity Log

| Function                            | Role         | Screen/API                                                 | Notes                        |
| ----------------------------------- | ------------ | ---------------------------------------------------------- | ---------------------------- |
| View activity log                   | IT Staff     | `/it-staff/activity-log`, `GET /api/it-staff/activity-log` | IT Staff-only.               |
| Filter by action/category/user/date | IT Staff     | `GET /api/it-staff/activity-log`                           | Query parameter integration. |
| Permission denial                   | Non-IT Staff | Activity log API/screen                                    | Negative RBAC tests.         |

### 11. Classroom CRUD

| Function                  | Role                    | Screen/API                           | Notes                                      |
| ------------------------- | ----------------------- | ------------------------------------ | ------------------------------------------ |
| Create class              | Teacher/Moderator       | `/create-class`, `POST /api/classes` | Create ACTIVE class owned by current user. |
| List owned classes        | Teacher/Moderator       | `GET /api/classes`                   | Filter by subject, grade, status, keyword. |
| View class detail         | Owner/Enrolled student  | `GET /api/classes/{id}`              | Owner or enrolled student can view.        |
| Update class info         | Teacher/Moderator owner | `PATCH /api/classes/{id}`            | Name, subject, grade, description.         |
| Activate/deactivate class | Teacher/Moderator owner | `PATCH /api/classes/{id}/status`     | Status transition.                         |
| Permission denial         | Stranger/invalid role   | Class APIs                           | Negative owner/RBAC tests.                 |

### 12. Classroom Membership

| Function                      | Role                    | Screen/API                                       | Notes                                    |
| ----------------------------- | ----------------------- | ------------------------------------------------ | ---------------------------------------- |
| Add student by Gmail          | Teacher/Moderator owner | `/add-student`, `POST /api/classes/{id}/members` | Creates/grants STUDENT role when needed. |
| Import students               | Teacher/Moderator owner | `POST /api/classes/{id}/members/import`          | CSV/XLSX import with valid/invalid rows. |
| List class members            | Owner/Enrolled student  | `GET /api/classes/{id}/members`                  | Member roster.                           |
| Student list enrolled classes | Student                 | `/list-class`, `GET /api/classes/enrolled`       | Student-specific class list.             |
| Prevent duplicate enrollment  | Teacher/Moderator owner | Member APIs                                      | Negative duplicate test.                 |
| Permission denial             | Stranger/invalid role   | Member APIs                                      | Negative owner/RBAC tests.               |

### 13. Classroom Resource CRUD

| Function             | Role                    | Screen/API                                        | Notes                                                |
| -------------------- | ----------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Post resource        | Teacher/Moderator owner | `POST /api/classes/{id}/resources`                | File/library resource, optional assignment deadline. |
| List resources       | Owner/Enrolled student  | `GET /api/classes/{id}/resources`                 | Resource list by class.                              |
| View resource detail | Owner/Enrolled student  | `/detail-resource`                                | FE detail uses resource APIs.                        |
| Update resource      | Teacher/Moderator owner | `PATCH /api/classes/{id}/resources/{resourceId}`  | Title, description, attachment, deadline.            |
| Delete resource      | Teacher/Moderator owner | `DELETE /api/classes/{id}/resources/{resourceId}` | Resource removed from class.                         |
| Permission denial    | Student/Stranger        | Resource write APIs                               | Negative tests.                                      |

### 14. Assignment Submission

| Function              | Role                         | Screen/API                                                   | Notes                                |
| --------------------- | ---------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| Submit assignment     | Student enrolled             | `POST /api/classes/{id}/resources/{resourceId}/submission`   | Text and/or file attachments.        |
| View own submission   | Student enrolled             | `GET /api/classes/{id}/resources/{resourceId}/submission`    | Own submission detail.               |
| Unsubmit assignment   | Student enrolled             | `DELETE /api/classes/{id}/resources/{resourceId}/submission` | Submission withdrawn.                |
| Submit after deadline | Student enrolled             | Submission API                                               | Verify late status where applicable. |
| Permission denial     | Non-enrolled student/teacher | Submission API                                               | Negative tests.                      |

### 15. Submission Review

| Function                       | Role                    | Screen/API                                                             | Notes                         |
| ------------------------------ | ----------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| View submission roster         | Teacher/Moderator owner | `GET /api/classes/{id}/resources/{resourceId}/submissions`             | Roster for assignment.        |
| View student submission detail | Teacher/Moderator owner | `GET /api/classes/{id}/resources/{resourceId}/submissions/{studentId}` | Detail includes files/status. |
| Permission denial              | Student/Stranger        | Review APIs                                                            | Negative tests.               |

### 16. Weekly Task / Lesson Plan Approval

| Function                     | Role              | Screen/API                                                        | Notes                                                                      |
| ---------------------------- | ----------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| View weekly schedule         | Teacher/Moderator | `/weekly-schedule`, `GET /api/weekly-tasks`                       | Teacher sees own tasks; Moderator manages queue.                           |
| Create weekly task           | Moderator         | `POST /api/weekly-tasks`                                          | Assign lesson plan task to teacher.                                        |
| Bulk create weekly tasks     | Moderator         | `POST /api/weekly-tasks/bulk`                                     | Multiple tasks in one request.                                             |
| Update weekly task           | Moderator         | `PATCH /api/weekly-tasks/{id}`                                    | Scope/deadline update.                                                     |
| Teacher submit lesson plan   | Teacher           | `POST /api/weekly-tasks/{id}/submission`                          | Use pre-existing lesson plan/file fixture only; do not test AI generation. |
| Teacher unsubmit lesson plan | Teacher           | `DELETE /api/weekly-tasks/{id}/submission`                        | Before review/deadline rule.                                               |
| View lesson approval queue   | Moderator         | `/lesson-plan-approval`, `GET /api/weekly-tasks/moderation-queue` | Submitted tasks.                                                           |
| Approve lesson plan          | Moderator         | `POST /api/weekly-tasks/{id}/approval`                            | Review status APPROVED.                                                    |
| Reject lesson plan           | Moderator         | `POST /api/weekly-tasks/{id}/rejection`                           | Review status REJECTED with reason.                                        |
| Permission/deadline denial   | Teacher/Moderator | Weekly task APIs                                                  | Negative tests for wrong role, wrong owner, deadline lock.                 |

## Recommended Thread-Based Smoke Flows

| Flow ID     | Flow                                                                                              | Covered Sheets                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| IT-SMOKE-01 | Principal creates Moderator -> Moderator creates Teacher -> Teacher login/profile check           | Authentication & Profile, User Management CRUD                                                          |
| IT-SMOKE-02 | Teacher creates Library content -> submits to Hub -> Moderator approves -> authorized user views Hub detail | Personal Library CRUD, Hub Moderation, Community Hub Content                                            |
| IT-SMOKE-03 | Teacher creates Blog post -> Teacher edits -> Moderator removes                                   | Blog CRUD & Moderation                                                                                  |
| IT-SMOKE-04 | Teacher creates Class -> adds Student -> posts Assignment -> Student submits -> Teacher reviews   | Classroom CRUD, Classroom Membership, Classroom Resource CRUD, Assignment Submission, Submission Review |
| IT-SMOKE-05 | Moderator creates Weekly Task -> Teacher submits Lesson Plan -> Moderator approves/rejects        | Weekly Task / Lesson Plan Approval                                                                      |
