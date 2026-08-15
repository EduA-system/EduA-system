import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import styles from "./landing.module.css";

export function HeaderBar() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="EDUA — Trang chủ">
          EDUA
        </Link>
        <nav className={styles.nav} aria-label="Điều hướng chính">
          <a href="#system-flow">Quy trình</a>
          <a href="#product-proof">Sản phẩm</a>
          <Link href="/community-hub">Cộng đồng</Link>
          <Link href="/periodic-table">Bảng tuần hoàn</Link>
        </nav>
        <div className={styles.headerActions}>
          <a className={styles.outlineButton} href="#system-flow">Khám phá</a>
          <Link className={styles.darkButton} href="/login">
            Đăng nhập <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
