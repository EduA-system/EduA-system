import { FeatureBlock, StickyCard } from "./_blocks";
import { FadeIn } from "./FadeIn";
import { HeaderBar } from "./HeaderBar";
import { HeroSection } from "./_hero";
import { COLOR, FEATURES, FRAME_WIDTH, HRule, ImgDecor, VRule, rubik, serif } from "./_shared";

export default function HomePage() {
  const topFeatures = FEATURES.slice(0, 3);
  const bottomFeatures = FEATURES.slice(3, 6);

  return (
    <div
      className={`${rubik.className} w-full`}
      style={{ backgroundColor: COLOR.pageBg, color: COLOR.ink }}
    >
      <HeaderBar />
      <HeroSection />

      {/* ════ "For Teacher" headline — 3 chem L/R/L ════ */}
      <div style={{ position: "relative" }}>
        <ImgDecor src="/home/chem/Asset 1.svg" width={60} style={{ position:"absolute", left:"2%",  top:"20%", opacity:0.72, animation:"mathBob    4.2s ease-in-out infinite" }} />
        <ImgDecor src="/home/chem/Asset 7.svg" width={58} style={{ position:"absolute", right:"2%", top:"50%", opacity:0.68, animation:"mathFloat  4.8s ease-in-out infinite 0.6s" }} />
        <ImgDecor src="/home/chem/Asset 5.svg" width={62} style={{ position:"absolute", left:"3%",  top:"80%", opacity:0.65, animation:"mathBubble 5s   ease-in-out infinite 1.2s" }} />
        <section
          className="mx-auto"
          style={{ width: FRAME_WIDTH, paddingTop: 32, paddingBottom: 48, textAlign: "center" }}
        >
          <FadeIn>
            <div style={{ fontSize: 14, lineHeight: "17px", color: COLOR.ink }}>For Teacher</div>
            <h2
              className={serif.className}
              style={{ marginTop: 8, fontSize: 36, lineHeight: "50px", color: COLOR.ink, fontWeight: 400 }}
            >
              An AI Toolkit for the Work Teachers Do Every Day.
            </h2>
          </FadeIn>
        </section>
      </div>

      {/* ════ SECTION 1: sticky card LEFT, 3 features RIGHT — 3 chem L/R/L ════ */}
      <div style={{ position: "relative" }}>
        <ImgDecor src="/home/chem/Asset 10.svg" width={58} style={{ position:"absolute", left:"1.5%", top:"20%", opacity:0.72, animation:"mathWiggle 5s   ease-in-out infinite" }} />
        <ImgDecor src="/home/chem/Asset 16.svg" width={75} style={{ position:"absolute", right:"1%",  top:"50%", opacity:0.70, animation:"mathBubble 5.5s ease-in-out infinite 0.8s" }} />
        <ImgDecor src="/home/chem/Asset 2.svg"  width={52} style={{ position:"absolute", left:"2%",   top:"80%", opacity:0.68, animation:"mathWiggle 4.8s ease-in-out infinite 1.5s" }} />
        <section
          id="features"
          className="mx-auto"
          style={{ position: "relative", width: FRAME_WIDTH, paddingLeft: 271, paddingRight: 268 }}
        >
          <VRule left={490} />
          <ImgDecor src="/home/Asset 5.svg"  width={66} style={{ position:"absolute", left:20,  top:90,  opacity:0.78 }} />
          <ImgDecor src="/home/Asset 2.svg"  width={44} style={{ position:"absolute", left:95,  top:370, opacity:0.70 }} />
          <ImgDecor src="/home/Asset 20.svg" width={85} style={{ position:"absolute", right:15, top:195, opacity:0.78 }} />
          <div style={{ display: "grid", gridTemplateColumns: "219px 430px", columnGap: 10 }}>
            <aside><StickyCard side="left" /></aside>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {topFeatures.map((f, i) => (
                <div key={i}>
                  <FadeIn delay={i * 100}>
                    <FeatureBlock
                      title={f.title}
                      body={f.body}
                     
                      innerPaddingSide="left"
                      videoSrc={i === 0 ? "/home/comp1_7.webm" : i === 1 ? "/home/comp1_9.webm" : undefined}
                    />
                  </FadeIn>
                  {i < topFeatures.length - 1 && <HRule offset={-10} />}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ════ MID BAND — 3 chem R/L/R ════ */}
      <div style={{ position: "relative" }}>
        <ImgDecor src="/home/chem/Asset 3.svg"  width={75} style={{ position:"absolute", right:"2%",  top:"20%", opacity:0.68, animation:"mathFloat  6s   ease-in-out infinite" }} />
        <ImgDecor src="/home/chem/Asset 15.svg" width={70} style={{ position:"absolute", left:"2%",   top:"50%", opacity:0.70, animation:"mathDrift  5s   ease-in-out infinite 0.7s" }} />
        <ImgDecor src="/home/chem/Asset 6.svg"  width={62} style={{ position:"absolute", right:"3%",  top:"80%", opacity:0.65, animation:"mathFloat  4.5s ease-in-out infinite 1.4s" }} />
        <div className="mx-auto" style={{ width: FRAME_WIDTH, paddingTop: 80, paddingBottom: 80 }}>
          <FadeIn>
            <div style={{ marginLeft: 246, width: 821, height: 143, backgroundColor: "#D9D9D9" }} />
          </FadeIn>
        </div>
      </div>

      {/* ════ SECTION 2: 3 features LEFT, sticky card RIGHT — 3 chem R/L/R ════ */}
      <div style={{ position: "relative" }}>
        <ImgDecor src="/home/chem/Asset 11.svg" width={58} style={{ position:"absolute", right:"1.5%", top:"20%", opacity:0.72, animation:"mathWiggle 5.2s ease-in-out infinite" }} />
        <ImgDecor src="/home/chem/Asset 14.svg" width={70} style={{ position:"absolute", left:"1%",   top:"50%", opacity:0.70, animation:"mathBubble 5.8s ease-in-out infinite 0.9s" }} />
        <ImgDecor src="/home/chem/Asset 18.svg" width={52} style={{ position:"absolute", right:"2%",  top:"80%", opacity:0.68, animation:"mathWiggle 4.5s ease-in-out infinite 1.5s" }} />
        <section
          className="mx-auto"
          style={{ position: "relative", width: FRAME_WIDTH, paddingLeft: 268, paddingRight: 271 }}
        >
          <VRule left={750} />
          <ImgDecor src="/home/Asset 15.svg" width={60} style={{ position:"absolute", left:18, top:110, opacity:0.76 }} />
          <ImgDecor src="/home/Asset 4.svg"  width={80} style={{ position:"absolute", left:88, top:455, opacity:0.70 }} />
          <ImgDecor src="/home/Asset 21.svg" width={80} style={{ position:"absolute", right:12,top:215, opacity:0.76 }} />
          <div style={{ display: "grid", gridTemplateColumns: "442px 250px", columnGap: 60 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {bottomFeatures.map((f, i) => (
                <div key={i}>
                  <FadeIn delay={i * 100}>
                    <FeatureBlock title={f.title} body={f.body} innerPaddingSide="right" />
                  </FadeIn>
                  {i < bottomFeatures.length - 1 && <HRule offset={0} />}
                </div>
              ))}
            </div>
            <aside><StickyCard side="right" /></aside>
          </div>
        </section>
      </div>

      {/* Full-viewport closing divider — Figma Vector 15 */}
      <div style={{ marginTop: 80, width: "100%", height: 1, backgroundColor: COLOR.divider }} />

      {/* ════ TESTIMONIALS — 3 chem R/L/R ════ */}
      <div style={{ position: "relative" }}>
        <ImgDecor src="/home/chem/Asset 4.svg"  width={68} style={{ position:"absolute", right:"2%",   top:"20%", opacity:0.68, animation:"mathFloat  5.5s ease-in-out infinite" }} />
        <ImgDecor src="/home/chem/Asset 9.svg"  width={62} style={{ position:"absolute", left:"1.5%",  top:"50%", opacity:0.70, animation:"mathBubble 5.2s ease-in-out infinite 0.8s" }} />
        <ImgDecor src="/home/chem/Asset 17.svg" width={55} style={{ position:"absolute", right:"2.5%", top:"80%", opacity:0.65, animation:"mathWiggle 4.8s ease-in-out infinite 1.3s" }} />

        <section className="mx-auto" style={{ width: FRAME_WIDTH, paddingTop: 50, paddingBottom: 80 }}>

          {/* Top band: gray placeholder + headline card */}
          <FadeIn>
            <div style={{ marginLeft: 245, display: "flex" }}>
              <div style={{ width: 449, height: 154, backgroundColor: "#D9D9D9", flexShrink: 0 }} />
              <div
                style={{
                  width: 373, height: 154, flexShrink: 0,
                  border: "1px solid #8E8E8E",
                  borderRadius: 13,
                  padding: "14px 20px 14px 26px",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                  backgroundColor: COLOR.pageBg,
                }}
              >
                <div
                  className={serif.className}
                  style={{ fontSize: 20, lineHeight: "26px", fontWeight: 700, color: COLOR.inkBlack }}
                >
                  Create instructional materials without starting from scratch.
                </div>
                <p style={{ margin: 0, marginTop: 8, fontSize: 14, lineHeight: "20px", color: COLOR.inkMuted }}>
                  Generate classroom-ready materials with guided workflows instead of writing long prompts.
                </p>
              </div>
            </div>
          </FadeIn>

          <div style={{ height: 56 }} />

          {/* 3 testimonials — each fades in with stagger */}
          <div style={{ marginLeft: 246, width: 821, display: "grid", gridTemplateColumns: "274px 273px 274px" }}>
            {[
              {
                quote: "EDUA giúp tôi rút ngắn thời gian soạn bài từ 3 giờ xuống còn 20 phút mà chất lượng còn tốt hơn.",
                author: "Cô Nguyễn Thị A, GV Hoá học",
              },
              {
                quote: "Slide được sinh tự động từ giáo án trông chuyên nghiệp hơn hẳn những gì tôi tự làm trước đây.",
                author: "Thầy Trần Văn B, GV Sinh học",
              },
              {
                quote: "Phòng thí nghiệm ảo giúp học sinh thực hành ngay trên lớp mà không cần lo thiếu dụng cụ.",
                author: "Thầy Lê Minh C, GV Vật lý",
              },
            ].map((t, i) => (
              <FadeIn key={i} delay={i * 110}>
                <div style={{ borderLeft: `0.5px solid ${COLOR.divider}`, paddingLeft: 21, paddingRight: 16 }}>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: "20px", color: COLOR.inkMuted }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p style={{ margin: 0, marginTop: 28, fontSize: 14, lineHeight: "17px", color: COLOR.inkMuted, fontStyle: "italic", fontWeight: 300 }}>
                    {t.author}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

        </section>
      </div>

      {/* ════ PAGINATION ════ */}
      <FadeIn>
        <div
          className="mx-auto"
          style={{
            width: FRAME_WIDTH,
            paddingTop: 60, paddingBottom: 60,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <button
            style={{
              width: 40, height: 40,
              border: `1px solid ${COLOR.inkMuted}`,
              borderRadius: 13,
              backgroundColor: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, padding: 0,
            }}
            aria-label="Trang trước"
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 6 L8 12 L15 18" stroke={COLOR.inkMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div style={{ display: "flex", gap: 8, marginLeft: 15, marginRight: 13 }}>
            {Array.from({ length: 18 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 5, height: 5,
                  borderRadius: "50%",
                  backgroundColor: i === 0 ? COLOR.inkMuted : "#C5C5C5",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          <button
            style={{
              width: 40, height: 40,
              border: `1px solid ${COLOR.inkMuted}`,
              borderRadius: 13,
              backgroundColor: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, padding: 0,
            }}
            aria-label="Trang sau"
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 6 L16 12 L9 18" stroke={COLOR.inkMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </FadeIn>

      {/* ════ Bottom chem spacer — L/R/L ════ */}
      <div style={{ position: "relative", height: 120 }}>
        <ImgDecor src="/home/chem/Asset 13.svg" width={58} style={{ position:"absolute", left:"3%",  top:10, opacity:0.65, animation:"mathBob    4.5s ease-in-out infinite" }} />
        <ImgDecor src="/home/chem/Asset 12.svg" width={75} style={{ position:"absolute", right:"3%", top:42, opacity:0.63, animation:"mathDrift  5s   ease-in-out infinite 0.5s" }} />
        <ImgDecor src="/home/chem/Asset 8.svg"  width={62} style={{ position:"absolute", left:"5%",  top:70, opacity:0.60, animation:"mathWiggle 5.5s ease-in-out infinite 1s" }} />
      </div>
    </div>
  );
}
