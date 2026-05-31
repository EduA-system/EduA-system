import { LoopVideo } from "./_loop-video";
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
          style={{ width: "calc(100% + 50px)", maxWidth: "none", height: 300, marginLeft: -9, marginBottom: 24, marginTop: -50 }}
        />
      ) : (
        <div style={{ width: 442, height: 220, backgroundColor: "#D9D9D9", borderRadius: 5 }} />
      )}
      <h3
        className={serif.className}
        style={{
          margin: 0,
          marginTop: -40,
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
        Create instructional materials without starting from scratch.
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
        Generate classroom-ready materials with guided workflows instead of
        writing long prompts.
      </p>
    </div>
  );
}
