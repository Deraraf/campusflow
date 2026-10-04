import type { ReactNode } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import MobileNavigation from "./mobile-navigation";
import ThemeToggle from "../theme-toggle";
import type { DashboardNavigationGroup } from "./sidebar";
import styles from "./dashboard-shell.module.css";

export default function DashboardHeader({
  navigation,
  userName,
  mobileFooter,
}: Readonly<{
  navigation: readonly DashboardNavigationGroup[];
  userName?: string;
  mobileFooter?: ReactNode;
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
        {userName ? <span className={styles.userName}>{userName}</span> : null}
        <ThemeToggle className={`${styles.iconButton} ${styles.themeButton}`} />
        <MobileNavigation groups={navigation}>{mobileFooter}</MobileNavigation>
      </div>
    </header>
  );
}
