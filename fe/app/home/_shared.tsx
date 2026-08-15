import type { CSSProperties } from "react";

export const rubik = { className: "font-sans" };
export const serif = { className: "font-serif" };

export const FRAME_WIDTH = 1280;
export const HEADER_HEIGHT = 68; // y of the header divider in the Figma hero frame
export const HERO_FRAME_HEIGHT = 680;

export const COLOR = {
  pageBg: "#FBFFF8",
  ink: "#012030",
  inkBlack: "#000000",
  inkMuted: "#455C66",
  inkMutedSoft: "rgba(69, 92, 102, 0.73)",
  inkHeader: "rgba(1, 32, 48, 0.73)",
  border: "#5B7078",
  divider: "#9c9c9cff",
} as const;

export const FEATURES = [
  {
    title: "Soạn giáo án trong vài phút",
    body: "Chọn sách, chương, bài học — AI sinh giáo án theo cấu trúc Công văn 5512: mục tiêu và các hoạt động Mở đầu, Hình thành kiến thức, Luyện tập, Vận dụng.",
  },
  {
    title: "Tạo slide bài giảng tự động",
    body: "Từ giáo án có sẵn, hệ thống dựng outline rồi stream từng slide kèm hình minh hoạ để bạn duyệt và chỉnh sửa.",
  },
  {
    title: "Thí nghiệm vật lý tương tác",
    body: "Sinh mô phỏng vật lý HTML — cơ học, dao động & sóng, quang học, điện & từ, nhiệt khí, hạt nhân — để học sinh thao tác trực tiếp trên lớp mà không cần thiết bị thật.",
  },
  {
    title: "Trực quan hoá cấu trúc phân tử",
    body: "AI dựng mô hình phân tử 3D (dạng khung nối hoặc đặc khít) cho ankan, anken, ankin để học sinh quan sát và xoay trực tiếp trên lớp.",
  },
  {
    title: "Thư viện tài liệu dùng chung",
    body: "Lưu mọi giáo án, slide và mô phỏng đã tạo; gửi lên Hub cộng đồng để chia sẻ sau khi được duyệt.",
  },
  {
    title: "Bảng tuần hoàn tương tác",
    body: "Tra cứu, lọc và so sánh nguyên tố theo tính chất — nhiệt độ nóng chảy, độ âm điện, năng lượng ion hoá — ngay trong bài giảng.",
  },
];

export function box(
  left: number,
  top: number,
  width: number,
  height: number,
): CSSProperties {
  return { position: "absolute", left, top, width, height };
}

export function ChevronDown() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M3.11 4.23 L6 7.65 L8.89 4.23 Z" />
    </svg>
  );
}

// Crops a region from math.svg using CSS background-image sprite technique.
// ox/oy: top-left of crop in SVG canvas coords (0-400); cropW/cropH: crop size; displayW: rendered px width.
export function MathDecor({
  ox, oy, cropW, cropH, displayW, style,
}: {
  ox: number; oy: number; cropW: number; cropH: number; displayW: number;
  style?: CSSProperties;
}) {
  const scale = displayW / cropW;
  const imgSize = 400 * scale;
  return (
    <div
      style={{
        width: displayW,
        height: Math.round(cropH * scale),
        backgroundImage: "url(/math.svg)",
        backgroundSize: `${imgSize}px ${imgSize}px`,
        backgroundPosition: `${-ox * scale}px ${-oy * scale}px`,
        backgroundRepeat: "no-repeat",
        pointerEvents: "none",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function ImgDecor({
  src,
  width,
  style,
}: {
  src: string;
  width: number;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={width}
      style={{ display: "block", pointerEvents: "none", userSelect: "none", ...style }}
    />
  );
}

// Horizontal divider, #6D6D6D. `offset` shifts the line left, `width` defaults to 442.
export function HRule({ offset, width = 482 }: { offset: number; width?: number }) {
  return (
    <div
      style={{
        marginLeft: offset,
        marginTop: 36,
        marginBottom: 36,
        width,
        height: 1,
        backgroundColor: COLOR.divider,
      }}
    />
  );
}

// Vertical divider — width 1, stretches to the section's height.
export function VRule({ left }: { left: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: COLOR.divider,
      }}
    />
  );
}
