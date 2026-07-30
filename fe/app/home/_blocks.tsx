import { LoopVideo } from "./_loop-video";
import Link from "next/link";
import { COLOR, serif } from "./_shared";

export function FeatureBlock({
  title,
  body,
  innerPaddingSide,
  videoSrc,
}: {
  title: string;
  body: string;
  innerPaddingSide: "left" | "right";
  videoSrc?: string;
}) {
  return (
    <article
      style={{
        paddingLeft: innerPaddingSide === "left" ? 24 : 0,
        paddingRight: innerPaddingSide === "right" ? 24 : 0,
      }}
    >
      {videoSrc ? (
        <LoopVideo
          src={videoSrc}
          style={{ width: "calc(100% + 50px)", maxWidth: "none", height: 260, marginLeft: -9, marginBottom: 0, marginTop: 0 }}
        />
      ) : (
        <div style={{ width: 442, height: 220, backgroundColor: "#D9D9D9", borderRadius: 5 }} />
      )}
      <h3
        className={serif.className}
        style={{
          margin: 0,
          marginTop: 16,
          fontSize: 20,
          lineHeight: "24px",
          fontWeight: 700,
          color: COLOR.ink,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          marginTop: 8,
          fontSize: 14,
          lineHeight: "20px",
          color: COLOR.inkMuted,
          maxWidth: 442,
        }}
      >
        {body}
      </p>
    </article>
  );
}

export function StickyCard({ side }: { side: "left" | "right" }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 40,
        paddingLeft: side === "right" ? 24 : 0,
        paddingRight: side === "left" ? 24 : 0,
      }}
    >
      <h3
        className={serif.className}
        style={{
          margin: 0,
          fontSize: 20,
          lineHeight: "24px",
          fontWeight: 700,
          color: COLOR.inkBlack,
        }}
      >
        Tạo học liệu sẵn sàng sử dụng trong vài phút.
      </h3>
      <p
        style={{
          margin: 0,
          marginTop: 16,
          fontSize: 14,
          lineHeight: "20px",
          color: COLOR.inkMuted,
        }}
      >
        EDUA hướng dẫn từng bước để bạn tạo giáo án, slide và mô phỏng mà
        không cần viết các câu lệnh dài.
      </p>
      <Link
        href="/lesson-create"
        style={{ display: "inline-flex", marginTop: 20, color: COLOR.ink, fontSize: 14, fontWeight: 700 }}
      >
        Bắt đầu tạo giáo án →
      </Link>
    </div>
  );
}
