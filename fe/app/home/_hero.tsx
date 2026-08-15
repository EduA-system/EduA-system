import { ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { HeroGlow } from "./HeroGlow";
import { HeroVideo } from "./_hero-video";
import { ImgDecor } from "./_shared";
import { TitleTicker } from "./TitleTicker";
import styles from "./landing.module.css";

export function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <HeroGlow bounds={[]} contentFrameWidth={1280} />
      <div className={`${styles.decor} ${styles.decorOne} home-decoration`}><ImgDecor src="/home/Asset 19.svg" width={72} /></div>
      <div className={`${styles.decor} ${styles.decorTwo} home-decoration`}><ImgDecor src="/home/Asset 10.svg" width={62} /></div>
      <div className={`${styles.decor} ${styles.decorThree} home-decoration`}><ImgDecor src="/home/Asset 11.svg" width={54} /></div>
      <div className={`${styles.decor} ${styles.decorFour} home-decoration`}><ImgDecor src="/home/Asset 7.svg" width={38} /></div>
      <div className={`${styles.decor} ${styles.decorFive} home-decoration`}><ImgDecor src="/home/Asset 3.svg" width={38} /></div>
      <div className={`${styles.decor} ${styles.decorSix} home-decoration`}><ImgDecor src="/home/Asset 6.svg" width={72} /></div>
      <div className={styles.heroInner}>
        <span className={styles.heroEyebrow} data-hero-entrance>Một không gian dạy học liền mạch</span>
        <h1 id="hero-title" className={styles.heroTitle} data-hero-entrance>Hệ thống trợ lý thông minh</h1>
        <div className={styles.heroTicker}>
          <TitleTicker />
        </div>
        <div className={styles.heroGrid}>
          <div className={styles.heroMedia} data-hero-entrance data-glow-exclusion>
            <HeroVideo style={{ position: "relative" }} className={styles.heroVideo} />
          </div>
          <div className={styles.heroCopy} data-hero-entrance>
            <p>
              Từ một bài học trong sách, EDUA giúp giáo viên tạo giáo án theo Công văn 5512,
              dựng slide, đưa mô phỏng vào lớp và quản lý hoạt động học tập — trong cùng một luồng.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.darkButton} href="/lesson-create" data-glow-exclusion>
                Tạo giáo án <ArrowDownRight size={16} aria-hidden="true" />
              </Link>
              <a className={styles.outlineButton} href="#system-flow" data-glow-exclusion>Xem hệ thống hoạt động</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
