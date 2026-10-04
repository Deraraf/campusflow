import { ArrowUpRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import styles from "./site-footer.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/">
          <span className={styles.mark}>
            <GraduationCap size={17} />
          </span>
          <span>CampusFlow</span>
        </Link>
        <p>One clear place for the whole campus.</p>
        <nav aria-label="Footer navigation">
          <Link href="/student#courses">Courses</Link>
          <Link href="/student#campus-services">Campus services</Link>
          <Link href="/login">
            Student access <ArrowUpRight size={13} />
          </Link>
        </nav>
        <small>© 2026 CampusFlow. Academic workspace.</small>
      </div>
    </footer>
  );
}