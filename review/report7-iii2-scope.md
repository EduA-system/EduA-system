# Report 7 — III.2 Functional Specifications

Đã điền ngày 19/08/2026. Nguyên tắc: **chỉ lấy phần Report 3 và mục IV của Report 7 khớp nhau** — không viết mới, không bịa.

## Đã điền

| | Số |
|---|---:|
| Nhóm `2.x` | 20 |
| Màn hình `2.x.y` | 48 |
| Ảnh mockup | 53 |
| Bảng đặc tả UC | 82 |
| Dòng tham chiếu chéo | 44 |

Cấu trúc mỗi màn hình: `Heading3` nhóm → `Heading4` màn hình → `Heading6` `a. UI Specifications` / `b. UC Specifications`.

## Quy ước đã chốt

1. Nhóm theo 21 feature của mục IV, nối qua dòng `Mapped Use Case(s)` → `features.json`. **Đánh số lại tuần tự 2.1–2.20** để không có lỗ hổng số; tên nhóm giữ y hệt mục IV nên vẫn đối chiếu được.
2. Mỗi bảng đặc tả UC **chỉ chèn một lần**, ở màn hình đầu tiên tham chiếu nó; màn hình sau ghi dòng `— see <mục>`.
3. Feature `Slide Deck Generation` không có màn hình nào của Report 3 rơi vào, nên không xuất hiện ở III.2.

## Không đưa vào

| Bỏ | Số | Lý do |
|---|---:|---|
| Màn hình `3.9.3 Community Hub Moderation` | 1 | chỉ tham chiếu UC-73…76, đã bị gạt khỏi 107 UC của mục IV |
| UC của Report 3 | 28 | không màn hình nào tham chiếu, hoặc không có trong mục IV |
| UC chỉ có ở mục IV | 6 | Report 3 không có bảng đặc tả nguồn |

## 7 màn hình trải nhiều feature

| Màn hình | Xếp vào |
|---|---|
| Slide Creation | 2.2 Slide Outline |
| Slide Outline Preview | 2.2 Slide Outline |
| View Class Detail | 2.11 Classroom Management |
| View Class Resource Detail - Teacher | 2.12 Class Resources |
| Submit Assignment | 2.12 Class Resources |
| User Dashboard | 2.1 Lesson Plan Management |
| Personal Library | 2.8 Personal Library Management |

## Chi tiết

### 2.1 Lesson Plan Management  *(mục IV: 3.1)*

**2.1.1 Create lesson** — 1 mockup

- UC-05 Create Lesson Plan

**2.1.2 Edit lesson** — 1 mockup

- UC-05 Create Lesson Plan → tham chiếu tới `2.1.1`
- UC-06 Edit Lesson Plan
- UC-07 Export Lesson Plan

**2.1.3 User Dashboard** — 1 mockup

- UC-08 View Personal Library
- UC-21 View Blog List
- UC-31 View Class List
- UC-51 View Physics Simulation Library
- UC-56 View Periodic Table
- UC-59 View Molecule Structure
- UC-61 View Community Hub
- UC-83 View Weekly Schedule
- UC-94 View Notifications
- UC-05 Create Lesson Plan → tham chiếu tới `2.1.1`
- UC-12 Create Slide Outline
- UC-18 Create Test

### 2.2 Slide Outline  *(mục IV: 3.2)*

**2.2.1 Slide Creation** — 1 mockup

- UC-12 Create Slide Outline → tham chiếu tới `2.1.3`
- UC-14 Create Slide Deck

**2.2.2 Slide Outline Preview** — 1 mockup

- UC-12 Create Slide Outline → tham chiếu tới `2.1.3`
- UC-13 Edit Slide Outline
- UC-14 Create Slide Deck → tham chiếu tới `2.2.1`

**2.2.3 Slide Outline Editor** — 1 mockup

- UC-13 Edit Slide Outline → tham chiếu tới `2.2.2`

### 2.3 Slide Editing and Presentation  *(mục IV: 3.4)*

**2.3.1 Slide Deck Editor** — 1 mockup

- UC-15 Edit Slide Deck
- UC-16 Present Slide
- UC-17 Export Slide

### 2.4 Practice Exam Management  *(mục IV: 3.5)*

**2.4.1 Test Creation** — 1 mockup

- UC-18 Create Test → tham chiếu tới `2.1.3`

**2.4.2 Test Editor** — 1 mockup

- UC-19 Edit Test
- UC-20 Export Test

### 2.5 Physics Simulation Library  *(mục IV: 3.6)*

**2.5.1 Physics Simulation Library** — 1 mockup

- UC-51 View Physics Simulation Library → tham chiếu tới `2.1.3`
- UC-52 View Physics Simulation Detail

**2.5.2 Physics Simulation Detail** — 2 mockup

- UC-52 View Physics Simulation Detail → tham chiếu tới `2.5.1`
- UC-53 View Physics Simulation Analysis

### 2.6 Periodic Table  *(mục IV: 3.7)*

**2.6.1 Periodic Table** — 1 mockup

- UC-56 View Periodic Table → tham chiếu tới `2.1.3`
- UC-57 View Electron Model
- UC-58 View Element Detail

**2.6.2 View Element Detail** — 1 mockup

- UC-57 View Electron Model → tham chiếu tới `2.6.1`
- UC-58 View Element Detail → tham chiếu tới `2.6.1`

### 2.7 Molecule Modeling  *(mục IV: 3.8)*

**2.7.1 View Molecule Structure** — 1 mockup

- UC-59 View Molecule Structure → tham chiếu tới `2.1.3`
- UC-60 Generate Molecule Structure

### 2.8 Personal Library Management  *(mục IV: 3.9)*

**2.8.1 Personal Library** — 1 mockup

- UC-08 View Personal Library → tham chiếu tới `2.1.3`
- UC-10 Update Content
- UC-11 Delete Content
- UC-05 Create Lesson Plan → tham chiếu tới `2.1.1`
- UC-66 Publish Hub Content
- UC-67 Unpublish Hub Content

### 2.9 Community Hub  *(mục IV: 3.10)*

**2.9.1 View Community Hub** — 1 mockup

- UC-61 View Community Hub → tham chiếu tới `2.1.3`
- UC-62 View Public Content Detail
- UC-63 Customize Public Content

**2.9.2 View Community Hub Detail** — 1 mockup

- UC-62 View Public Content Detail → tham chiếu tới `2.9.1`
- UC-63 Customize Public Content → tham chiếu tới `2.9.1`
- UC-68 View Content Comments
- UC-69 Create Content Comment

### 2.10 Community Blog  *(mục IV: 3.11)*

**2.10.1 View Blog List** — 3 mockup

- UC-21 View Blog List → tham chiếu tới `2.1.3`
- UC-23 Create Blog Post

**2.10.2 View Blog Post Detail** — 1 mockup

- UC-22 View Blog Post Detail
- UC-26 Comment on Blog Post
- UC-28 Edit Own Blog Comment
- UC-29 Delete Own Blog Comment
- UC-30 Hide Comment on Own Blog Post
- UC-24 Edit Own Blog Post
- UC-25 Delete Own Blog Post
- UC-97 Remove Blog Post

**2.10.3 Create Blog** — 1 mockup

- UC-23 Create Blog Post → tham chiếu tới `2.10.1`

**2.10.4 Edit Blog** — 1 mockup

- UC-24 Edit Own Blog Post → tham chiếu tới `2.10.2`

**2.10.5 Blog Moderation List** — 1 mockup

- UC-96 View Assigned Subject Blog List

**2.10.6 Moderation Blog Preview** — 1 mockup

- UC-22 View Blog Post Detail → tham chiếu tới `2.10.2`
- UC-97 Remove Blog Post → tham chiếu tới `2.10.2`

### 2.11 Classroom Management  *(mục IV: 3.12)*

**2.11.1 View Class List** — 1 mockup

- UC-31 View Class List → tham chiếu tới `2.1.3`
- UC-32 Create Class
- UC-34 Set Class Status
- UC-35 View Class Detail

**2.11.2 Create Class** — 1 mockup

- UC-32 Create Class → tham chiếu tới `2.11.1`

**2.11.3 View Class Detail** — 1 mockup

- UC-35 View Class Detail → tham chiếu tới `2.11.1`
- UC-36 View Class Members
- UC-43 View Class Resources
- UC-46 View Submissions List
- UC-33 Edit Class Information
- UC-34 Set Class Status → tham chiếu tới `2.11.1`

**2.11.4 View Class Member** — 1 mockup

- UC-36 View Class Members → tham chiếu tới `2.11.3`
- UC-38 Add Student
- UC-39 Remove Student

**2.11.5 Add Student** — 1 mockup

- UC-38 Add Student → tham chiếu tới `2.11.4`

**2.11.6 Class Settings** — 1 mockup

- UC-33 Edit Class Information → tham chiếu tới `2.11.3`
- UC-34 Set Class Status → tham chiếu tới `2.11.1`

### 2.12 Class Resources  *(mục IV: 3.13)*

**2.12.1 View Class Resource** — 1 mockup

- UC-40 Post Class Resource
- UC-41 Update Class Resource
- UC-43 View Class Resources → tham chiếu tới `2.11.3`
- UC-44 View Class Resource Detail
- UC-45 Download Assigned Material

**2.12.2 Post Class Resource** — 2 mockup

- UC-40 Post Class Resource → tham chiếu tới `2.12.1`

**2.12.3 View Class Resource Detail - Teacher** — 1 mockup

- UC-44 View Class Resource Detail → tham chiếu tới `2.12.1`
- UC-41 Update Class Resource → tham chiếu tới `2.12.1`
- UC-46 View Submissions List → tham chiếu tới `2.11.3`

**2.12.4 Submit Assignment** — 2 mockup

- UC-44 View Class Resource Detail → tham chiếu tới `2.12.1`
- UC-45 Download Assigned Material → tham chiếu tới `2.12.1`
- UC-49 Submit Assignment
- UC-50 Unsubmit Assignment

### 2.13 Assignment Submissions  *(mục IV: 3.14)*

**2.13.1 View Submission List** — 1 mockup

- UC-46 View Submissions List → tham chiếu tới `2.11.3`
- UC-47 View Submission Detail

**2.13.2 View Submission Details** — 1 mockup

- UC-47 View Submission Detail → tham chiếu tới `2.13.1`
- UC-48 Download Submission File

### 2.14 Weekly Task Management  *(mục IV: 3.15)*

**2.14.1 Weekly schedule** — 1 mockup

- UC-83 View Weekly Schedule → tham chiếu tới `2.1.3`
- UC-85 Edit Weekly Task

**2.14.2 Weekly task detail** — 1 mockup

- UC-83 View Weekly Schedule → tham chiếu tới `2.1.3`

**2.14.3 Weekly task lesson plan document** — 1 mockup

- UC-87 Submit Lesson Plan for Weekly Task

**2.14.4 Lesson Plan Approval List** — 1 mockup

- UC-89 View Lesson Plan Approval List
- UC-90 View Lesson Plan Detail
- UC-91 Approve Lesson Plan
- UC-92 Reject Lesson Plan

**2.14.5 Lesson Plan Submission Detail** — 1 mockup

- UC-90 View Lesson Plan Detail → tham chiếu tới `2.14.4`

### 2.15 Notification Management  *(mục IV: 3.16)*

**2.15.1 Notification** — 1 mockup

- UC-94 View Notifications → tham chiếu tới `2.1.3`

### 2.16 Authentication and Profile Management  *(mục IV: 3.17)*

**2.16.1 User Profile** — 1 mockup

- UC-04 Update Profile Information
- UC-03 Logout

### 2.17 Teacher Account Management  *(mục IV: 3.18)*

**2.17.1 Teacher List** — 1 mockup

- UC-77 View Teacher List
- UC-79 Add Teacher
- UC-80 Update Teacher Account
- UC-81 Reactivate Teacher Account
- UC-82 Deactivate Teacher Account

**2.17.2 Teacher Detail** — 1 mockup

- UC-78 View Teacher Detail

### 2.18 Staff Account Management  *(mục IV: 3.19)*

**2.18.1 Moderator List** — 1 mockup

- UC-102 View Staff List
- UC-104 Add Moderator Account
- UC-105 Replace Moderator Account

### 2.19 System Administration  *(mục IV: 3.20)*

**2.19.1 System Promt Configuration** — 1 mockup

- UC-100 View System Prompts
- UC-101 Update System Prompts

**2.19.2 Acitivity Log** — 1 mockup

- UC-99 View & Filter Activity Log

### 2.20 Statistics and Reporting  *(mục IV: 3.21)*

**2.20.1 Teacher List** — 1 mockup

- UC-109 View School-wide Statistics Dashboard

