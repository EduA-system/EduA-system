// Lớp resolve tập trung cho slide-assets.
// ĐÂY LÀ CHỖ DUY NHẤT map asset -> URL. Khi sau này chuyển bytes lên Cloudflare R2
// hoặc tra metadata từ Postgres, chỉ cần sửa file này — phần còn lại không đổi.
import manifest from "./manifest.json";

const BASE = "/slide-assets";

type IconEntry = { file: string; tags: string[] };
const ICONS = manifest.icons as IconEntry[];
const BACKGROUNDS = manifest.backgrounds as { file: string }[];

export function iconUrl(file: string): string {
  return `${BASE}/icons/${file}`;
}
export function backgroundUrl(file: string): string {
  return `${BASE}/backgrounds/${file}`;
}

// Hash ổn định -> số không âm.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Chọn `count` icon phân biệt nhau, ổn định theo deck (cùng seed -> cùng bộ icon) để
// rải làm trang trí ở các góc. Lấy index bằng hash(seed + i) rồi dò tới ô trống tiếp
// theo nhằm tránh trùng. Mọi icon trong kho đều mang chất khoa học/giáo dục nên không
// cần khớp chủ đề — đây chỉ là chi tiết trang trí.
export function pickDecoIcons(seed: string, count = 3): string[] {
  const n = Math.min(count, ICONS.length);
  const used = new Set<number>();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    let idx = hash(`${seed}#${i}`) % ICONS.length;
    while (used.has(idx)) idx = (idx + 1) % ICONS.length;
    used.add(idx);
    out.push(iconUrl(ICONS[idx].file));
  }
  return out;
}

// Chọn nền ổn định theo deck (cùng seed -> cùng nền) để cả deck đồng bộ.
export function pickBackground(seed: string): string | null {
  if (BACKGROUNDS.length === 0) return null;
  return backgroundUrl(BACKGROUNDS[hash(seed) % BACKGROUNDS.length].file);
}
