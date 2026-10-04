import Link from "next/link";
import { GraduationCap } from "lucide-react";
import MobileNavigation from "./mobile-navigation";
import ThemeToggle from "../theme-toggle";
import type { DashboardNavigationGroup } from "./sidebar";
import styles from "./dashboard-shell.module.css";

export default function DashboardHeader({
  navigation,
}: Readonly<{
  navigation: readonly DashboardNavigationGroup[];
}>) {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="CampusFlow home">
        <span className={styles.brandMark}>
          <GraduationCap size={19} aria-hidden="true" />
        </span>
        <span className={styles.brandText}>
          <strong>CampusFlow</strong>
          <small>UNIVERSITY WORKSPACE</small>
        </span>
      </Link>
      <div className={styles.headerActions}>
        <ThemeToggle className={`${styles.iconButton} ${styles.themeButton}`} />
        <MobileNavigation groups={navigation} />
      </div>
    </header>
  );
}
