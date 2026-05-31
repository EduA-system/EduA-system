import Link from "next/link";
import { TitleTicker } from "./TitleTicker";
import { box, ChevronDown, COLOR, FRAME_WIDTH, HERO_FRAME_HEIGHT, ImgDecor, serif } from "./_shared";
import { HeroVideo } from "./_hero-video";

export function HeroSection() {
  return (
    <div
      className="relative"
      style={{
        width: "100%",
        height: HERO_FRAME_HEIGHT,
        backgroundColor: COLOR.pageBg,
      }}
    >
      {/* Vector 2 — full-viewport header divider at y=68 */}
      <div
        style={{
          position: "absolute",
          top: 68,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: COLOR.divider,
        }}
      />

      {/* Vector 3 — full-viewport bottom hero divider at y=649 */}
      <div
        style={{
          position: "absolute",
          top: 649,
          left: 400,
          right: 400,
          height: 1,
          backgroundColor: COLOR.divider,
        }}
      />

      {/* ── Decorations — hero margins (all below header divider at y=68) ── */}
      {/* Left: 18% / 50% / 79% of 680px */}
      <ImgDecor src="/home/Asset 19.svg" width={88} style={{ position:"absolute", left:"1%",   top:"18%", opacity:0.85, animation:"mathBubble 5.5s ease-in-out infinite" }} />
      <ImgDecor src="/home/Asset 7.svg"  width={38} style={{ position:"absolute", left:"2%",   top:"50%", opacity:0.78, animation:"mathWiggle 4s   ease-in-out infinite 0.8s" }} />
      <ImgDecor src="/home/Asset 3.svg"  width={38} style={{ position:"absolute", left:"3.5%", top:"79%", opacity:0.72, animation:"mathFloat  4.5s ease-in-out infinite 1.5s" }} />
      {/* Right: 20% / 52% / 76% — moved 6% and 9% up-elements below header */}
      <ImgDecor src="/home/Asset 6.svg"  width={80} style={{ position:"absolute", right:"1%",  top:"20%", opacity:0.85, animation:"mathBubble 5s   ease-in-out infinite 0.4s" }} />
      <ImgDecor src="/home/Asset 10.svg" width={80} style={{ position:"absolute", right:"1%",  top:"52%", opacity:0.80, animation:"mathWiggle 5.5s ease-in-out infinite 1s" }} />
      <ImgDecor src="/home/Asset 11.svg" width={58} style={{ position:"absolute", right:"7%",  top:"76%", opacity:0.72, animation:"mathBob    4.5s ease-in-out infinite 0.5s" }} />

      {/* 1280px centered content frame — all Figma coordinates are relative to this */}
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

        <div
          className={serif.className}
          style={{
            ...box(76, 190, 700, 56),
            fontSize: 56,
            lineHeight: "56px",
            color: COLOR.ink,
            whiteSpace: "nowrap",
          }}
        >
          Intelligent Assistant System
        </div>

        {/* Title line 2 — animated ticker (client component) */}
        <div style={{ ...box(186, 264, 1124, 56), display: "flex", alignItems: "center" }}>
          <TitleTicker serifClass={serif.className} inkColor={COLOR.ink} />
        </div>

        <div
          style={{
            ...box(617, 356, 337, 68),
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
          href="/"
          style={{
            ...box(617, 430, 100, 26),
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
          Start
        </Link>

        <a
          href="#features"
          style={{
            ...box(722, 430, 100, 26),
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

        <HeroVideo style={box(200, 340, 300, 220)} />
      </div>
    </div>
  );
}
