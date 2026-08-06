import type {
  Activity5512,
  EquipmentAndMaterials,
  EquipmentTable,
  Objectives,
  Organization,
  Worksheet,
} from "@/data/lessonPlan5512Mock";

// API client cho luồng tạo giáo án 5512. Gọi qua same-origin `/api/*`
// (proxy tới backend cấu hình ở next.config.ts) nên không vướng CORS.

// ---- Catalog SGK (GET /api/textbooks) -----------------------------------
// Lưu ý: backend serialize `code` thành field `id` trong JSON.
export interface CatalogLesson {
  id: string;
  name: string;
  page: number | null;
}

export interface CatalogChapter {
  id: string;
  name: string;
  lessons: CatalogLesson[];
}

export interface CatalogChapterSummary {
  id: string;
  name: string;
}

export interface CatalogBook {
  id: string;
  name: string;
  grade: number;
  source?: string;
  chapters: CatalogChapter[];
}

export interface CatalogBookName {
  id: string;
  name: string;
  grade: number;
  subjectCode: string;
  subjectName: string;
  volume: number | null;
  publisher?: string | null;
  series?: string | null;
}

export interface TextbookCatalog {
  books: CatalogBook[];
}

// ---- Generate (POST /api/lesson-plans/generate) -------------------------
export interface GenerateLessonPlanRequest {
  bookId: string;
  chapterId: string;
  lessonId: string;
  userPrompt?: string;
}

/**
 * Phản hồi hiện tại của BE: title + phần I. Mục tiêu + phần II. Thiết bị và học liệu
 * + phần III. Tiến trình dạy học (mới chỉ là DÀN Ý/khung — a/b/c/d còn trống).
 */
export interface GeneratedLessonPlan {
  title: string | null;
  objectives: Objectives;
  equipmentAndMaterials?: EquipmentAndMaterials;
  activities?: Activity5512[];
}

export async function fetchTextbookCatalog(): Promise<TextbookCatalog> {
  const res = await fetch("/api/textbooks", { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Không tải được danh mục SGK (HTTP ${res.status}).`);
  }
  return res.json();
}

export async function fetchTextbookNames(subject = "PHYSICS"): Promise<CatalogBookName[]> {
  const params = new URLSearchParams({ subject });
  const res = await fetch(`/api/textbooks/names?${params.toString()}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Khong tai duoc danh sach SGK (HTTP ${res.status}).`);
  }
  return res.json();
}

export async function fetchTextbookChapters(bookId: string): Promise<CatalogChapterSummary[]> {
  const res = await fetch(`/api/textbooks/${encodeURIComponent(bookId)}/chapters`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Khong tai duoc danh sach chuong (HTTP ${res.status}).`);
  }
  return res.json();
}

export async function fetchChapterLessons(bookId: string, chapterId: string): Promise<CatalogLesson[]> {
  const res = await fetch(
    `/api/textbooks/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}/lessons`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`Khong tai duoc danh sach bai hoc (HTTP ${res.status}).`);
  }
  return res.json();
}

export async function generateLessonPlan(
  req: GenerateLessonPlanRequest,
): Promise<GeneratedLessonPlan> {
  const res = await fetch("/api/lesson-plans/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let message = `Tạo giáo án thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
  return res.json();
}

// ---- Generate Materials (POST /api/lesson-plans/generate-materials) -------
export async function generateMaterials(
  req: GenerateLessonPlanRequest,
): Promise<{ equipmentAndMaterials: EquipmentAndMaterials }> {
  const res = await fetch("/api/lesson-plans/generate-materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let message = `Tạo phần thiết bị dạy học thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
  return res.json();
}

// ---- Generate Activities (POST /api/lesson-plans/generate-activities) -----
// Phần III. Tiến trình dạy học — BE trả DÀN Ý 4 hoạt động (order/name/duration
// + tiểu hoạt động của HĐ2); a/b/c/d còn null, sẽ được điền ở bước sau.
export async function generateActivities(
  req: GenerateLessonPlanRequest,
): Promise<{ activities: Activity5512[] }> {
  const res = await fetch("/api/lesson-plans/generate-activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let message = `Tạo phần tiến trình dạy học thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
  return res.json();
}

// ---- Generate Activities Details (POST .../generate-activities-details) ----
// Phần III chi tiết: gửi kèm ngữ cảnh Phần I (objectives) + II (worksheets) + DÀN Ý
// (activities) đã sinh; BE chạy 4 call song song điền a/b/c/d cho từng hoạt động.
export interface GenerateActivityDetailsRequest extends GenerateLessonPlanRequest {
  objectives: Objectives;
  equipmentAndMaterials?: EquipmentAndMaterials;
  activities: Activity5512[];
}

export async function generateActivitiesDetails(
  req: GenerateActivityDetailsRequest,
): Promise<{ activities: Activity5512[] }> {
  const res = await fetch("/api/lesson-plans/generate-activities-details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let message = `Soạn chi tiết tiến trình dạy học thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
  return res.json();
}

/**
 * Soạn lại CHI TIẾT cho ĐÚNG MỘT hoạt động Phần III bị lỗi (nút "Thử lại" ở block lỗi).
 * Tái dùng endpoint `generate-activities-details` với `activities` chỉ gồm skeleton của
 * hoạt động cần soạn lại → BE chạy đúng 1 call `detailOne` với đầy đủ ngữ cảnh Phần I/II +
 * dàn ý gửi kèm (giữ nhất quán, không rời rạc). Gửi kèm JWT vì filter auth có thể bật.
 */
export async function retryActivityDetail(
  req: GenerateActivityDetailsRequest,
  accessToken: string,
): Promise<Activity5512> {
  const res = await fetch("/api/lesson-plans/generate-activities-details", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let message = `Soạn lại hoạt động thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
  const data = (await res.json()) as { activities?: Activity5512[] };
  const activity = data.activities?.[0];
  if (!activity) {
    throw new Error("Kết quả soạn lại rỗng — không có hoạt động trả về.");
  }
  return activity;
}

// ---- Edit Section (POST /api/lesson-plans/edit-section) ------------------
export interface EditLessonSectionRequest {
  instruction: string;
  sections: {
    id: string;
    heading: string;
    content: string;
    /** Cấu trúc bảng mà mục đang chứa — xem `lessonSections.ts#SectionKind`. */
    kind: string;
  }[];
  /** Nguồn SGK của giáo án (từ phiên streaming đang sống hoặc `payload.source` khi mở lại từ
   * Personal Library) — optional, cho phép thiếu (tài liệu cũ chưa có source). Khi có đủ, BE
   * nạp lại `knowledge_json` để bước viết bám đúng kiến thức bài, đặc biệt khi viết mới hoàn
   * toàn một mục còn trống (vd "Mời soạn tay."). */
  bookId?: string;
  chapterId?: string;
  lessonId?: string;
}

/** kind = "text" — mảng dòng độc lập (mỗi phần tử là một đoạn/câu hỏi/bullet...), thay vì một
 * chuỗi nối bằng "\n" — xem `LessonPlanEditPromptBuilder.TEXT_KIND_INSTRUCTIONS` (BE). */
export interface TextEditData {
  lines: string[];
}

/** kind = "activity" — Hoạt động cấp 1 (HĐ1/3/4), dùng `organizationText` (văn ngắn). Khớp
 * `ActivityEditContent` (BE). */
export interface ActivityEditData {
  objective: string;
  content: string;
  product: string;
  organizationText: string;
}

/** kind = "subActivity" — tiểu hoạt động của Hoạt động 2, dùng `organization` (4 bước). Khớp
 * `SubActivityEditContent` (BE), tái dùng `Organization` đã có ở `lessonPlan5512Mock.ts`. */
export interface SubActivityEditData {
  objective: string;
  content: string;
  organization: Organization;
  product: string;
}

/** kind = "materials" — khớp domain `Materials` (BE), tái dùng `EquipmentTable`/`Worksheet` đã
 * có ở `lessonPlan5512Mock.ts`. */
export interface MaterialsEditData {
  equipment: EquipmentTable;
  worksheets: Worksheet[];
}

/**
 * Bản sửa AI đề xuất cho một section — `data` là JSON có cấu trúc theo đúng `kind` (BE không
 * còn trả một chuỗi `content` tự mã hoá bảng bằng "‖"/"|"/"<br>"; xem
 * `EditLessonSectionResponse` phía BE). FE tự diễn giải theo `kind` rồi "làm đẹp" thành nội
 * dung hiển thị (TipTap) — xem `editContentToLines.ts`.
 */
export type EditLessonSectionEdit =
  | { targetId: string; kind: "text"; data: TextEditData }
  | { targetId: string; kind: "activity"; data: ActivityEditData }
  | { targetId: string; kind: "subActivity"; data: SubActivityEditData }
  | { targetId: string; kind: "materials"; data: MaterialsEditData };

export type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function editLessonSection(
  req: EditLessonSectionRequest,
  authFetch: AuthFetch,
): Promise<EditLessonSectionEdit[]> {
  const res = await authFetch("/api/lesson-plans/edit-section", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let message = `Chỉnh sửa giáo án bằng AI thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
  return res.json();
}

// ---- Streaming (POST /api/lesson-plans/generate-stream) ------------------
// Kickoff async: BE trả 202 ngay rồi đẩy tiến trình qua STOMP
// (/topic/lesson-plan/{sessionId}). FE không đọc body — chỉ kiểm 2xx.
export interface StartLessonPlanStreamRequest extends GenerateLessonPlanRequest {
  sessionId: string;
}

export async function startLessonPlanStream(
  req: StartLessonPlanStreamRequest,
  authFetch: AuthFetch,
): Promise<void> {
  const res = await authFetch("/api/lesson-plans/generate-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let message = `Khởi tạo sinh giáo án thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
}

// ---- Bàn giao phiên giữa /lesson-create và /lesson-edit -----------------
// Luồng streaming: /lesson-create chỉ kickoff rồi truyền NGỮ CẢNH PHIÊN
// (sessionId + ids) qua sessionStorage; /lesson-edit dùng sessionId để mở STOMP
// và fill dần. (Không còn truyền cả giáo án như bản đồng bộ cũ.)
const SESSION_KEY = "edua:lessonPlanSession";

export interface LessonPlanDisplayMetadata {
  title: string;
  subject: string;
  subjectCode?: "MATH" | "CHEMISTRY" | "PHYSICS";
  grade: string;
  duration: string;
}

export type LessonPlanSession = StartLessonPlanStreamRequest & {
  display?: LessonPlanDisplayMetadata;
};

export function storeLessonPlanSession(session: LessonPlanSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readLessonPlanSession(): LessonPlanSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LessonPlanSession) : null;
  } catch {
    return null;
  }
}

/** Xoá phiên sau khi đã tiêu thụ (tránh mở lại stream khi reload/quay lại). */
export function clearLessonPlanSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
