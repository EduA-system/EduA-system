import { box, ChevronDown, COLOR, FRAME_WIDTH, HEADER_HEIGHT, serif } from "./_shared";

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

        <div
          style={{
            ...box(735, 28, 33, 17),
            fontSize: 14,
            lineHeight: "14px",
            color: COLOR.inkHeader,
          }}
        >
          Meet
        </div>
        <div
          style={{
            ...box(772, 31, 12, 12),
            color: COLOR.inkHeader,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronDown />
        </div>

        <div
          style={{
            ...box(810, 28, 57, 17),
            fontSize: 14,
            lineHeight: "14px",
            color: COLOR.inkHeader,
          }}
        >
          Platform
        </div>
        <div
          style={{
            ...box(871, 31, 12, 12),
            color: COLOR.inkHeader,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronDown />
        </div>

        <a
          href="/dashboard"
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

        <a
          href="#contact"
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
          Contact
        </a>
      </div>
    </div>
  );
}
