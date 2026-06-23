import { Anton, Poltawski_Nowy, Roboto, Rubik } from "next/font/google";
import type { CSSProperties } from "react";

export const rubik = Rubik({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const serif = Poltawski_Nowy({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const anton = Anton({
  subsets: ["latin"],
  weight: "400",
});

export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

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
    body: "Chọn sách, chương, bài học và AI sinh giáo án có cấu trúc đầy đủ: mục tiêu, hoạt động, phương pháp, củng cố và bài tập về nhà.",
  },
  {
    title: "Tạo slide bài giảng tự động",
    body: "Từ giáo án có sẵn, hệ thống dựng outline rồi stream từng slide kèm hình minh hoạ để bạn duyệt và chỉnh sửa.",
  },
  {
    title: "Thí nghiệm số tương tác",
    body: "Sinh mô phỏng vật lý và hoá học HTML để học sinh thao tác trực tiếp trên lớp mà không cần thiết bị thật.",
  },
  {
    title: "Phòng thí nghiệm hoá học ảo",
    body: "Kéo thả hoá chất và dụng cụ vào bình, mô phỏng phản ứng theo thời gian thực kèm cảnh báo an toàn.",
  },
  {
    title: "Thư viện tài liệu dùng chung",
    body: "Lưu mọi giáo án và slide đã tạo, hoặc upload PDF/DOCX có sẵn để tái sử dụng và chia sẻ.",
  },
  {
    title: "Tham chiếu phong cách giảng dạy",
    body: "Chọn một bộ tài liệu mẫu làm style reference; AI sẽ bắt chước văn phong và bố cục trình bày của bạn.",
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
