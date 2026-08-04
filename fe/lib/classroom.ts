export const CLASS_SUBJECTS = ["MATH", "CHEMISTRY", "PHYSICS"] as const;
export type ClassSubject = (typeof CLASS_SUBJECTS)[number];

export const CLASS_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];

export const SUBJECT_LABELS: Record<ClassSubject, string> = {
  MATH: "Toán học",
  CHEMISTRY: "Hóa học",
  PHYSICS: "Vật lý",
};

export const STATUS_LABELS: Record<ClassStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Đã lưu trữ",
};

export type StudentStatus = "INVITED" | "ACTIVE" | "DISABLED";

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  INVITED: "Chưa đăng nhập",
  ACTIVE: "Đã kích hoạt",
  DISABLED: "Đã khóa",
};

export const IMPORT_SKIP_REASON_LABELS: Record<string, string> = {
  INVALID_FORMAT: "Email sai định dạng",
  INVALID_STUDENT_DATA: "Thiếu hoặc sai Họ tên, Số điện thoại hoặc Ngày sinh",
  DUPLICATE_IN_FILE: "Trùng trong tệp",
  ALREADY_ENROLLED: "Đã có trong lớp",
  ROLE_CONFLICT: "Email đã thuộc vai trò khác",
  ACCOUNT_DISABLED: "Tài khoản đã bị khóa",
  PROFILE_MISMATCH: "Gmail đã có hồ sơ với thông tin không khớp",
  CLASS_FULL: "Lớp đã đủ sĩ số",
};

export type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ClassSummary = {
  id: string;
  name: string;
  subject: ClassSubject;
  grade: number;
  memberCount: number;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClassDetail = ClassSummary & {
  description: string | null;
  ownerId: string;
  ownerName: string | null;
  resourceCount: number;
  assignmentCount: number;
  submissionCount: number;
};

export type ClassPage = {
  items: ClassSummary[];
  page: number;
  size: number;
  total: number;
};

export type ClassFilters = {
  q?: string;
  subject?: ClassSubject | "";
  grade?: number | "";
  status?: ClassStatus | "";
  page?: number;
  size?: number;
};

export type CreateClassPayload = {
  name: string;
  subject: ClassSubject;
  grade: number;
  description?: string | null;
};

export type UpdateClassPayload = Partial<CreateClassPayload>;

export type ClassMember = {
  id: string;
  studentId: string;
  studentEmail: string | null;
  studentName: string | null;
  studentStatus: StudentStatus | null;
  joinedAt: string;
};

export type ClassMemberPage = {
  items: ClassMember[];
  page: number;
  size: number;
  total: number;
};

export type ImportSkippedRow = {
  row: number;
  email: string | null;
  reason: string;
};

export type ImportStudentsResult = {
  addedCount: number;
  skippedCount: number;
  skipped: ImportSkippedRow[];
};

export const RESOURCE_SOURCE_TYPES = ["LIBRARY_SNAPSHOT", "FILE_UPLOAD"] as const;
export type ResourceSourceType = (typeof RESOURCE_SOURCE_TYPES)[number];

export const RESOURCE_SOURCE_TYPE_LABELS: Record<ResourceSourceType, string> = {
  LIBRARY_SNAPSHOT: "Từ thư viện cá nhân",
  FILE_UPLOAD: "Tệp tải lên",
};

export type SubmissionStatus = "NOT_APPLICABLE" | "NOT_SUBMITTED" | "ON_TIME" | "LATE";

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  NOT_APPLICABLE: "Không yêu cầu nộp bài",
  NOT_SUBMITTED: "Chưa nộp bài",
  ON_TIME: "Đã nộp - Đúng hạn",
  LATE: "Đã nộp - Trễ hạn",
};

export type ClassResourceAttachment = {
  fileName: string | null;
  url: string | null;
  contentType: string | null;
  sizeBytes: number | null;
};

export type ClassResourceSummary = {
  id: string;
  title: string;
  description: string | null;
  sourceType: ResourceSourceType;
  thumbnailUrl: string | null;
  attachment: ClassResourceAttachment | null;
  submissionEnabled: boolean;
  deadline: string | null;
  postedByName: string | null;
  postedAt: string;
  submissionStatus: SubmissionStatus;
};

export type ClassResourcePage = {
  items: ClassResourceSummary[];
  page: number;
  size: number;
  total: number;
};

/** Nội dung thư viện được đọc trong phạm vi lớp; không cấp quyền sửa thư viện gốc. */
export type ClassResourceLibraryContent = {
  id: string;
  type: "LESSON_PLAN" | "SLIDE_DECK" | "TEST" | "SIMULATION";
  title: string;
  subject: ClassSubject | null;
  payload: unknown;
  thumbnailUrl: string | null;
};

export type ClassResourceAttachmentInput = {
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type PostClassResourcePayload = {
  title?: string | null;
  description?: string | null;
  sourceType: ResourceSourceType;
  sourceLibraryContentId?: string | null;
  attachment?: ClassResourceAttachmentInput | null;
  submissionEnabled: boolean;
  deadline?: string | null;
};

export type UpdateClassResourcePayload = {
  title?: string;
  description?: string | null;
  attachment?: ClassResourceAttachmentInput | null;
  submissionEnabled?: boolean;
  deadline?: string | null;
};

export type UploadedFile = {
  fileId: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export function sourceTypeLabel(sourceType: string): string {
  return RESOURCE_SOURCE_TYPE_LABELS[sourceType as ResourceSourceType] ?? sourceType;
}

export function submissionStatusLabel(status: string): string {
  return SUBMISSION_STATUS_LABELS[status as SubmissionStatus] ?? status;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function request<T>(authFetch: AuthFetch, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await authFetch(`/api/classes${path}`, { ...init, headers });
  if (response.status === 204) return null as T;
  const data = (await response.json().catch(() => null)) as
    | { message?: string; code?: string; reason?: string; existingAccount?: ExistingAccountInfo | null }
    | T
    | null;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : response.statusText || "Không thể hoàn tất yêu cầu.";
    const code = data && typeof data === "object" && "code" in data ? String(data.code) : undefined;
    const reason = data && typeof data === "object" && "reason" in data ? String(data.reason) : undefined;
    const existingAccount =
      data && typeof data === "object" && "existingAccount" in data ? data.existingAccount : undefined;
    throw new ClassApiError(message, response.status, code, reason, existingAccount);
  }
  return data as T;
}

export function subjectLabel(subject: string): string {
  return SUBJECT_LABELS[subject as ClassSubject] ?? subject;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as ClassStatus] ?? status;
}

export function isClassSubject(value: string | null | undefined): value is ClassSubject {
  return CLASS_SUBJECTS.includes(value as ClassSubject);
}

export function studentStatusLabel(status: string | null): string {
  if (!status) return "—";
  return STUDENT_STATUS_LABELS[status as StudentStatus] ?? status;
}

export function importSkipReasonLabel(reason: string): string {
  return IMPORT_SKIP_REASON_LABELS[reason] ?? reason;
}

export async function listClasses(authFetch: AuthFetch, filters: ClassFilters = {}): Promise<ClassPage> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.grade) params.set("grade", String(filters.grade));
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 20));
  return request<ClassPage>(authFetch, `?${params.toString()}`);
}

export function listEnrolledClasses(authFetch: AuthFetch, filters: ClassFilters = {}): Promise<ClassPage> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.grade) params.set("grade", String(filters.grade));
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 20));
  return request<ClassPage>(authFetch, `/enrolled?${params.toString()}`);
}

export function createClass(authFetch: AuthFetch, payload: CreateClassPayload): Promise<ClassDetail> {
  return request<ClassDetail>(authFetch, "", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getClassDetail(authFetch: AuthFetch, id: string): Promise<ClassDetail> {
  return request<ClassDetail>(authFetch, `/${id}`);
}

export function updateClass(authFetch: AuthFetch, id: string, payload: UpdateClassPayload): Promise<ClassDetail> {
  return request<ClassDetail>(authFetch, `/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateClassStatus(authFetch: AuthFetch, id: string, status: ClassStatus): Promise<ClassDetail> {
  return request<ClassDetail>(authFetch, `/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listClassMembers(
  authFetch: AuthFetch,
  classId: string,
  page = 0,
  size = 20,
): Promise<ClassMemberPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return request<ClassMemberPage>(authFetch, `/${classId}/members?${params.toString()}`);
}

export type AddClassStudentPayload = {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  email: string;
  /** true khi giáo viên xác nhận gán lại tài khoản cũ (sau 409 PROFILE_MISMATCH). */
  reuseExistingAccount?: boolean;
};

/** Tài khoản cũ trả kèm 409 PROFILE_MISMATCH để hỏi "gán lại account cũ vào lớp không?". */
export type ExistingAccountInfo = {
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  status: string | null;
};

/** Lỗi API: kèm reason (PROFILE_MISMATCH, ALREADY_ENROLLED, ...) + existingAccount khi có. */
export class ClassApiError extends Error {
  status: number;
  code?: string;
  reason?: string;
  existingAccount?: ExistingAccountInfo | null;

  constructor(
    message: string,
    status: number,
    code?: string,
    reason?: string,
    existingAccount?: ExistingAccountInfo | null,
  ) {
    super(message);
    this.name = "ClassApiError";
    this.status = status;
    this.code = code;
    this.reason = reason;
    this.existingAccount = existingAccount;
  }
}

export function isClassAccessRevoked(error: unknown): boolean {
  return error instanceof ClassApiError && error.status === 403 && error.code === "CLASS_ACCESS_REVOKED";
}

export function addClassStudent(authFetch: AuthFetch, classId: string, payload: AddClassStudentPayload): Promise<ClassMember> {
  return request<ClassMember>(authFetch, `/${classId}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function importClassStudents(
  authFetch: AuthFetch,
  classId: string,
  file: File,
): Promise<ImportStudentsResult> {
  const formData = new FormData();
  formData.append("file", file);
  return request<ImportStudentsResult>(authFetch, `/${classId}/members/import`, {
    method: "POST",
    body: formData,
  });
}

export type RemoveStudentResult = {
  /** HARD_DELETE (học sinh chưa đăng nhập, xóa sạch) | SOFT_REMOVE (chỉ gỡ khỏi lớp, giữ dữ liệu). */
  mode: "HARD_DELETE" | "SOFT_REMOVE";
  notified: boolean;
};

/** Xóa học sinh khỏi lớp. `reason` bắt buộc khi học sinh đã kích hoạt (sẽ gửi thông báo kèm lý do). */
export function removeClassStudent(
  authFetch: AuthFetch,
  classId: string,
  studentId: string,
  reason?: string,
): Promise<RemoveStudentResult> {
  return request<RemoveStudentResult>(authFetch, `/${classId}/members/${studentId}`, {
    method: "DELETE",
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

export function listClassResources(
  authFetch: AuthFetch,
  classId: string,
  page = 0,
  size = 20,
): Promise<ClassResourcePage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return request<ClassResourcePage>(authFetch, `/${classId}/resources?${params.toString()}`);
}

export function getClassResourceLibraryContent(
  authFetch: AuthFetch,
  classId: string,
  resourceId: string,
): Promise<ClassResourceLibraryContent> {
  return request<ClassResourceLibraryContent>(authFetch, `/${classId}/resources/${resourceId}/library-content`);
}

export function postClassResource(
  authFetch: AuthFetch,
  classId: string,
  payload: PostClassResourcePayload,
): Promise<ClassResourceSummary> {
  return request<ClassResourceSummary>(authFetch, `/${classId}/resources`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateClassResource(
  authFetch: AuthFetch,
  classId: string,
  resourceId: string,
  payload: UpdateClassResourcePayload,
): Promise<ClassResourceSummary> {
  return request<ClassResourceSummary>(authFetch, `/${classId}/resources/${resourceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteClassResource(authFetch: AuthFetch, classId: string, resourceId: string): Promise<void> {
  return request<void>(authFetch, `/${classId}/resources/${resourceId}`, { method: "DELETE" });
}

export async function uploadClassResourceFile(authFetch: AuthFetch, file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await authFetch("/api/uploads", { method: "POST", body: formData });
  const data = (await response.json().catch(() => null)) as (UploadedFile & { message?: string }) | null;
  if (!response.ok) {
    throw new Error(data && "message" in data ? String(data.message) : "Không thể tải tệp lên.");
  }
  return data as UploadedFile;
}

// ---- Submit Assignment (UC-47/48) — nộp bài text và/hoặc file, thu hồi bài nộp ----

export type SubmissionFileItem = {
  fileName: string;
  url: string;
  contentType: string;
  sizeBytes: number;
};

export type SubmissionDetail = {
  id: string;
  textContent: string | null;
  files: SubmissionFileItem[];
  status: "ON_TIME" | "LATE";
  submittedAt: string;
};

export type SubmitAssignmentPayload = {
  textContent?: string | null;
  files?: SubmissionFileItem[];
};

export function submitAssignment(
  authFetch: AuthFetch,
  classId: string,
  resourceId: string,
  payload: SubmitAssignmentPayload,
): Promise<SubmissionDetail> {
  return request<SubmissionDetail>(authFetch, `/${classId}/resources/${resourceId}/submission`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function unsubmitAssignment(authFetch: AuthFetch, classId: string, resourceId: string): Promise<void> {
  return request<void>(authFetch, `/${classId}/resources/${resourceId}/submission`, { method: "DELETE" });
}

/** Tra ve {@code null} khi hoc sinh chua nop bai (404), khong coi la loi. */
export async function getMySubmission(
  authFetch: AuthFetch,
  classId: string,
  resourceId: string,
): Promise<SubmissionDetail | null> {
  const response = await authFetch(`/api/classes/${classId}/resources/${resourceId}/submission`);
  if (response.status === 404) return null;
  const data = (await response.json().catch(() => null)) as (SubmissionDetail & { message?: string }) | null;
  if (!response.ok) {
    throw new Error(data && "message" in data ? String(data.message) : "Không thể tải bài đã nộp.");
  }
  return data as SubmissionDetail;
}

// ---- Review Submissions (UC-44/45/46) — Teacher xem danh sách/chi tiết bài nộp, tải file ----

export type SubmissionRosterEntry = {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  status: SubmissionStatus;
  /** Lan nop dau tien (Submission.createdAt) — null khi status = NOT_SUBMITTED. */
  firstSubmittedAt: string | null;
  /** Lan nop gan nhat — null khi status = NOT_SUBMITTED. Khac firstSubmittedAt nghia la da nop lai. */
  submittedAt: string | null;
};

export type SubmissionRoster = {
  resourceId: string;
  deadline: string | null;
  items: SubmissionRosterEntry[];
};

export type TeacherSubmissionDetail = {
  studentId: string;
  studentName: string | null;
  textContent: string | null;
  files: SubmissionFileItem[];
  status: "ON_TIME" | "LATE";
  firstSubmittedAt: string;
  submittedAt: string;
};

/** UC-44 — danh sach toan bo hoc sinh enrolled + trang thai nop bai cho 1 resource (Teacher owner). */
export function listResourceSubmissions(
  authFetch: AuthFetch,
  classId: string,
  resourceId: string,
): Promise<SubmissionRoster> {
  return request<SubmissionRoster>(authFetch, `/${classId}/resources/${resourceId}/submissions`);
}

/** UC-45 — chi tiet bai nop cua 1 hoc sinh (Teacher owner); files[].url dung truc tiep cho UC-46 (tai xuong). */
export function getTeacherSubmissionDetail(
  authFetch: AuthFetch,
  classId: string,
  resourceId: string,
  studentId: string,
): Promise<TeacherSubmissionDetail> {
  return request<TeacherSubmissionDetail>(authFetch, `/${classId}/resources/${resourceId}/submissions/${studentId}`);
}
