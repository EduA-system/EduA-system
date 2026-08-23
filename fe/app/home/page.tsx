import type { Metadata } from "next";
import { HeaderBar } from "./HeaderBar";
import { HeroSection } from "./_hero";
import { LandingExperience } from "./LandingExperience";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "EDUA — Từ giáo án 5512 đến lớp học trong một luồng",
  description:
    "Khám phá cách EDUA giúp giáo viên tạo giáo án, slide, mô phỏng khoa học, bài tập về nhà và quản lý hoạt động lớp học trong cùng một hệ thống.",
};

export default function HomePage() {
  return (
    <main className={styles.page}>
      <HeaderBar />
      <HeroSection />
      <LandingExperience />
    </main>
  );
}
