import Link from "next/link";
import { box, COLOR, FRAME_WIDTH, HEADER_HEIGHT, serif } from "./_shared";

// Thanh headbar tách riêng: logo EDUA, nav Meet/Platform, nút Start/Contact.
// Toạ độ tuyệt đối theo frame Figma; header kết thúc tại đường divider y = HEADER_HEIGHT.
export function HeaderBar() {
  return (
    <div
      className="relative"
      style={{
        width: "100%",
        height: HEADER_HEIGHT,
        backgroundColor: COLOR.pageBg,
      }}
    >
      {/* Vector 2 — full-viewport header divider ở đáy thanh headbar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          backgroundColor: COLOR.inkHeader,
          zIndex: 10,
        }}
      />

      {/* 1280px centered content frame — các toạ độ Figma đều theo frame này */}
      <div
        className="relative mx-auto"
        style={{ width: FRAME_WIDTH, height: "100%" }}
      >
        <div
          className={serif.className}
          style={{
            ...box(74, 32, 49, 18),
            fontSize: 16,
            fontWeight: 700,
            lineHeight: "16px",
            color: COLOR.inkBlack,
          }}
        >
          EDUA
        </div>

        <Link
          href="/community-hub"
          style={{
            ...box(735, 28, 90, 17),
            fontSize: 14,
            lineHeight: "14px",
            color: COLOR.inkHeader,
            textDecoration: "none",
          }}
        >
          Cộng đồng
        </Link>

        <Link
          href="/periodic-table"
          style={{
            ...box(835, 28, 110, 17),
            fontSize: 14,
            lineHeight: "14px",
            color: COLOR.inkHeader,
            textDecoration: "none",
          }}
        >
          Bảng tuần hoàn
        </Link>

        <a
          href="#features"
          style={{
            ...box(1027, 24, 100, 26),
            border: `1px solid ${COLOR.border}`,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLOR.inkMuted,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Start
        </a>

        <Link
          href="/login"
          style={{
            ...box(1144, 24, 100, 26),
            backgroundColor: COLOR.ink,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLOR.pageBg,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}
