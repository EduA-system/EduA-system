/**
 * Phân giải `physicsRequest` do AI sinh ra sang một thí nghiệm có thật trong
 * `components/simulations/presets/`.
 *
 * Vì sao để AI trả chữ tự do rồi khớp ở đây, thay vì nhồi danh mục 60 preset
 * vào prompt backend: thư mục preset là nguồn sự thật duy nhất và nó thay đổi
 * theo từng nhánh. Backend không nên biết danh sách đó.
 *
 * Hàm THUẦN (danh mục truyền vào) để test được bằng Vitest chạy môi trường
 * node — nó không đọc đĩa và không gọi mạng.
 */

/** Chỉ những trường cần để khớp; khớp cấu trúc với `ExperimentSummary`. */
export type PhysicsPresetCandidate = {
  id: string;
  presetId: string;
  title: string;
  domain: string;
  desc: string;
  grade: number | null;
};

/**
 * Bỏ dấu tiếng Việt và chuẩn hoá khoảng trắng.
 * AI hay trả "con lắc đơn" trong khi tên file là "con-lac-don".
 */
export function normalizeVietnamese(value: string): string {
  return value
    .normalize("NFD")
    // \p{M} = mọi dấu tổ hợp; NFD ở trên đã tách dấu ra khỏi chữ cái.
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Từ quá phổ biến trong tên thí nghiệm — khớp trúng chúng không nói lên gì. */
const STOP_WORDS = new Set([
  "thi", "nghiem", "mo", "phong", "hien", "tuong", "dinh", "luat",
  "cua", "va", "voi", "trong", "bang", "do", "su", "cac", "mot",
]);

function contentWords(value: string): string[] {
  return normalizeVietnamese(value).split(" ").filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Điểm khớp giữa yêu cầu và một preset. Ưu tiên theo thứ tự title → id →
 * desc → domain: tên thí nghiệm là tín hiệu chắc nhất, lĩnh vực yếu nhất
 * (mọi preset cơ học đều có domain giống nhau).
 */
function score(requestWords: string[], candidate: PhysicsPresetCandidate): number {
  const title = normalizeVietnamese(candidate.title);
  const identifier = normalizeVietnamese(`${candidate.id} ${candidate.presetId}`);
  const description = normalizeVietnamese(candidate.desc);
  const domain = normalizeVietnamese(candidate.domain);

  let total = 0;
  for (const word of requestWords) {
    if (title.includes(word)) total += 4;
    else if (identifier.includes(word)) total += 3;
    else if (description.includes(word)) total += 1;
    else if (domain.includes(word)) total += 0.5;
  }
  // Chuẩn hoá theo số từ để yêu cầu dài không tự động thắng yêu cầu ngắn.
  return total / requestWords.length;
}

/**
 * Ngưỡng nhận: trung bình mỗi từ có nghĩa phải khớp ít nhất ở mức "có trong
 * mô tả". Đặt bảo thủ có chủ đích — chèn nhầm thí nghiệm vào bài giảng tệ hơn
 * hẳn so với bỏ trống slot, và slot bỏ trống thì pipeline đã có đường xử lý
 * sẵn (giống `resolvePeriodicPayload` trả null).
 */
const ACCEPT_THRESHOLD = 2;

export function resolvePhysicsPreset(
  request: string,
  catalogue: PhysicsPresetCandidate[],
): PhysicsPresetCandidate | null {
  const words = contentWords(request);
  if (words.length === 0 || catalogue.length === 0) return null;

  let best: { candidate: PhysicsPresetCandidate; value: number } | null = null;
  for (const candidate of catalogue) {
    const value = score(words, candidate);
    if (!best || value > best.value) best = { candidate, value };
  }

  return best && best.value >= ACCEPT_THRESHOLD ? best.candidate : null;
}
