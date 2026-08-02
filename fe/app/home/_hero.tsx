import Link from "next/link";
import { TitleTicker } from "./TitleTicker";
import { box, COLOR, FRAME_WIDTH, HEADER_HEIGHT, HERO_FRAME_HEIGHT, ImgDecor, serif } from "./_shared";
import { HeroVideo } from "./_hero-video";
import { HeroGlow, type BoundRect } from "./HeroGlow";

// ════════════════════════════════════════════════════════════════════════════
// Hero content — tách riêng khỏi headbar.
// Toạ độ y của Figma được trừ đi HEADER_HEIGHT (68) vì hero nằm ngay dưới header.
// ════════════════════════════════════════════════════════════════════════════
const HERO_CONTENT_HEIGHT = HERO_FRAME_HEIGHT - HEADER_HEIGHT;

// ─── Layout regions — một nguồn sự thật duy nhất cho toạ độ nội dung ─────────
// Mỗi region định nghĩa {left, top, width, height} theo frame nội dung 1280px.
// Vùng cô lập glow được tính tự động từ union của các region (xem ISOLATE_BOUNDS).
const PADDING = 0; // padding vùng cô lập quanh nội dung thật (px); 0 = đỏ khít xanh

const TITLE      = { left: 76,  top: 190, width: 760,  height: 56  };
// Ticker: prefix "for High School " (~403px) + slot động tối đa "Chemistry Teachers" (~460px)
// = ~863px text. Đặt 870px để dư ~30px an toàn (không crop text khi xoay Chemistry).
const TICKER     = { left: 186, top: 264, width: 870,  height: 56  }; // dòng ticker động
const SUBTITLE   = { left: 617, top: 356, width: 337,  height: 68  }; // mô tả 2 dòng
const CTA_PRIMARY = { left: 617, top: 430, width: 120, height: 32  };
const CTA_OUTLINE = { left: 730, top: 430, width: 160, height: 32  };
const VIDEO      = { left: 200, top: 340, width: 300,  height: 220 }; // HeroVideo (bên trái, ngoài vùng cô lập)

// ─── Vùng cô lập: 6 vùng khớp SAT từng cụm nội dung (PADDING=0 → đỏ = xanh) ─
// Ô kính (phần nổi) KHÔNG được sáng trong các vùng này; glow blob vàng (phần chìm)
// vẫn toả sáng xuyên qua. HeroGlow vẽ ngay trong khối hero (đã trừ header), nên
// toạ độ Y phải theo hệ hero = top Figma − HEADER_HEIGHT (khớp regionStyle()).
// Mỗi vùng = 1 cụm nội dung riêng → vùng đỏ ôm khít text/nút, không dính nhau.
function pad(r: { left: number; top: number; width: number; height: number }): BoundRect {
  return {
    left: r.left - PADDING,
    right: r.left + r.width + PADDING,
    top: r.top - HEADER_HEIGHT - PADDING,
    bottom: r.top + r.height - HEADER_HEIGHT + PADDING,
  };
}
const CONTENT_BOUNDS: BoundRect[] = [
  pad(TITLE),        // vùng 1: tiêu đề "Intelligent Assistant System"
  pad(TICKER),       // vùng 2: dòng ticker động
  pad(SUBTITLE),     // vùng 3: mô tả 2 dòng
  pad(CTA_PRIMARY),  // vùng 4: nút Start (filled)
  pad(CTA_OUTLINE),  // vùng 5: nút Start (outline)
  pad(VIDEO),        // vùng 6: HeroVideo (cột trái)
];

// Helper: chuyển region (left/top/width/height) sang style cho box()
function regionStyle(r: { left: number; top: number; width: number; height: number }) {
  return box(r.left, r.top - HEADER_HEIGHT, r.width, r.height);
}

export function HeroSection() {
  return (
    <div
      className="relative"
      style={{
        width: "100%",
        height: HERO_CONTENT_HEIGHT,
        backgroundColor: COLOR.pageBg,
      }}
    >
      {/* ── Interactive glass grid + golden glow that follows the cursor ── */}
      <HeroGlow bounds={CONTENT_BOUNDS} contentFrameWidth={FRAME_WIDTH} />

      {/* Vector 3 — hero bottom divider, full width để sát cạnh vùng HeroGlow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          backgroundColor: COLOR.divider,
        }}
      />

      {/* ── Decorations — hero margins ── */}
      <ImgDecor src="/home/Asset 19.svg" width={88} style={{ position:"absolute", left:"1%",   top:"18%", opacity:0.85, animation:"mathBubble 5.5s ease-in-out infinite" }} />
      <ImgDecor src="/home/Asset 7.svg"  width={38} style={{ position:"absolute", left:"2%",   top:"50%", opacity:0.78, animation:"mathWiggle 4s   ease-in-out infinite 0.8s" }} />
      <ImgDecor src="/home/Asset 3.svg"  width={38} style={{ position:"absolute", left:"3.5%", top:"79%", opacity:0.72, animation:"mathFloat  4.5s ease-in-out infinite 1.5s" }} />
      <ImgDecor src="/home/Asset 6.svg"  width={80} style={{ position:"absolute", right:"1%",  top:"20%", opacity:0.85, animation:"mathBubble 5s   ease-in-out infinite 0.4s" }} />
      <ImgDecor src="/home/Asset 10.svg" width={80} style={{ position:"absolute", right:"1%",  top:"52%", opacity:0.80, animation:"mathWiggle 5.5s ease-in-out infinite 1s" }} />
      <ImgDecor src="/home/Asset 11.svg" width={58} style={{ position:"absolute", right:"7%",  top:"76%", opacity:0.72, animation:"mathBob    4.5s ease-in-out infinite 0.5s" }} />

      {/* 1280px centered content frame — all Figma coordinates are relative to this */}
      <div className="relative mx-auto" style={{ width: FRAME_WIDTH, height: "100%" }}>
        {/* ── Khối nội dung (cột phải) — nằm trong vùng cô lập glow ── */}
        <div
          className={serif.className}
          style={{
            ...regionStyle(TITLE),
            fontSize: 48,
            lineHeight: "56px",
            color: COLOR.ink,
            whiteSpace: "nowrap",
          }}
        >
          Hệ thống trợ lý thông minh
        </div>

        {/* Ticker — dòng chữ động, đặt riêng vì rộng qua mép phải */}
        <div style={{ ...regionStyle(TICKER), display: "flex", alignItems: "center" }}>
          <TitleTicker serifClass={serif.className} inkColor={COLOR.ink} />
        </div>

        <div
          style={{
            ...regionStyle(SUBTITLE),
            fontSize: 14,
            lineHeight: "20px",
            color: COLOR.inkMutedSoft,
          }}
        >
          EDUA - Hệ thống trợ lý thông minh dành cho
          <br />
          giáo viên phổ thông dạy các môn khoa học tự nhiên
        </div>

        <Link
          href="/lesson-create"
          style={{
            ...regionStyle(CTA_PRIMARY),
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
          Tạo giáo án
        </Link>

        <a
          href="#features"
          style={{
            ...regionStyle(CTA_OUTLINE),
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
          Khám phá tính năng
        </a>

        {/* ── HeroVideo (cột trái) — ngoài vùng cô lập glow ── */}
        <HeroVideo style={regionStyle(VIDEO)} />
      </div>
    </div>
  );
}
